import "server-only";

import { z } from "zod";
import { MODEL, openai } from "@/lib/openai/client";

/**
 * Server-side extrakce z bank statements + OP přes GPT-4o.
 *
 * Privacy-first:
 *   - Nikdy nevrací jednotlivé transakce, jména protistran, čísla účtů ani data.
 *   - Vrací bohatý kategorizovaný breakdown (necessary/discretionary
 *     per EFA metodice) potřebný pro výpočet zajištění klienta.
 *   - Volá se ze server action s service-role; klíč nikdy v prohlížeči.
 */

// ============================================================================
// Schemas
// ============================================================================

const incomeBreakdownSchema = z.object({
  salary: z.number().int(),
  self_employed: z.number().int(),
  rental: z.number().int(),
  passive: z.number().int(),
  other: z.number().int(),
});

const expenseBreakdownSchema = z.object({
  housing: z.number().int(),
  food: z.number().int(),
  transport: z.number().int(),
  insurance: z.number().int(),
  healthcare: z.number().int(),
  savings: z.number().int(),
  dining: z.number().int(),
  subscriptions: z.number().int(),
  discretionary: z.number().int(),
  other: z.number().int(),
});

export const bankStatementRichSchema = z.object({
  period_months: z.number().nullable(),
  bank_name: z.string().nullable(),
  transaction_count: z.number().int().nullable(),
  income: incomeBreakdownSchema,
  expenses: expenseBreakdownSchema,
  necessary_total: z.number().int(),
  discretionary_total: z.number().int(),
  income_total: z.number().int(),
  expense_total: z.number().int(),
  detected_salary_amount: z.number().int().nullable(),
  detected_employment_type: z.enum(["employee", "selfemployed", "unknown"]),
});

export const idCardSchema = z.object({
  full_name: z
    .string()
    .nullable()
    .describe("Plné jméno ve formátu Jméno Příjmení s diakritikou."),
  birth_date: z
    .string()
    .nullable()
    .describe("Datum narození ve formátu YYYY-MM-DD."),
  address: z
    .string()
    .nullable()
    .describe("Trvalá adresa včetně města a PSČ."),
});

export type IncomeBreakdown = z.infer<typeof incomeBreakdownSchema>;
export type ExpenseBreakdown = z.infer<typeof expenseBreakdownSchema>;
export type BankStatementRichExtract = z.infer<typeof bankStatementRichSchema>;
export type IdCardExtract = z.infer<typeof idCardSchema>;

// ============================================================================
// BANK_STATEMENT_PROMPT_V2 — rich categorization per EFA methodology
// ============================================================================

