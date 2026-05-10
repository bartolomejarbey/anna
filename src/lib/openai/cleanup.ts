import "server-only";

import { z } from "zod";

import { MODEL, openai } from "@/lib/openai/client";

/**
 * AI cleanup pass between reconcile and extraction.
 *
 * Whisper-1 + Web Speech API both stumble on Czech proper nouns, diacritics,
 * and rare words. This step asks GPT-4o-mini to fix obvious typos / missing
 * diacritics / mangled names — without changing meaning.
 *
 * Customer-name & brand `hints` are passed in to bias the model toward
 * canonical spellings the advisor's portfolio actually uses (e.g. "Procházka"
 * not "Prohazka", "Generali" not "Genaralli").
 *
 * Output is structured: a cleaned transcript + an explicit list of
 * corrections so the UI can show "Anna opravila X překlepů" diff.
 *
 * Failure model:
 *   - OpenAI errors → throw (caller wraps).
 *   - Empty / unparseable response → throw.
 *   - Validation failure → throw with formatted Zod issues.
 */

const PROMPT_VERSION = "cleanup-v1";

const SYSTEM_PROMPT = `Jsi tichý korektor českých přepisů schůzek finančního poradce.

Dostaneš český přepis (RECONCILED) z Whisperu a webového rozpoznávání. Tvůj úkol je vrátit čistou verzi: opravit překlepy, chybějící diakritiku, špatně zapsaná česká vlastní jména a názvy finančních značek. NIKDY neměň význam, NIKDY nepřidávej nebo neubírej informaci, NIKDY nepřeparafrázuj.

Tvrdá pravidla:

1. Význam zůstává 1:1. Pokud si nejsi jistý/á, zda jde o překlep, NECH TO BÝT.
2. Hints (jména zákazníka, partnera, dětí, finančních značek) jsou ground truth pravopisu. Pokud v textu vidíš zjevně zkomolenou variantu některého z hintů, oprav podle hintu.
3. Diakritiku doplňuj jen tam, kde výsledné slovo je jednoznačné (typický Whisper miss: "muze" → "může", "rok" zůstává "rok"). Žádné dvojznačné rekonstrukce.
4. Interpunkci upravuj jen pokud chybí jasná tečka / čárka, která činí text těžko čitelný. Nepřeházej slovosled.
5. Číslovky a měny ZACHOVEJ přesně jako jsou (např. "45 000 Kč" zůstává).
6. NEMĚŇ český jazyk na slovenský/anglický a opačně.
7. Vrať VŠECHNY provedené změny v poli \`corrections\` jako dvojice {from, to, reason}. \`reason\` je jeden z: "name" (vlastní jméno nebo značka), "diacritic" (chybějící diakritika), "typo" (překlep), "punctuation" (čárka/tečka). Pokud jsi nic neopravil/a, vrať prázdné pole [].
8. Výstup pošli výhradně podle dodaného JSON schématu (Structured Outputs).`;

// ---------------------------------------------------------------------------
// Schema (Zod 4 → JSON Schema for OpenAI Structured Outputs strict: true).
// ---------------------------------------------------------------------------

const cleanupResponseSchema = z.object({
  cleaned_text: z
    .string()
    .describe(
      "Opravený český přepis. Stejný jazyk, stejná délka řádově, jen čistější.",
    ),
  corrections: z
    .array(
      z.object({
        from: z.string().describe("Původní (chybný) řetězec, jak byl v textu."),
        to: z.string().describe("Opravený řetězec."),
        reason: z
          .enum(["name", "diacritic", "typo", "punctuation"])
          .describe(
            "Důvod opravy: name = vlastní jméno/značka, diacritic = diakritika, typo = překlep, punctuation = interpunkce.",
          ),
      }),
    )
    .describe(
      "Seznam všech provedených oprav. Prázdné pole pokud nebylo co opravovat.",
    ),
});

