#!/usr/bin/env node
/**
 * v4 prompt — Haiku 4.5 jako per-transaction klasifikátor, TS dělá agregaci.
 *
 * Stejná architektura jako v4 mini, ale model = claude-haiku-4-5-20251001.
 * Cíl: porovnat Haiku 4.5 vs GPT-4o-mini vs GPT-4o.
 *
 * Haiku 4.5 pricing: $1/M input, $5/M output (vs mini $0.15/$0.60, 4o $2.50/$10).
 *
 * Pro strukturovaný output: tool_use API (forced tool_choice) — Anthropic ekvivalent
 * OpenAI strict json_schema.
 */

import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { extractText, getDocumentProxy } from "unpdf";

// ---------- env ----------
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
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = value;
  }
}

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  console.error("Chybí ANTHROPIC_API_KEY (export před spuštěním nebo přidej do .env.local).");
  process.exit(1);
}

const HAIKU_MODEL = "claude-haiku-4-5-20251001";

// ============================================================================
// ANCHOR PATTERNS — identické s v4-mini
// ============================================================================

const ANCHORS = `
KATEGORIZACE — anchor patterny (české + mezinárodní):

income.salary:
  MZDA, PLAT, SALARY, VÝPLATA, výplata mzdy, mzda za, salary for

income.self_employed:
  FAKTURA, INVOICE, faktura č., faktura za, vyúčtování (od firmy klientovi)

income.rental:
  NÁJEM (příchozí), nájemné, rent, NÁJEMNÍK

income.passive:
  DIVIDENDA, dividend, ÚROK, interest payment, KUPÓN

expenses.housing:
  ČEZ, PRE, PRAŽSKÁ ENERGETIKA, PRAŽSKÁ PLYNÁRENSKÁ, INNOGY, BOHEMIA ENERGY,
  EON, E.ON, RWE, CENTROPOL, PRAŽSKÉ VODOVODY, VEOLIA, PVK,
  HYPOTÉKA, HYPOTEČNÍ ÚVĚR, ÚVĚR NA BYDLENÍ, splátka úvěru,
  NÁJEMNÉ (odchozí), POPLATEK SVJ, fond oprav, SIPO, družstvo, BD,
  O2, T-MOBILE, VODAFONE, UPC, NETBOX,
  POJIŠTĚNÍ NEMOVITOSTI, pojištění domácnosti

expenses.food:
  ROSSMANN (drogerie+potraviny), TESCO, ALBERT, KAUFLAND, LIDL, BILLA, GLOBUS,
  MAKRO, PENNY, NORMA, COOP, ŽABKA, FLOP, SAVE,
  PEKAŘSTVÍ, ŘEZNICTVÍ, FARMÁŘSKÉ, BIOMARKET, ROHLÍK, KOŠÍK

expenses.transport:
  BENZINA, ORLEN, OMV, MOL, SHELL, BP, EUROOIL, PRIM,
  ŠKODA AUTO, SERVIS AUTO, PNEU,
  DPP, DPB, ROPID, LÍTAČKA, JÍZDENKA,
  ARRIVA, REGIOJET, STUDENT AGENCY, ČD, ČESKÉ DRÁHY,
  TAXI, BOLT (jízdy), LIFTAGO, UBER,
  STK, POVINNÉ RUČENÍ, HAVARIJNÍ POJIŠTĚNÍ

expenses.insurance:
  ALLIANZ, GENERALI, KOOPERATIVA, ČESKÁ POJIŠŤOVNA, UNIQA, AXA, ERGO,
  ČSOB POJIŠŤOVNA, MAXIMA, METLIFE, NN POJIŠŤOVNA, AEGON,
  ŽIVOTNÍ POJIŠTĚNÍ, ÚRAZOVÉ POJIŠTĚNÍ, RIZIKOVÉ POJ.

expenses.healthcare:
  NEMOCNICE, POLIKLINIKA, LÉKAŘ, ZUBNÍ, DENTAL,
  LÉKÁRNA, BENU, DR.MAX, PILULKA, ZENTIVA,
  OPTIKA, BRÝLE

expenses.savings:
  REVOLUT (transfer), WISE (transfer), TRADING212, DEGIRO, ETORO,
  PORTU, FONDEE, INDIGO, INVESTOWN,
  PENZIJNÍ FOND, DPS, DSS,
  STAVEBNÍ SPOŘENÍ, MODRÁ PYRAMIDA, RAIFFEISEN STAVEBNÍ,
  XTB, SAXO BANK, INTERACTIVE BROKERS,
  ETF, AKCIE, FOND,
  PŘEVOD NA SPOŘENÍ, savings account transfer

expenses.dining:
  MCDONALD, KFC, BURGER KING, SUBWAY, STARBUCKS, COSTA, PIZZA HUT,
  WOLT, FOODORA, BOLT FOOD, DAMEJÍDLO, NESNĚZENO,
  RESTAURACE, BISTRO, CAFE, KAVÁRNA, HOSPODA, PIVOVAR, BAR

expenses.subscriptions:
  NETFLIX, SPOTIFY, HBO MAX, DISNEY+, APPLE TV, AMAZON PRIME,
  APPLE.COM/BILL, ICLOUD, GOOGLE STORAGE, ONEDRIVE, DROPBOX,
  OPENAI, ANTHROPIC, ADOBE, MICROSOFT 365,
  NOTION, FIGMA, GITHUB, JETBRAINS,
  MULTISPORT, FITNESS

expenses.discretionary:
  ZALANDO, ZARA, H&M, MANGO, RESERVED,
  ALZA, MALL, NOTINO, DOUGLAS,
  AMAZON (kromě Prime), AMZN MKTP,
  IKEA, JYSK, MÖBELIX, KIKA,
  DATART, ELECTRO WORLD,
  DECATHLON, INTERSPORT,
  DM (drogerie obecná), TETA,
  KINO, DIVADLO, KONCERT, TICKETPORTAL, GOOUT,
  CESTOVKA, BOOKING, AIRBNB, EXPEDIA, LETENKY,
  HRACKY, DARKY, KVĚTINY,
  KADEŘNÍK, MASÁŽ, KOSMETIKA, WELLNESS

ignore (NEKLASIFIKUJ jako příjem ani výdaj):
  • Bankovní poplatky < 100 Kč
  • Převody mezi vlastními účty téhož klienta
  • Vklady/výběry hotovosti (nevíme kam)
  • Stornované transakce
`;

