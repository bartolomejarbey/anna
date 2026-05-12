#!/usr/bin/env node
/**
 * Mode-aware extraction test (Haiku 4.5).
 *
 * Testuje 3 privacy módy na 3 výpisech (leden, červen, prosinec):
 *   • aggregate_only — minimální prompt, jen income/expense totál
 *   • categorized    — klasifikace nutné/zbytné (NE transactions v output)
 *   • full           — current v4 architektura (transactions[] + TS agregace)
 *
 * Cíl: ukázat (a) reálnou cenu per mode, (b) co poradce uvidí v každém módu.
 */

import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { extractText, getDocumentProxy } from "unpdf";

const envPath = path.resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  const raw = readFileSync(envPath, "utf-8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let value = m[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    )
      value = value.slice(1, -1);
    if (!process.env[m[1]]) process.env[m[1]] = value;
  }
}

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  console.error("Chybí ANTHROPIC_API_KEY");
  process.exit(1);
}

const HAIKU_MODEL = "claude-haiku-4-5-20251001";

// ============================================================================
// ANCHOR PATTERNS (pro categorized + full)
// ============================================================================

const ANCHORS = `KATEGORIZACE:

NUTNÉ výdaje:
  bydlení: ČEZ, PRE, EON, INNOGY, hypotéka, splátka úvěru, nájemné odchozí, SIPO,
           O2, T-MOBILE, VODAFONE, UPC, NETBOX, voda (PVK, Veolia), SVJ
  potraviny: ALBERT, TESCO, KAUFLAND, LIDL, BILLA, PENNY, GLOBUS, BIO MARKET,
             ROHLÍK, KOŠÍK, pekařství, řeznictví
  doprava: BENZINA, SHELL, OMV, MOL, ORLEN, MHD (DPP, ROPID, Lítačka),
           ARRIVA, REGIOJET, ČD, taxi, BOLT/UBER, STK, povinné ručení
  pojištění: ALLIANZ, GENERALI, KOOPERATIVA, UNIQA, AXA, NN, METLIFE,
             životní pojištění, úrazové pojištění
  zdraví: nemocnice, lékař, zubní, dentál, lékárna (BENU, DR.MAX, PILULKA),
          optika, brýle
  spoření: PORTU, FONDEE, INDIGO, INVESTOWN, penzijní fond, DPS,
           stavební spoření, převod na spořicí účet, ETF, XTB, Degiro

ZBYTNÉ výdaje:
  restaurace+kavárny: MCDONALD, KFC, BURGER KING, STARBUCKS, WOLT, FOODORA,
                      BOLT FOOD, restaurace, bistro, café, hospoda, vinotéka
  předplatné: NETFLIX, SPOTIFY, HBO, DISNEY+, APPLE.COM, ICLOUD, OPENAI,
              MULTISPORT, FITNESS, ADOBE
  oblečení/elektronika/dárky: ZALANDO, ZARA, H&M, ALZA, MALL, NOTINO, DOUGLAS,
                              IKEA, JYSK, DECATHLON, ROSSMANN, DM, TETA,
                              SEPHORA, DATART
  zábava/cestovky: kino, divadlo, BOOKING, AIRBNB, hotel, letenky, wellness

IGNORE (nezapočítávej):
  Bankovní poplatky < 100 Kč, vlastní převody mezi účty,
  ATM výběry, stornované transakce`;

// ============================================================================
// PROMPTS per mode
// ============================================================================

const PROMPT_AGGREGATE = `Jsi extraktor TOTÁLŮ z českého bankovního výpisu.

Tvůj jediný úkol: spočítej PŘÍJEM a VÝDAJ jako dvě čísla. Nic víc.

PRAVIDLA:
1. income_total = součet všech příchozích plateb (mzda, faktury, nájem, dividendy)
2. expense_total = součet všech odchozích plateb KROMĚ:
   • Bankovní poplatky < 100 Kč
   • Převody mezi vlastními účty (např. "PŘEVOD NA SPOŘICÍ ÚČET" k téže osobě)
   • Výběry/vklady hotovosti z bankomatu
   • Stornované transakce
3. period_months = délka období v měsících (1.1.–31.1. = 1)
4. bank_name = banka (Air Bank, ČSOB, atd.)
5. transactions_seen = kolik transakcí jsi viděl celkem (pro audit)

Vrať POUZE čísla — žádný seznam transakcí, žádné kategorie.`;

