import "server-only";

import { MODEL, openai } from "@/lib/openai/client";

/**
 * Reconcile two parallel transcripts of the same Czech meeting:
 *   - `liveText`    — Web Speech API live captions. Often sparse, but in some
 *                     browsers catches numbers and proper nouns Whisper
 *                     mangles.
 *   - `whisperText` — OpenAI Whisper-1 ground truth. Generally more accurate,
 *                     occasionally errs on Czech proper nouns and digits.
 *
 * Strategy: prefer Whisper as the spine, splice in live-caption fragments only
 * where they materially improve digits / names / acronyms.
 *
 * Short-circuit: if `liveText` is effectively blank (< 20 chars after trim),
 * we skip the model call, return Whisper verbatim, and tag the result as
 * `model: 'shortcut'` so analytics can distinguish.
 *
 * Failure model: throws on OpenAI errors. Caller wraps.
 */

const PROMPT_VERSION = "reconcile-v1";

const SYSTEM_PROMPT = `Jsi tichý editor finálních přepisů schůzek finančního poradce s českým zákazníkem.

Dostaneš dva přepisy téže schůzky:
- LIVE: zachycený živým rozpoznáváním v prohlížeči, často sparse, ale v některých případech zachytí čísla, jména a zkratky lépe.
- WHISPER: výstup OpenAI Whisper modelu, obecně přesnější, ale občas chybuje na českých vlastních jménech, číslech a zkratkách.

Tvůj jediný úkol: vyrobit jeden čistý, čitelný český přepis schůzky.

Pravidla:
1. Jako základ použij WHISPER. LIVE používej jen pro opravu konkrétních čísel, jmen a zkratek, kde je zjevně přesnější.
2. NIKDY nepřidávej informace, které v žádném přepisu nezazněly. Žádné dovětky, žádné parafráze, žádné domyšlení.
3. Žádné uvozovky reproducíruj přesně. Číselné údaje normalizuj na arabská čísla, pokud to nezkreslí význam (např. „pět set tisíc" → „500 000").
4. Odstraň dvojté výskyty ze slepování dvou zdrojů; výsledek musí číst jako jeden plynulý text.
5. NEVKLÁDEJ žádné nadpisy, popisky („Přepis:", „Reconciled text:" apod.), ani komentáře, ani Markdown. Vrátíš pouze a jen finální český text schůzky.
6. Zachovej český jazyk. Nepřekládej.`;

export type ReconcileResult = {
  /** Final reconciled Czech transcript. Empty string is possible if both inputs were empty. */
  text: string;
  /** Model id used. 'gpt-4o-mini' on real call; 'shortcut' if we bypassed the API. */
  model: string;
  /** prompt_tokens + completion_tokens, or 0 if shortcut, or null if API didn't return usage. */
  tokens: number | null;
  /** Wall-clock latency in ms. Tiny number (< 5) on shortcut. */
  latency_ms: number;
  /** Prompt version tag, mirrors `transcripts.prompt_version`. */
  promptVersion: string;
};

export type ReconcileTranscriptsInput = {
  liveText: string;
  whisperText: string;
};

const SHORTCUT_THRESHOLD_CHARS = 20;

export async function reconcileTranscripts(
  input: ReconcileTranscriptsInput,
): Promise<ReconcileResult> {
  const live = (input.liveText ?? "").trim();
  const whisper = (input.whisperText ?? "").trim();

  // Shortcut: live captions effectively absent → no value in calling the model.
  if (live.length < SHORTCUT_THRESHOLD_CHARS) {
    const startedAt = performance.now();
    // Tiny no-op work to give a non-zero, monotonic latency value.
    const text = whisper;
    const latency_ms = Math.max(0, Math.round(performance.now() - startedAt));
    return {
      text,
      model: "shortcut",
      tokens: 0,
      latency_ms,
      promptVersion: PROMPT_VERSION,
    };
  }

  const userMessage = [
    "LIVE:",
    live,
    "",
    "WHISPER:",
    whisper,
    "",
    "Vrať pouze finální český přepis schůzky bez jakéhokoli komentáře.",
  ].join("\n");

  const startedAt = performance.now();
  const resp = await openai().chat.completions.create({
    model: MODEL.reconcile,
    temperature: 0.1,
    max_completion_tokens: 4096,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
  });
  const latency_ms = Math.round(performance.now() - startedAt);

  const text = (resp.choices[0]?.message?.content ?? "").trim();
  const usage = resp.usage;
  const tokens =
    usage && typeof usage.total_tokens === "number" ? usage.total_tokens : null;

  return {
    text,
    model: MODEL.reconcile,
    tokens,
    latency_ms,
    promptVersion: PROMPT_VERSION,
  };
}