// ============================================================================
// PROMPT V4 — identický s v4-mini
// ============================================================================

const PROMPT_V4 = `Jsi extraktor jednotlivých transakcí z českých bankovních výpisů.
Tvůj jediný úkol: VYPSAT KAŽDOU TRANSAKCI do pole "transactions" + meta data.

⚠️ KRITICKÁ PRAVIDLA:

1. NEPOČÍTEJ ŽÁDNÉ AGREGÁTY. Žádné expense_total, žádné income.salary celkem,
   žádné necessary_total. POUZE individuální transakce. Sumy si TS spočítá sám.

2. VYPIŠ KAŽDOU TRANSAKCI VIDITELNOU VE VÝPISU. Neslučuj, nezkracuj, nevynechávej.
   Pokud výpis má 47 řádků s pohyby, transactions[] má 47 záznamů.

3. NEHÁDEJ. Pokud kategorii nejsi jistý → "expenses.other" s confidence="low".
   Lepší přiznat nejistotu, než halucinovat kategorii.

4. NEVYTVÁŘEJ TRANSAKCE, KTERÉ NEJSOU V TEXTU. Žádná invence.

═══════════════════════════════════════════════════════════════════════════════
 OUTPUT — pro každou transakci:
═══════════════════════════════════════════════════════════════════════════════

{
  date: "YYYY-MM-DD" (pokud lze)
  description: krátký popis transakce (max 80 znaků, originální text z výpisu)
  amount: celé Kč (positive = příjem, negative = výdaj)
  category: jedna z:
     income.salary | income.self_employed | income.rental | income.passive |
     income.other | expenses.housing | expenses.food | expenses.transport |
     expenses.insurance | expenses.healthcare | expenses.savings |
     expenses.dining | expenses.subscriptions | expenses.discretionary |
     expenses.other | ignore
  confidence: "high" | "medium" | "low"
}

CONFIDENCE LEVELS:
  high  = anchor pattern match (např. "MZDA NOVAK SRO" → income.salary)
  medium = pravděpodobná kategorie podle kontextu, ale ne 100% jistota
  low   = nelze určit, ponecháno v "other" nebo "ignore"

${ANCHORS}

═══════════════════════════════════════════════════════════════════════════════
 META FIELDS:
═══════════════════════════════════════════════════════════════════════════════

period_months  — délka období v měsících (1.1.–31.1. = 1; null pokud neznámé)
bank_name      — banka ("Air Bank", "ČSOB", "Komerční banka", atd.) nebo null
status         — 3-state Finatiq-style:
                 "ok"       = výpis čitelný, všechny transakce extrahované
                 "warning"  = výpis čitelný, ale > 30 % transakcí má low confidence
                              NEBO bylo příliš málo dat (< 10 transakcí celkem)
                 "rejected" = text nečitelný / poškozený / není to výpis
status_reason  — pokud rejected, jeden z:
                 "unreadable_text" | "scanned_no_text" | "partial_statement" |
                 "garbled_pdf" | "not_a_bank_statement" | null pokud ok/warning

retry_guidance — pokud rejected, KONKRÉTNÍ česká instrukce klientovi (tykání).
                 Příklady:
                   "Výpis je naskenovaný obrázek, ne textové PDF. Stáhni ho prosím
                    přímo z internet bankingu jako PDF."
                   "PDF má jen 1 stránku, výpis vypadá zkráceně. Stáhni prosím
                    celý měsíční výpis."
                 Jinak null.

Použij tool "extract_bank_statement" — vrať POUZE validní data dle schématu.`;