const PROMPT_CATEGORIZED = `Jsi klasifikátor výdajů na NUTNÉ vs ZBYTNÉ z českého bankovního výpisu.

Tvůj úkol: spočítej příjem, nutné výdaje a zbytné výdaje. NE jednotlivé transakce.

${ANCHORS}

PRAVIDLA:
1. income_total = součet všech příjmů
2. necessary_total = součet NUTNÝCH výdajů (bydlení + potraviny + doprava + pojištění + zdraví + spoření)
3. discretionary_total = součet ZBYTNÝCH výdajů (restaurace + předplatné + oblečení + zábava)
4. period_months
5. bank_name
6. transactions_seen
7. classification_confidence: high/medium/low — jak dobře jsi rozpoznal kategorie podle anchor patternů

Pokud má víc než 30 % transakcí vágní popis (např. jen "Platba kartou 12345" bez merchanta):
  → classification_confidence = "low" + uveď warning_note proč

Vrať POUZE čísla — žádný seznam transakcí.`;

const PROMPT_FULL = `Jsi extraktor jednotlivých transakcí z českého bankovního výpisu.

Tvůj úkol: VYPSAT KAŽDOU TRANSAKCI do pole "transactions" + meta data.

⚠️ KRITICKÁ PRAVIDLA:
1. NEPOČÍTEJ ŽÁDNÉ AGREGÁTY. Sumy si TS spočítá sám.
2. VYPIŠ KAŽDOU TRANSAKCI. Pokud má výpis 47 řádků, transactions[] má 47 záznamů.
3. NEHÁDEJ. Vágní transakce → "expenses.other" s confidence="low".
4. NEVYTVÁŘEJ FAKE TRANSAKCE.

OUTPUT per transakce:
  date: "YYYY-MM-DD" nebo null
  description: max 80 znaků
  amount: celé Kč (+ příjem / − výdaj)
  category: income.salary | income.self_employed | income.rental | income.passive | income.other |
            expenses.housing | expenses.food | expenses.transport | expenses.insurance |
            expenses.healthcare | expenses.savings | expenses.dining | expenses.subscriptions |
            expenses.discretionary | expenses.other | ignore
  confidence: high | medium | low

${ANCHORS}

Vrať validní data dle schématu.`;

// ============================================================================
// SCHEMAS per mode
// ============================================================================

const SCHEMA_AGGREGATE = {
  name: "extract_aggregate",
  description: "Vrátí jen totály — žádné transakce ani kategorie.",
  input_schema: {
    type: "object",
    required: ["income_total", "expense_total", "period_months", "bank_name", "transactions_seen"],
    properties: {
      income_total: { type: "number" },
      expense_total: { type: "number" },
      period_months: { type: ["number", "null"] },
      bank_name: { type: ["string", "null"] },
      transactions_seen: { type: "number" },
    },
  },
};

const SCHEMA_CATEGORIZED = {
  name: "extract_categorized",
  description: "Vrátí příjem + nutné/zbytné — žádné transakce.",
  input_schema: {
    type: "object",
    required: [
      "income_total",
      "necessary_total",
      "discretionary_total",
      "period_months",
      "bank_name",
      "transactions_seen",
      "classification_confidence",
    ],
    properties: {
      income_total: { type: "number" },
      necessary_total: { type: "number" },
      discretionary_total: { type: "number" },
      period_months: { type: ["number", "null"] },
      bank_name: { type: ["string", "null"] },
      transactions_seen: { type: "number" },
      classification_confidence: { type: "string", enum: ["high", "medium", "low"] },
      warning_note: { type: ["string", "null"] },
    },
  },
};