export type CleanupResponse = z.infer<typeof cleanupResponseSchema>;

function buildCleanupJsonSchema(): Record<string, unknown> {
  const raw = z.toJSONSchema(cleanupResponseSchema, {
    target: "draft-2020-12",
  }) as Record<string, unknown>;
  const { $schema: _drop, ...rest } = raw;
  void _drop;
  return rest;
}

const cleanupJsonSchema = buildCleanupJsonSchema();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export type CleanupResult = {
  /** Opravený český přepis. */
  cleanedText: string;
  /** Diff oprav, které model provedl. */
  corrections: CleanupResponse["corrections"];
  /** Model id, např. 'gpt-4o-mini' nebo 'shortcut'. */
  model: string;
  /** Tokeny (prompt + completion), null pokud API nevrátil usage, 0 pro shortcut. */
  tokens: number | null;
  /** Wall-clock latence v ms. */
  latency_ms: number;
  /** Verze promptu pro analytiku. */
  promptVersion: string;
};

export type CleanupTranscriptInput = {
  /** Reconciled český přepis (po reconcileTranscripts). */
  reconciledText: string;
  /**
   * Kanonické pravopisy: jména zákazníka, partnera, dětí, případně známé
   * finanční značky z poradcova portfolia. Model je použije jako ground truth.
   */
  customerHints?: string[];
};

const SHORTCUT_THRESHOLD_CHARS = 20;

export async function cleanupTranscript(
  input: CleanupTranscriptInput,
): Promise<CleanupResult> {
  const text = (input.reconciledText ?? "").trim();
  const hints = (input.customerHints ?? [])
    .map((h) => h.trim())
    .filter((h) => h.length > 0);

  // Shortcut: prázdný / triviální vstup → no-op.
  if (text.length < SHORTCUT_THRESHOLD_CHARS) {
    const startedAt = performance.now();
    const latency_ms = Math.max(0, Math.round(performance.now() - startedAt));
    return {
      cleanedText: text,
      corrections: [],
      model: "shortcut",
      tokens: 0,
      latency_ms,
      promptVersion: PROMPT_VERSION,
    };
  }

  const hintsBlock =
    hints.length > 0
      ? `Hints (kanonický pravopis jmen a značek z poradcova portfolia):\n${hints.map((h) => `- ${h}`).join("\n")}\n\n`
      : "";

  const userMessage = `${hintsBlock}RECONCILED:\n${text}\n\nVrať \`cleaned_text\` a \`corrections\` přesně podle JSON schématu.`;

  const startedAt = performance.now();
  const resp = await openai().chat.completions.create({
    model: MODEL.cleanup,
    temperature: 0.1,
    max_completion_tokens: 4096,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "TranscriptCleanup",
        strict: true,
        schema: cleanupJsonSchema,
      },
    },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
  });
  const latency_ms = Math.round(performance.now() - startedAt);

  const raw = resp.choices[0]?.message?.content;
  if (!raw) {
    throw new Error("Cleanup: GPT-4o-mini vrátil prázdnou odpověď.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch (err) {
    throw new Error(
      `Cleanup: nelze parsovat JSON odpověď. Surová odpověď: ${raw.slice(0, 500)}`,
      { cause: err },
    );
  }

  const validation = cleanupResponseSchema.safeParse(parsed);
  if (!validation.success) {
    const issues = validation.error.issues
      .map((i) => `${i.path.join(".") || "<root>"}: ${i.message}`)
      .join("; ");
    throw new Error(`Cleanup: validace odpovědi selhala. Issues: ${issues}`);
  }

  const usage = resp.usage;
  const tokens =
    usage && typeof usage.total_tokens === "number" ? usage.total_tokens : null;

  return {
    cleanedText: validation.data.cleaned_text,
    corrections: validation.data.corrections,
    model: MODEL.cleanup,
    tokens,
    latency_ms,
    promptVersion: PROMPT_VERSION,
  };
}