const BANK_STATEMENT_PROMPT_V2 = `Jsi extraktor a kategorizátor finančních dat z českých bankovních výpisů.
Tvůj výstup jde DIRECTLY do EFA výpočtu zajištění klienta (metodika 4FIN), takže
přesnost a stálost klasifikace jsou kritické.

═══════════════════════════════════════════════════════════════════════════════
 SOUHRNNÉ HODNOTY — vrať VŽDY tyto klíče
═══════════════════════════════════════════════════════════════════════════════

1. **period_months** (number) — délka období v měsících.
   - 1.1.–31.1. = 1; 15.5.–14.7. = 2; 1.1.–30.6. = 6; 1.1.–31.12. = 12.
   - Pokud nelze určit → null (nikdy nehádej).

2. **bank_name** (string) — banka, např. "Air Bank", "Česká spořitelna",
   "Komerční banka", "ČSOB", "Fio banka", "Raiffeisenbank", "mBank", "Moneta",
   "UniCredit Bank", "Equa Bank". Použij přesný název s diakritikou.

3. **transaction_count** (integer) — počet jednotlivých pohybů.

═══════════════════════════════════════════════════════════════════════════════
 PŘÍJMY (income) — strukturovaný breakdown v Kč za období výpisu
═══════════════════════════════════════════════════════════════════════════════

Klasifikuj KAŽDOU příchozí platbu do jedné z těchto kategorií. Hodnota = SUMA
v dané kategorii za období výpisu (celé Kč, žádné haléře).

- **income.salary** — Mzda od zaměstnavatele.
  Detekce: popisy obsahující "MZDA", "VYPLATA", "VÝPLATA", "PLAT ", "MESICNI MZDA",
  "WAGE", "SALARY", "PAYROLL", "PAY ROLL", částka typicky 25 000–500 000 Kč,
  pravidelná (jednou měsíčně), protistrana typu IČO/s.r.o./a.s.

- **income.self_employed** — Příjmy z OSVČ podnikání (fakturace).
  Detekce: popisy obsahující "FAKTURA", "INVOICE", "FA ", "VS:" + firma jako
  protistrana, nepravidelná částka, opakované přijmy od různých firem.
  POZOR: pokud má klient hlavní mzdu, sekundární faktury patří sem.

- **income.rental** — Pravidelný nájem z nemovitosti.
  Detekce: popisy "NAJEM", "NÁJEM", "RENT", "PRONAJEM", typicky 8–80 tisíc,
  opakující se měsíčně od stejné fyzické osoby.

- **income.passive** — Pasivní investiční příjmy.
  Detekce: "DIVIDEND", "UROK", "ÚROK", "INTEREST", "VYNOS", "VÝNOS", "PORTU",
  "DEGIRO", "ETORO", "REVOLUT INV", úroky ze spořicích produktů, dividendy.

- **income.other** — Vše ostatní (vratky, dárky, refundace, jednorázové).
  POZOR: STORNO/REFUND patří sem POUZE pokud nejde negovat původní výdaj.

═══════════════════════════════════════════════════════════════════════════════
 VÝDAJE (expenses) — strukturovaný breakdown v Kč za období
═══════════════════════════════════════════════════════════════════════════════

KAŽDÝ výdaj klasifikuj do PRÁVĚ JEDNÉ kategorie. Hodnota = suma per kategorie.

NUTNÉ (necessary) — fixní závazky, bez kterých rodina neobstojí:

- **expenses.housing** — Bydlení: nájem, hypotéka, anuita, fond oprav,
  SVJ příspěvek, energie (elektřina, plyn, voda, teplo), internet, mobilní
  tarif (postpaid pro hlavního živitele).
  Detekce: "NAJEM", "HYPOTEKA", "HYPOTÉKA", "ANUITA", "SVJ", "FOND OPRAV",
  "PRE ", "ELEKTRINA", "PLYN", "VODÁRNY", "VODA", "INNOGY", "CEZ", "E.ON",
  "PRAZSKA PLYNARENSKA", "TEPLO", "UPC", "O2", "T-MOBILE", "VODAFONE", "INTERNET".

- **expenses.food** — Potraviny pro domácnost (supermarkety, drogerie základ).
  Detekce: "ALBERT", "BILLA", "TESCO", "LIDL", "KAUFLAND", "PENNY", "GLOBUS",
  "MAKRO", "ROSSMANN", "DM DROGERIE", "BIO MARKET", "FARMÁŘSKÉ".

- **expenses.transport** — Doprava potřebná do práce: PHM, MHD, leasing auta,
  servis auta, dálniční známka.
  Detekce: "BENZINA", "SHELL", "MOL", "ORLEN", "OMV", "EUROOIL", "DPP", "PID",
  "LEASING", "AUTOSERVIS", "DALNICNI", "PNEU".

- **expenses.insurance** — Pojistné platby (život, neživot, auto, byt).
  Detekce: "POJISTENI", "POJIŠTĚNÍ", "POJISTNE", "KOOPERATIVA", "ALLIANZ",
  "AXA", "GENERALI", "UNIQA", "CSOB POJ", "ČP ", "MAXIMA POJ", "DIRECT POJ".

- **expenses.healthcare** — Zdravotní výdaje (lékárny, doplatky, dentista).
  Detekce: "DR. MAX", "BENU", "LÉKÁRNA", "LEKARNA", "ZUBAR", "DENTAL",
  "STOMAT", "LASIK", "PRAKTICKY".

- **expenses.savings** — Pravidelné spoření a investice (povinnost ze smlouvy):
  doplňkové penzijní spoření, životní pojištění s investiční složkou, pravidelné
  investování ETF, stavební spoření.
  Detekce: "PENZIJNI", "PENZIJNÍ", "DPS ", "ETF", "PORTU", "INDEX FUND",
  "STAVEBNI SPORENI", "FONDY", "INVESTICE", "FOND".

ZBYTNÉ (discretionary) — volitelné výdaje, lze omezit:

- **expenses.dining** — Restaurace, fast food, kavárny, donáška jídla.
  Detekce: "RESTAURACE", "BISTRO", "PIZZA", "SUSHI", "WOLT", "BOLT FOOD",
  "DAMEJIDLO", "STARBUCKS", "KAVARNA", "COFFEE", "BURGER", "MCDONALD", "KFC".

- **expenses.subscriptions** — Streamovací služby a předplatné (lze zrušit).
  Detekce: "NETFLIX", "SPOTIFY", "DISNEY", "HBO", "APPLE.COM", "ICLOUD",
  "GOOGLE STORAGE", "DROPBOX", "ADOBE", "OPENAI", "CHATGPT", "GITHUB",
  "MICROSOFT 365", "FITNESS WORLD", "GYM", "PILATES", "JOGA", "CURSOR.SH".

- **expenses.discretionary** — Volnočasové utrácení, hobby, oblečení, sport,
  cestování, dárky, kosmetika luxus, hračky, ALZA elektronika osobní.
  Detekce: "ALZA", "MALL.CZ", "ZOOT", "ZALANDO", "DECATHLON", "INTERSPORT",
  "SPORTISIMO", "HOTEL", "BOOKING", "AIRBNB", "LETENKY", "KOSMETIKA",
  "PARFUMERIE", "TESCO MY" (mimo potravin).

- **expenses.other** — Cokoliv jiného (poplatky, daň, alimenty,
  výběr ATM bez kontextu).
  POZOR: BANKOVNÍ POPLATKY → other. Výběr z bankomatu → other.

PRAVIDLA klasifikace:
1. Klasifikuj POUZE podle popisu transakce. Když nejsi jistá → expenses.other.
2. Pokud výpis obsahuje souhrnný řádek "Připsáno celkem" / "Odepsáno celkem",
   ten je pravdou pro CELKOVOU sumu. Pak rozkategorizuj jednotlivé pohyby tak,
   aby suma kategorií se rovnala (±1 %) tomuto souhrnu.

═══════════════════════════════════════════════════════════════════════════════
 ODVOZENÉ HODNOTY — povinné, AI je dopočítá
═══════════════════════════════════════════════════════════════════════════════

- **necessary_total** = housing + food + transport + insurance + healthcare + savings
- **discretionary_total** = dining + subscriptions + discretionary + other
- **income_total** = salary + self_employed + rental + passive + other
- **expense_total** = necessary_total + discretionary_total

VOLITELNÉ:
- **detected_salary_amount** (number|null) — pokud klient má 1 jasnou mzdu,
  uvedeš čistou částku jedné výplaty (typicky stejné každý měsíc). Když má víc
  zdrojů nebo OSVČ → null.
- **detected_employment_type** ("employee"|"selfemployed"|"unknown") — pokud
  vidíš pravidelnou mzdu od jednoho zaměstnavatele → "employee". Pokud vidíš
  jen fakturace bez mzdy → "selfemployed". Jinak "unknown".

═══════════════════════════════════════════════════════════════════════════════
 PRIVACY — důležité
═══════════════════════════════════════════════════════════════════════════════

NIKDY do výstupu nevracej:
- Jména protistran ("INNOVATECH SOLUTIONS S.R.O.", "Pan Novak").
- Konkrétní popisy plateb.
- Čísla účtů, IBAN.
- Datumy konkrétních transakcí.

Pouze AGREGOVANÉ částky per kategorie.

═══════════════════════════════════════════════════════════════════════════════
 VÝSTUPNÍ FORMÁT
═══════════════════════════════════════════════════════════════════════════════

Vrať POUZE validní JSON dle dodaného schématu. Žádný text okolo, žádné komentáře.
Pokud výpis nelze parsovat → vrať null hodnoty (period_months: null, atd.) místo
hádání.`;

