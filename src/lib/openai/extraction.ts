import "server-only";

import { MODEL, openai } from "@/lib/openai/client";
import {
  customerExtractionJsonSchema,
  customerExtractionSchema,
  type CustomerExtraction,
} from "@/lib/openai/schemas/customer-extraction";

/**
 * Extract structured customer data from a reconciled Czech meeting transcript
 * using GPT-4o + OpenAI Structured Outputs (json_schema, strict: true).
 *
 * Failure model:
 *   - OpenAI errors → throw (caller wraps).
 *   - Empty response → throw.
 *   - JSON.parse failure → throw with original text in message (rare under strict).
 *   - Zod validation failure → throw with formatted Zod error (caller logs to
 *     analytics_events for prompt iteration).
 */

const PROMPT_VERSION = "extraction-v1";

const SYSTEM_PROMPT = `Jsi asistent finančního poradce v České republice. Z přepisu akviziční schůzky mezi poradcem a zákazníkem (koncovým spotřebitelem finančních produktů) extrahuj přesně strukturovaná data o zákazníkovi.

Tvrdá pravidla:

1. NIKDY nehádej a nedovozuj. Pokud informace v přepisu výslovně nezazněla, vrať pro dané pole null. Příklady:
   - "máme dvě děti" → has_children=true, children_count=2; ALE marital_status=null, dokud rodinný stav výslovně nezazní (manželský svazek vs. partnerský vztah vs. svobodný rodič nelze odhadnout).
   - "padesátka" o věku → null (není přesný rok).
   - "vydělávám slušně" → null (není konkrétní číslo).

2. Česká čísla normalizuj na celočíselné Kč po zdanění (čistý příjem):
   - "padesát tisíc" → 50000
   - "čtyřicet pět tisíc čistého" → 45000
   - "sto deset tisíc dohromady" v kontextu domácnosti → použij to jen pokud zákazník říká, že to je jeho měsíční příjem, jinak null.
   - "půl milionu" → 500000, "milion a půl" → 1500000.
   - Měsíční výdaje a splátka hypotéky: stejně, celé Kč, jen pokud zaznělo konkrétní číslo.

3. has_mortgage:
   - true jen pokud zaznělo "máme hypotéku", "splácím hypotéku", "byt na hypotéku" apod.
   - false jen pokud zaznělo "nemáme hypotéku", "byt máme zaplacený", "bydlíme v podnájmu" apod.
   - Jinak null.

4. risk_appetite — odhadni jen z explicitních signálů:
   - low: "chci jistotu", "konzervativně", "bojím se ztrát", "dluhopisy".
   - medium: "vyvážený mix", "umím přijmout výkyvy", "spíš střed".
   - high: "akcie", "ETF", "agresivní investor", "krátkodobé výpadky mě netrápí".
   - Pokud zákazník nedá najevo, vrať null.

5. primary_goal: parafráze poradce vlastními slovy, ne doslovný citát. Krátká věta, např. "Spoření na byt v Praze, horizont 5 let". null pokud žádný cíl nezazněl.

6. notes: 1–2 stručné české věty pro poradce shrnující kontext, který se nevejde do struktury — život, ad-hoc požadavky, nálada zákazníka, otevřené otázky. Pokud opravdu není co dodat, vrať prázdný řetězec "" (nikdy ne null).

7. occupation: krátká fráze (povolání nebo obor), např. "IT specialista", "učitelka ZŠ", "OSVČ grafička". Ne celá věta.

Výstup pošli výhradně podle dodaného JSON schématu (Structured Outputs).`;

// Few-shot examples — drive Czech-specific behaviour (number normalization,
// "no marital status from kids alone", null discipline).
const FEWSHOT_USER_1 = `Přepis:
"Jsem Petr, je mi sedmadvacet, dělám juniora ve vývojářské firmě. Beru čtyřicet tisíc čistého. Bydlím v podnájmu, žádná hypotéka. Žádný partner, žádné děti. Chci si do pěti let pořídit byt, máme na účtu sto padesát tisíc, jinak nic. Bavily by mě ETF, ale jsem v tom nový."`;