// ============================================================================
// JSON SCHEMA pro Anthropic tool_use
// ============================================================================

const transactionSchema = {
  type: "object",
  required: ["date", "description", "amount", "category", "confidence"],
  properties: {
    date: { type: ["string", "null"], description: "Datum YYYY-MM-DD nebo null" },
    description: { type: "string", description: "Originální popis z výpisu" },
    amount: { type: "number", description: "Částka v Kč (+ příjem / − výdaj)" },
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
};

const extractTool = {
  name: "extract_bank_statement",
  description: "Vrátí extrahované transakce a meta data z bankovního výpisu.",
  input_schema: {
    type: "object",
    required: [
      "period_months",
      "bank_name",
      "transactions",
      "status",
      "status_reason",
      "retry_guidance",
    ],
    properties: {
      period_months: {
        type: ["number", "null"],
        description: "Délka období v měsících",
      },
      bank_name: { type: ["string", "null"] },
      transactions: { type: "array", items: transactionSchema },
      status: { type: "string", enum: ["ok", "warning", "rejected"] },
      status_reason: {
        type: ["string", "null"],
        enum: [
          "unreadable_text",
          "scanned_no_text",
          "partial_statement",
          "garbled_pdf",
          "not_a_bank_statement",
          null,
        ],
      },
      retry_guidance: { type: ["string", "null"] },
    },
  },
};

// ============================================================================
// TS aggregation — identické s v4-mini
// ============================================================================

const NECESSARY_CATS = [
  "expenses.housing",
  "expenses.food",
  "expenses.transport",
  "expenses.insurance",
  "expenses.healthcare",
  "expenses.savings",
];
const DISCRETIONARY_CATS = [
  "expenses.dining",
  "expenses.subscriptions",
  "expenses.discretionary",
];

function aggregate(transactions) {
  const income = {
    salary: 0,
    self_employed: 0,
    rental: 0,
    passive: 0,
    other: 0,
  };
  const expenses = {
    housing: 0,
    food: 0,
    transport: 0,
    insurance: 0,
    healthcare: 0,
    savings: 0,
    dining: 0,
    subscriptions: 0,
    discretionary: 0,
    other: 0,
  };

  const confidenceDistribution = {};
  const txByCat = {};

  for (const t of transactions) {
    if (t.category === "ignore") continue;

    const amt = Math.abs(Math.round(t.amount));
    if (t.category.startsWith("income.")) {
      const key = t.category.replace("income.", "");
      income[key] += amt;
    } else if (t.category.startsWith("expenses.")) {
      const key = t.category.replace("expenses.", "");
      expenses[key] += amt;
    }

    if (!confidenceDistribution[t.category]) {
      confidenceDistribution[t.category] = { high: 0, medium: 0, low: 0 };
      txByCat[t.category] = [];
    }
    confidenceDistribution[t.category][t.confidence] += 1;
    txByCat[t.category].push(t);
  }

  const income_total = Object.values(income).reduce((a, b) => a + b, 0);
  const expense_total = Object.values(expenses).reduce((a, b) => a + b, 0);
  const necessary_total = NECESSARY_CATS.reduce(
    (s, c) => s + expenses[c.replace("expenses.", "")],
    0,
  );
  const discretionary_total = DISCRETIONARY_CATS.reduce(
    (s, c) => s + expenses[c.replace("expenses.", "")],
    0,
  );

  const salaryTx = transactions.filter((t) => t.category === "income.salary");
  let detected_salary_amount = null;
  if (salaryTx.length > 0) {
    salaryTx.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
    detected_salary_amount = Math.round(Math.abs(salaryTx[0].amount));
  }

  const employmentType =
    income.salary > income.self_employed
      ? "employee"
      : income.self_employed > 0
        ? "selfemployed"
        : "unknown";

  return {
    transaction_count: transactions.filter((t) => t.category !== "ignore").length,
    income,
    expenses,
    income_total,
    expense_total,
    necessary_total,
    discretionary_total,
    detected_salary_amount,
    detected_employment_type: employmentType,
    confidenceDistribution,
  };
}

function validate(extracted, aggregated, periodMonths) {
  const warning_fields = [];
  let status = extracted.status;
  let status_reason = extracted.status_reason;
  let retry_guidance = extracted.retry_guidance;

  if (status === "rejected") {
    return { status, status_reason, retry_guidance, warning_fields };
  }

  const txs = extracted.transactions ?? [];

  if (txs.length < 5) {
    return {
      status: "rejected",
      status_reason: "partial_statement",
      retry_guidance:
        "Výpis obsahuje příliš málo transakcí. Stáhni prosím celý měsíční výpis z internet bankingu.",
      warning_fields: [],
    };
  }

  for (const [cat, dist] of Object.entries(aggregated.confidenceDistribution)) {
    const total = dist.high + dist.medium + dist.low;
    if (total === 0) continue;
    const lowRatio = dist.low / total;
    if (lowRatio > 0.5 && total >= 2) {
      warning_fields.push(`${cat} (${dist.low}/${total} low)`);
    }
  }

  if (
    aggregated.detected_employment_type === "unknown" &&
    aggregated.income_total > 30000
  ) {
    warning_fields.push("income.salary not detected despite high income");
  }

  if (
    aggregated.income_total > 0 &&
    aggregated.expense_total > 0 &&
    aggregated.expense_total / aggregated.income_total > 3
  ) {
    warning_fields.push("expense/income ratio > 3 — suspicious");
  }

  const months = periodMonths ?? 1;
  const txPerMonth = txs.length / months;
  if (txPerMonth < 10) {
    warning_fields.push(
      `only ${Math.round(txPerMonth)} tx/month (typical: 30-60)`,
    );
  }

  if (warning_fields.length > 0 && status === "ok") {
    status = "warning";
  }

  return { status, status_reason, retry_guidance, warning_fields };
}

// ============================================================================
// PDF + Anthropic API
// ============================================================================

async function extractTextFromPdf(buffer) {
  const uint8 = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const pdf = await getDocumentProxy(uint8);
  const { text } = await extractText(pdf, { mergePages: true });
  return Array.isArray(text) ? text.join("\n") : text;
}

const PRICE = {
  [HAIKU_MODEL]: { in: 1.0, out: 5.0 }, // Claude Haiku 4.5: $1/$5 per 1M tokens
};

function cost(model, inTok, outTok) {
  const p = PRICE[model];
  return (inTok / 1e6) * p.in + (outTok / 1e6) * p.out;
}

async function callAnthropic(model, system, user) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 16384,
      system,
      tools: [extractTool],
      tool_choice: { type: "tool", name: "extract_bank_statement" },
      messages: [{ role: "user", content: user }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Anthropic API ${res.status}: ${errText}`);
  }

  const body = await res.json();
  const toolUse = body.content?.find((c) => c.type === "tool_use");
  if (!toolUse) {
    throw new Error(
      `Anthropic nevrátil tool_use. content: ${JSON.stringify(body.content).slice(0, 200)}`,
    );
  }

  return {
    data: toolUse.input,
    inputTokens: body.usage?.input_tokens ?? 0,
    outputTokens: body.usage?.output_tokens ?? 0,
    model,
    stopReason: body.stop_reason,
  };
}

async function extractV4Haiku(text, fileName) {
  const user = `Soubor: ${fileName}\n\nText výpisu:\n\n${text.slice(0, 80000)}`;
  return await callAnthropic(HAIKU_MODEL, PROMPT_V4, user);
}

// ============================================================================
// Pipeline per statement
// ============================================================================

async function processStatement(pdfPath) {
  const buffer = await readFile(pdfPath);
  const text = await extractTextFromPdf(buffer);
  const fileName = path.basename(pdfPath);

  const r = await extractV4Haiku(text, fileName);
  const agg = aggregate(r.data.transactions ?? []);
  const v = validate(r.data, agg, r.data.period_months);

  return {
    extracted: r.data,
    agg,
    validation: v,
    final: { ...r.data, ...agg, validation: v },
    modelUsed: HAIKU_MODEL,
    tokens: { input: r.inputTokens, output: r.outputTokens },
    cost: cost(HAIKU_MODEL, r.inputTokens, r.outputTokens),
    stopReason: r.stopReason,
  };
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const dlDir = path.join(os.homedir(), "Downloads");
  const all = await readdir(dlDir);
  const statements = all
    .filter((f) => /AirBank_vypis_Tomas_Novak_2024-\d{2}\.pdf$/i.test(f))
    .sort();

  console.log(`v4 Haiku 4.5 (claude-haiku-4-5) — ${statements.length} výpisů.\n`);

  const outDir = path.join(process.cwd(), "scripts", "extraction-results-v4-haiku");
  if (!existsSync(outDir)) await mkdir(outDir, { recursive: true });

  const results = [];
  let totalCost = 0;
  let totalIn = 0;
  let totalOut = 0;

  for (const file of statements) {
    const pdfPath = path.join(dlDir, file);
    const base = path.basename(file, ".pdf");
    try {
      const r = await processStatement(pdfPath);
      const v = r.final.validation;
      console.log(
        `[${file}] income ${r.final.income_total.toLocaleString("cs-CZ")} | ` +
          `nutné ${r.final.necessary_total.toLocaleString("cs-CZ")} | ` +
          `zbytné ${r.final.discretionary_total.toLocaleString("cs-CZ")} | ` +
          `tx ${r.final.transaction_count} | ${v.status} | ${r.tokens.input + r.tokens.output} tok | stop=${r.stopReason}`,
      );
      if (v.warning_fields.length) {
        console.log(`   warnings: ${v.warning_fields.join("; ")}`);
      }
      results.push({ file, ...r });
      totalCost += r.cost;
      totalIn += r.tokens.input;
      totalOut += r.tokens.output;
      await writeFile(
        path.join(outDir, `${base}.v4-haiku.json`),
        JSON.stringify(r, null, 2),
      );
    } catch (e) {
      console.error(`[${file}] CHYBA: ${e.message}`);
      results.push({ file, error: e.message });
    }
  }

  const ok = results.filter((r) => r.final);
  console.log("\n=== BREAKDOWN PER MĚSÍC ===");
  console.table(
    ok.map((r) => ({
      m: r.file.match(/2024-(\d{2})/)?.[1],
      salary: r.final.income.salary,
      housing: r.final.expenses.housing,
      food: r.final.expenses.food,
      transport: r.final.expenses.transport,
      sav: r.final.expenses.savings,
      dining: r.final.expenses.dining,
      subs: r.final.expenses.subscriptions,
      disc: r.final.expenses.discretionary,
      nec: r.final.necessary_total,
      zbyt: r.final.discretionary_total,
      tx: r.final.transaction_count,
      status: r.final.validation.status,
    })),
  );

  const avg = (key) =>
    Math.round(ok.reduce((s, r) => s + (r.final[key] ?? 0), 0) / ok.length);
  const avgCat = (cat) =>
    Math.round(
      ok.reduce((s, r) => s + (r.final.expenses[cat] ?? 0), 0) / ok.length,
    );
  const avgInc = (cat) =>
    Math.round(
      ok.reduce((s, r) => s + (r.final.income[cat] ?? 0), 0) / ok.length,
    );

  console.log("\n=== PRŮMĚR PER MĚSÍC ===");
  console.log(`Mzda:           ${avgInc("salary").toLocaleString("cs-CZ")} Kč`);
  console.log(`OSVČ:           ${avgInc("self_employed").toLocaleString("cs-CZ")} Kč`);
  console.log(`Bydlení:        ${avgCat("housing").toLocaleString("cs-CZ")} Kč`);
  console.log(`Potraviny:      ${avgCat("food").toLocaleString("cs-CZ")} Kč`);
  console.log(`Doprava:        ${avgCat("transport").toLocaleString("cs-CZ")} Kč`);
  console.log(`Pojištění:      ${avgCat("insurance").toLocaleString("cs-CZ")} Kč`);
  console.log(`Zdraví:         ${avgCat("healthcare").toLocaleString("cs-CZ")} Kč`);
  console.log(`Spoření:        ${avgCat("savings").toLocaleString("cs-CZ")} Kč`);
  console.log(`Restaurace:     ${avgCat("dining").toLocaleString("cs-CZ")} Kč`);
  console.log(`Předplatné:     ${avgCat("subscriptions").toLocaleString("cs-CZ")} Kč`);
  console.log(`Zbytné:         ${avgCat("discretionary").toLocaleString("cs-CZ")} Kč`);
  console.log("------");
  console.log(`SUMA NUTNÉ:     ${avg("necessary_total").toLocaleString("cs-CZ")} Kč`);
  console.log(`SUMA ZBYTNÉ:    ${avg("discretionary_total").toLocaleString("cs-CZ")} Kč`);
  console.log(`SUMA INCOME:    ${avg("income_total").toLocaleString("cs-CZ")} Kč`);
  console.log(`SUMA EXPENSE:   ${avg("expense_total").toLocaleString("cs-CZ")} Kč`);

  console.log("\n=== TOKENS & COST ===");
  console.log(`Vstup:  ${totalIn.toLocaleString("cs-CZ")} tok`);
  console.log(`Výstup: ${totalOut.toLocaleString("cs-CZ")} tok`);
  console.log(`Cost:   $${totalCost.toFixed(4)} (≈ ${(totalCost * 23.5).toFixed(2)} Kč) pro ${ok.length} výpisů`);
  console.log(`Per výpis: $${(totalCost / ok.length).toFixed(4)} (≈ ${((totalCost * 23.5) / ok.length).toFixed(2)} Kč)`);

  await writeFile(
    path.join(outDir, "_summary.json"),
    JSON.stringify(
      {
        model: HAIKU_MODEL,
        statements: ok.length,
        totalCostUsd: totalCost,
        totalCostCzk: totalCost * 23.5,
        perStatementCzk: (totalCost * 23.5) / ok.length,
        avgIncome: avg("income_total"),
        avgExpense: avg("expense_total"),
        avgNecessary: avg("necessary_total"),
        avgDiscretionary: avg("discretionary_total"),
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