const ID_CARD_PROMPT = `Jsi extraktor dat z českého občanského průkazu. Z poskytnutého obrázku OP vytáhni:

1. **full_name** — plné jméno ve formátu „Jméno Příjmení" s českou diakritikou. Pokud je na OP „GASNIK LUKAS" (MRZ kód velkými písmeny bez diakritiky), převeď na „Lukáš Gašník" — ale pouze pokud máš jistotu o háčcích/čárkách. Pokud si nejsi jistý, použij verzi z přední strany s diakritikou.

2. **birth_date** — datum narození ve formátu YYYY-MM-DD. Z rodného čísla nebo z polohy „Datum narození". Příklad: rodné číslo 8610201234 → 1986-10-20.

3. **address** — trvalá adresa včetně města a PSČ jako jeden řetězec, např. „Smrčkova 2512/29, 180 00 Praha 8 - Libeň". Pokud je adresa na více řádcích, spoj je do jednoho řádku oddělenými čárkami.

KRITICKÁ PRAVIDLA:
- NIKDY nezahrnuj číslo OP, číslo rodného čísla, sériové číslo, datum vydání ani platnosti.
- Pokud máš více obrázků (přední + zadní strana), zkombinuj informace.
- Hodnotu, kterou nedokážeš určit, vrať jako null.
- Vrať POUZE validní JSON podle dodaného schématu.`;