const SCHEMA_FULL = {
  name: "extract_full",
  description: "Vrátí všechny transakce + meta.",
  input_schema: {
    type: "object",
    required: ["period_months", "bank_name", "transactions"],
    properties: {
      period_months: { type: ["number", "null"] },
      bank_name: { type: ["string", "null"] },
      transactions: {
        type: "array",
        items: {
          type: "object",
          required: ["date", "description", "amount", "category", "confidence"],
          properties: {
            date: { type: ["string", "null"] },
            description: { type: "string" },
            amount: { type: "number" },
            category: {
              type: "string",
              enum: [
                "income.salary",
                "income.self_employed",
                "income.rental",
                "income.passive",
                "income.other",
                "expenses.housing",
                "expenses.food",
                "expenses.transport",
                "expenses.insurance",
                "expenses.healthcare",
                "expenses.savings",
                "expenses.dining",
                "expenses.subscriptions",
                "expenses.discretionary",
                "expenses.other",
                "ignore",
              ],
            },
            confidence: { type: "string", enum: ["high", "medium", "low"] },
          },
        },
      },
    },
  },
};

// ============================================================================
// Helpers
// ============================================================================

async function extractTextFromPdf(buffer) {
  const uint8 = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const pdf = await getDocumentProxy(uint8);
  const { text } = await extractText(pdf, { mergePages: true });
  return Array.isArray(text) ? text.join("\n") : text;
}

const PRICE = { in: 1.0, out: 5.0 }; // Haiku 4.5
const cost = (inTok, outTok) => (inTok / 1e6) * PRICE.in + (outTok / 1e6) * PRICE.out;

async function callHaiku(prompt, schema, text, fileName) {
  const user = `Soubor: ${fileName}\n\nText výpisu:\n\n${text.slice(0, 80000)}`;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: HAIKU_MODEL,
      max_tokens: 16384,
      system: prompt,
      tools: [schema],
      tool_choice: { type: "tool", name: schema.name },
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) {
    throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const body = await res.json();
  const toolUse = body.content?.find((c) => c.type === "tool_use");
  if (!toolUse) throw new Error("No tool_use in response");
  return {
    data: toolUse.input,
    inputTokens: body.usage?.input_tokens ?? 0,
    outputTokens: body.usage?.output_tokens ?? 0,
  };
}

// ============================================================================
// Full mode — TS aggregation (jediný mode kde sčítáme my)
// ============================================================================

const NECESSARY = ["housing", "food", "transport", "insurance", "healthcare", "savings"];
const DISCRETIONARY = ["dining", "subscriptions", "discretionary"];

function aggregateFromTransactions(txs) {
  const income = { salary: 0, self_employed: 0, rental: 0, passive: 0, other: 0 };
  const expenses = {
    housing: 0, food: 0, transport: 0, insurance: 0, healthcare: 0, savings: 0,
    dining: 0, subscriptions: 0, discretionary: 0, other: 0,
  };
  for (const t of txs) {
    if (t.category === "ignore") continue;
    const amt = Math.abs(Math.round(t.amount));
    if (t.category.startsWith("income.")) {
      income[t.category.replace("income.", "")] += amt;
    } else if (t.category.startsWith("expenses.")) {
      expenses[t.category.replace("expenses.", "")] += amt;
    }
  }
  const income_total = Object.values(income).reduce((a, b) => a + b, 0);
  const necessary_total = NECESSARY.reduce((s, k) => s + expenses[k], 0);
  const discretionary_total = DISCRETIONARY.reduce((s, k) => s + expenses[k], 0) + expenses.other;
  const expense_total = necessary_total + discretionary_total;
  return { income, expenses, income_total, expense_total, necessary_total, discretionary_total };
}

// ============================================================================
// Advisor view formatters
// ============================================================================