const FEWSHOT_ASSISTANT_1 = JSON.stringify({
  customer: {
    full_name: "Petr",
    age: 27,
    marital_status: "single",
    has_children: false,
    children_count: 0,
    occupation: "junior vývojář",
  },
  finances: {
    monthly_income_czk: 40000,
    monthly_expenses_czk: null,
    existing_savings_czk: 150000,
    has_mortgage: false,
    monthly_mortgage_czk: null,
  },
  goals: {
    primary_goal: "Pořízení vlastního bytu, horizont 5 let",
    target_horizon_years: 5,
    risk_appetite: "high",
  },
  notes:
    "Klient je v investicích nový, projevuje zájem o ETF. Aktuálně bez pojištění a bez pravidelného spoření.",
});

const FEWSHOT_USER_2 = `Přepis:
"Tomáš Procházka, jsem ženatý, máme dvě malé děti — čtyři a šest let. S manželkou splácíme hypotéku, dvacet tři tisíc měsíčně, zbývá nám čtyři miliony. Já dělám projektového manažera, beru sedmdesát dva tisíc čistého, manželka je teď doma s dětmi. Hlavně mě trápí, kdyby se mi něco stalo, jak by to rodina utáhla. Zatím nemáme žádné životko."`;

const FEWSHOT_ASSISTANT_2 = JSON.stringify({
  customer: {
    full_name: "Tomáš Procházka",
    age: null,
    marital_status: "married",
    has_children: true,
    children_count: 2,
    occupation: "projektový manažer",
  },
  finances: {
    monthly_income_czk: 72000,
    monthly_expenses_czk: null,
    existing_savings_czk: null,
    has_mortgage: true,
    monthly_mortgage_czk: 23000,
  },
  goals: {
    primary_goal:
      "Zajištění rodiny pro případ výpadku příjmu živitele, ochrana hypotéky",
    target_horizon_years: null,
    risk_appetite: null,
  },
  notes:
    "Manželka je aktuálně doma s mladší dcerou bez vlastního příjmu. Prioritou je životní pojištění živitele.",
});

export type ExtractionResult = {
  data: CustomerExtraction;
  model: string;
  tokens: number | null;
  latency_ms: number;
  promptVersion: string;
};

export type ExtractFromTranscriptInput = {
  transcriptText: string;
  /**
   * Optional reference date for "ze schůzky 2026-05-09" framing in the user
   * prompt. Helps anchor relative dates the customer says (e.g. "minulý
   * úterý"). Currently we don't extract dates, but plumbed in for v2.
   */
  contextDate?: Date;
};

function formatContextDate(d: Date | undefined): string {
  if (!d) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export async function extractFromTranscript(
  input: ExtractFromTranscriptInput,
): Promise<ExtractionResult> {
  const transcriptText = (input.transcriptText ?? "").trim();
  if (transcriptText.length === 0) {
    throw new Error(
      "Extrakce: prázdný přepis. Volej extractFromTranscript jen s neprázdným textem.",
    );
  }

  const dateLine = input.contextDate
    ? `Datum schůzky: ${formatContextDate(input.contextDate)}\n\n`
    : "";

  const userMessage = `${dateLine}Přepis schůzky:\n${transcriptText}`;

  const startedAt = performance.now();
  const resp = await openai().chat.completions.create({
    model: MODEL.extraction,
    temperature: 0.1,
    max_completion_tokens: 2048,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "CustomerExtraction",
        strict: true,
        schema: customerExtractionJsonSchema,
      },
    },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: FEWSHOT_USER_1 },
      { role: "assistant", content: FEWSHOT_ASSISTANT_1 },
      { role: "user", content: FEWSHOT_USER_2 },
      { role: "assistant", content: FEWSHOT_ASSISTANT_2 },
      { role: "user", content: userMessage },
    ],
  });
  const latency_ms = Math.round(performance.now() - startedAt);

  const raw = resp.choices[0]?.message?.content;
  if (!raw) {
    throw new Error("Extrakce: GPT-4o vrátil prázdnou odpověď.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch (err) {
    throw new Error(
      `Extrakce: nelze parsovat JSON odpověď. Surová odpověď: ${raw.slice(0, 500)}`,
      { cause: err },
    );
  }

  const validation = customerExtractionSchema.safeParse(parsed);
  if (!validation.success) {
    const issues = validation.error.issues
      .map((i) => `${i.path.join(".") || "<root>"}: ${i.message}`)
      .join("; ");
    throw new Error(`Extrakce: validace odpovědi selhala. Issues: ${issues}`);
  }

  const usage = resp.usage;
  const tokens =
    usage && typeof usage.total_tokens === "number" ? usage.total_tokens : null;

  return {
    data: validation.data,
    model: MODEL.extraction,
    tokens,
    latency_ms,
    promptVersion: PROMPT_VERSION,
  };
}