// ============================================================================
// JSON Schemas pro OpenAI strict mode
// ============================================================================

function bankStatementRichJsonSchema() {
  return {
    name: "bank_statement_v2",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: [
        "period_months",
        "bank_name",
        "transaction_count",
        "income",
        "expenses",
        "necessary_total",
        "discretionary_total",
        "income_total",
        "expense_total",
        "detected_salary_amount",
        "detected_employment_type",
      ],
      properties: {
        period_months: { type: ["number", "null"] },
        bank_name: { type: ["string", "null"] },
        transaction_count: { type: ["integer", "null"] },
        income: {
          type: "object",
          additionalProperties: false,
          required: ["salary", "self_employed", "rental", "passive", "other"],
          properties: {
            salary: { type: "integer" },
            self_employed: { type: "integer" },
            rental: { type: "integer" },
            passive: { type: "integer" },
            other: { type: "integer" },
          },
        },
        expenses: {
          type: "object",
          additionalProperties: false,
          required: [
            "housing",
            "food",
            "transport",
            "insurance",
            "healthcare",
            "savings",
            "dining",
            "subscriptions",
            "discretionary",
            "other",
          ],
          properties: {
            housing: { type: "integer" },
            food: { type: "integer" },
            transport: { type: "integer" },
            insurance: { type: "integer" },
            healthcare: { type: "integer" },
            savings: { type: "integer" },
            dining: { type: "integer" },
            subscriptions: { type: "integer" },
            discretionary: { type: "integer" },
            other: { type: "integer" },
          },
        },
        necessary_total: { type: "integer" },
        discretionary_total: { type: "integer" },
        income_total: { type: "integer" },
        expense_total: { type: "integer" },
        detected_salary_amount: { type: ["integer", "null"] },
        detected_employment_type: {
          type: "string",
          enum: ["employee", "selfemployed", "unknown"],
        },
      },
    },
  };
}