function fmt(n) {
  return Math.round(n).toLocaleString("cs-CZ") + " Kč";
}

function advisorViewAggregate(r) {
  return [
    `┌── POHLED PORADCE (aggregate_only) ──`,
    `│ Příjem celkem:    ${fmt(r.income_total)}`,
    `│ Výdaj celkem:     ${fmt(r.expense_total)}`,
    `│ Volný cashflow:   ${fmt(r.income_total - r.expense_total)}`,
    `│ Období:           ${r.period_months ?? "?"} měsíc(ů)`,
    `│ Banka:            ${r.bank_name ?? "?"}`,
    `└──`,
  ].join("\n");
}

function advisorViewCategorized(r) {
  const cashflow = r.income_total - r.necessary_total - r.discretionary_total;
  const necRatio = ((r.necessary_total / r.income_total) * 100).toFixed(0);
  const discRatio = ((r.discretionary_total / r.income_total) * 100).toFixed(0);
  return [
    `┌── POHLED PORADCE (categorized) ──`,
    `│ Příjem celkem:        ${fmt(r.income_total)}`,
    `│ Nutné výdaje:         ${fmt(r.necessary_total)} (${necRatio} % příjmu)`,
    `│ Zbytné výdaje:        ${fmt(r.discretionary_total)} (${discRatio} % příjmu)`,
    `│ Volný cashflow:       ${fmt(cashflow)}`,
    `│ Doporučená rezerva:   ${fmt(r.necessary_total * 6)} (6× nutné)`,
    `│ Confidence:           ${r.classification_confidence}${r.warning_note ? ` — ${r.warning_note}` : ""}`,
    `│ Období / banka:       ${r.period_months ?? "?"} m. / ${r.bank_name ?? "?"}`,
    `└──`,
  ].join("\n");
}