function idCardJsonSchema() {
  return {
    name: "id_card_extract",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        full_name: { type: ["string", "null"] },
        birth_date: { type: ["string", "null"] },
        address: { type: ["string", "null"] },
      },
      required: ["full_name", "birth_date", "address"],
    },
  };
}

// ============================================================================
// Common types + helpers
// ============================================================================

interface FileBuffer {
  buffer: Buffer;
  mimeType: string;
  name: string;
}

function toDataUrl(file: FileBuffer): string {
  const base64 = file.buffer.toString("base64");
  return `data:${file.mimeType};base64,${base64}`;
}

export interface ExtractResult<T> {
  data: T;
  model: string;
  tokensUsed: number;
  latencyMs: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rawResponse: any;
  inputExcerpt: string;
  systemPrompt: string;
  userPrompt: string;
}

const INPUT_EXCERPT_LIMIT = 8000;

// ============================================================================
// Bank statement — rich extraction from text
// ============================================================================

export async function extractBankStatementRichFromText(
  text: string,
  fileName: string,
): Promise<ExtractResult<BankStatementRichExtract>> {
  const start = Date.now();
  const client = openai();

  const userPrompt = `Soubor: ${fileName}\n\nText výpisu:\n\n${text.slice(0, 80000)}`;

  const completion = await client.chat.completions.create({
    model: MODEL.extraction,
    messages: [
      { role: "system", content: BANK_STATEMENT_PROMPT_V2 },
      { role: "user", content: userPrompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: bankStatementRichJsonSchema(),
    },
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("Prázdná odpověď OpenAI při extrakci výpisu.");
  const rawJson = JSON.parse(raw);
  const parsed = bankStatementRichSchema.parse(rawJson);

  return {
    data: parsed,
    model: MODEL.extraction,
    tokensUsed: completion.usage?.total_tokens ?? 0,
    latencyMs: Date.now() - start,
    rawResponse: rawJson,
    inputExcerpt: text.slice(0, INPUT_EXCERPT_LIMIT),
    systemPrompt: BANK_STATEMENT_PROMPT_V2,
    userPrompt: userPrompt.slice(0, INPUT_EXCERPT_LIMIT),
  };
}

// ============================================================================
// ID card — vision extraction
// ============================================================================

export async function extractIdCard(
  files: FileBuffer[],
): Promise<ExtractResult<IdCardExtract>> {
  const start = Date.now();
  const client = openai();

  const userText =
    "Vytáhni údaje z přiloženého občanského průkazu (může být přední i zadní strana).";

  const userContent = [
    { type: "text" as const, text: userText },
    ...files.map((f) => ({
      type: "image_url" as const,
      image_url: { url: toDataUrl(f), detail: "high" as const },
    })),
  ];

  const completion = await client.chat.completions.create({
    model: MODEL.extraction,
    messages: [
      { role: "system", content: ID_CARD_PROMPT },
      { role: "user", content: userContent },
    ],
    response_format: {
      type: "json_schema",
      json_schema: idCardJsonSchema(),
    },
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("Prázdná odpověď OpenAI při extrakci OP.");
  const rawJson = JSON.parse(raw);
  const parsed = idCardSchema.parse(rawJson);

  const fileSummary = files
    .map((f) => `${f.name} (${f.mimeType}, ${f.buffer.length} B)`)
    .join("\n");

  return {
    data: parsed,
    model: MODEL.extraction,
    tokensUsed: completion.usage?.total_tokens ?? 0,
    latencyMs: Date.now() - start,
    rawResponse: rawJson,
    inputExcerpt: `[image OP, ${files.length} stran]\n${fileSummary}`,
    systemPrompt: ID_CARD_PROMPT,
    userPrompt: userText,
  };
}