function advisorViewFull(r, agg) {
  const cashflow = agg.income_total - agg.expense_total;
  return [
    `┌── POHLED PORADCE (full) ──`,
    `│ Příjem celkem:        ${fmt(agg.income_total)}`,
    `│   ├── Mzda:           ${fmt(agg.income.salary)}`,
    `│   ├── OSVČ:           ${fmt(agg.income.self_employed)}`,
    `│   └── Ostatní:        ${fmt(agg.income.rental + agg.income.passive + agg.income.other)}`,
    `│ Výdaje celkem:        ${fmt(agg.expense_total)}`,
    `│   ├── Bydlení:        ${fmt(agg.expenses.housing)}`,
    `│   ├── Potraviny:      ${fmt(agg.expenses.food)}`,
    `│   ├── Doprava:        ${fmt(agg.expenses.transport)}`,
    `│   ├── Pojištění:      ${fmt(agg.expenses.insurance)}`,
    `│   ├── Zdraví:         ${fmt(agg.expenses.healthcare)}`,
    `│   ├── Spoření:        ${fmt(agg.expenses.savings)}`,
    `│   ├── Restaurace:     ${fmt(agg.expenses.dining)}`,
    `│   ├── Předplatné:     ${fmt(agg.expenses.subscriptions)}`,
    `│   ├── Discretionary:  ${fmt(agg.expenses.discretionary)}`,
    `│   └── Ostatní:        ${fmt(agg.expenses.other)}`,
    `│ → Nutné výdaje:       ${fmt(agg.necessary_total)}`,
    `│ → Zbytné výdaje:      ${fmt(agg.discretionary_total)}`,
    `│ Volný cashflow:       ${fmt(cashflow)}`,
    `│ Počet transakcí:      ${r.transactions.filter((t) => t.category !== "ignore").length}`,
    `│ Období / banka:       ${r.period_months ?? "?"} m. / ${r.bank_name ?? "?"}`,
    `└──`,
  ].join("\n");
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const dlDir = path.join(os.homedir(), "Downloads");
  const all = await readdir(dlDir);
  const allStatements = all
    .filter((f) => /AirBank_vypis_Tomas_Novak_2024-\d{2}\.pdf$/i.test(f))
    .sort();

  // Vyber 3 reprezentativní: leden (normal), červen (cestování), prosinec (bonus)
  const picks = allStatements.filter((f) => /2024-(01|06|12)/.test(f));

  console.log(`Mode-aware test — ${picks.length} výpisů × 3 módy = ${picks.length * 3} volání.\n`);

  const outDir = path.join(process.cwd(), "scripts", "extraction-results-by-mode");
  if (!existsSync(outDir)) await mkdir(outDir, { recursive: true });

  const modes = [
    { name: "aggregate_only", prompt: PROMPT_AGGREGATE, schema: SCHEMA_AGGREGATE },
    { name: "categorized", prompt: PROMPT_CATEGORIZED, schema: SCHEMA_CATEGORIZED },
    { name: "full", prompt: PROMPT_FULL, schema: SCHEMA_FULL },
  ];

  const summary = {};

  for (const file of picks) {
    const pdfPath = path.join(dlDir, file);
    const buffer = await readFile(pdfPath);
    const text = await extractTextFromPdf(buffer);
    const month = file.match(/2024-(\d{2})/)[1];

    console.log(`\n══════════════════════════════════════════════`);
    console.log(`  ${file}`);
    console.log(`══════════════════════════════════════════════`);

    for (const mode of modes) {
      try {
        const t0 = Date.now();
        const r = await callHaiku(mode.prompt, mode.schema, text, file);
        const latency = Date.now() - t0;
        const c = cost(r.inputTokens, r.outputTokens);

        let view = "";
        if (mode.name === "aggregate_only") {
          view = advisorViewAggregate(r.data);
        } else if (mode.name === "categorized") {
          view = advisorViewCategorized(r.data);
        } else {
          const agg = aggregateFromTransactions(r.data.transactions ?? []);
          view = advisorViewFull(r.data, agg);
        }

        console.log(`\n[${mode.name}]  in=${r.inputTokens}tok out=${r.outputTokens}tok  $${c.toFixed(4)} (${(c * 23.5).toFixed(2)} Kč)  ${latency}ms`);
        console.log(view);

        summary[`${month}/${mode.name}`] = {
          inputTokens: r.inputTokens,
          outputTokens: r.outputTokens,
          cost: c,
          costCzk: c * 23.5,
          latencyMs: latency,
          data: r.data,
        };

        await writeFile(
          path.join(outDir, `${file.replace(".pdf", "")}.${mode.name}.json`),
          JSON.stringify({ mode: mode.name, ...r }, null, 2),
        );
      } catch (e) {
        console.error(`[${mode.name}] CHYBA: ${e.message}`);
      }
    }
  }

  // === Cena summary ===
  console.log(`\n\n═══ CENOVÝ SOUHRN (3 výpisy × 3 módy) ═══`);
  console.log(
    "Mode             | Avg cena/výpis | Min      | Max      | Avg output tok",
  );
  console.log("-".repeat(75));
  for (const modeName of ["aggregate_only", "categorized", "full"]) {
    const entries = Object.entries(summary).filter(([k]) => k.endsWith(modeName));
    if (!entries.length) continue;
    const costs = entries.map(([, v]) => v.costCzk);
    const outs = entries.map(([, v]) => v.outputTokens);
    const avg = costs.reduce((a, b) => a + b, 0) / costs.length;
    const min = Math.min(...costs);
    const max = Math.max(...costs);
    const avgOut = Math.round(outs.reduce((a, b) => a + b, 0) / outs.length);
    console.log(
      `${modeName.padEnd(16)} | ${avg.toFixed(2).padStart(11)} Kč | ${min.toFixed(2).padStart(5)} Kč | ${max.toFixed(2).padStart(5)} Kč | ${avgOut}`,
    );
  }

  await writeFile(path.join(outDir, "_summary.json"), JSON.stringify(summary, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
