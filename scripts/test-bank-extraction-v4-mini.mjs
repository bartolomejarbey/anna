#!/usr/bin/env node
/**
 * v4 prompt — mini jako per-transaction klasifikátor, TS dělá agregaci.
 *
 * Klíčová změna oproti v3:
 *   • Mini vrací POUZE transactions[] array (žádné agregáty)
 *   • TS deterministicky sečte transactions per category → 100% konzistentní totals
 *   • Validation gate je v TS, ne v mini (mini neumí kontrolovat sám sebe)
 *
 * Output 3-state (Finatiq-style):
 *   • ok → high confidence, full data → ulož
 *   • warning → některá pole nejistá, ulož + poradce zkontroluje
 *   • rejected → text nečitelný / fundamentálně chybný → eskaluj na 4o
 *
 * Architektura:
 *   1. Mini Pass 1: extract transactions[] + meta (bank, period, status)
 *   2. TS aggregation: deterministicky spočítej rich breakdown
 *   3. TS validation: per-category confidence distribution
 *   4. Fallback na 4o jen pokud TS validation = warning/rejected
 */

import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { extractText, getDocumentProxy } from "unpdf";
import OpenAI from "openai";

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
if (!process.env.OPENAI_API_KEY) {
  console.error("Chybí OPENAI_API_KEY");
  process.exit(1);
}
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ============================================================================
// ANCHOR PATTERNS
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
// PROMPT V4 — mini jen klasifikuje transakce, ŽÁDNÉ agregace
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

Vrať POUZE validní JSON dle dodaného schématu.`;

// ============================================================================
// JSON SCHEMA V4
// ============================================================================

const transactionSchema = {
  type: "object",
  additionalProperties: false,
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
};

const jsonSchemaV4 = {
  name: "bank_statement_v4",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "period_months",
      "bank_name",
      "transactions",
      "status",
      "status_reason",
      "retry_guidance",
    ],
    properties: {
      period_months: { type: ["number", "null"] },
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
// TS aggregation — deterministic, never wrong
// ============================================================================

const _INCOME_CATS = [
  "income.salary",
  "income.self_employed",
  "income.rental",
  "income.passive",
  "income.other",
];
const _EXPENSE_CATS = [
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
];
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

  // Detect salary (recurring largest income.salary)
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

// ============================================================================
// TS validation — 3-state output + warning_fields list
// ============================================================================

function validate(extracted, aggregated, periodMonths) {
  const warning_fields = [];
  let status = extracted.status; // ok | warning | rejected from mini
  let status_reason = extracted.status_reason;
  let retry_guidance = extracted.retry_guidance;

  // Hard rejected from mini → propagate
  if (status === "rejected") {
    return { status, status_reason, retry_guidance, warning_fields };
  }

  // TS-level checks
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

  // Per-category low confidence check
  for (const [cat, dist] of Object.entries(aggregated.confidenceDistribution)) {
    const total = dist.high + dist.medium + dist.low;
    if (total === 0) continue;
    const lowRatio = dist.low / total;
    if (lowRatio > 0.5 && total >= 2) {
      warning_fields.push(`${cat} (${dist.low}/${total} low)`);
    }
  }

  // Missing salary for what looks like an employee statement
  // (Heuristic: large recurring credit → salary expected)
  if (
    aggregated.detected_employment_type === "unknown" &&
    aggregated.income_total > 30000
  ) {
    warning_fields.push("income.salary not detected despite high income");
  }

  // Expense/income ratio sanity (jen extreme case)
  if (
    aggregated.income_total > 0 &&
    aggregated.expense_total > 0 &&
    aggregated.expense_total / aggregated.income_total > 3
  ) {
    warning_fields.push("expense/income ratio > 3 — suspicious");
  }

  // Minimum transactions threshold per month
  const months = periodMonths ?? 1;
  const txPerMonth = txs.length / months;
  if (txPerMonth < 10) {
    warning_fields.push(
      `only ${Math.round(txPerMonth)} tx/month (typical: 30-60)`,
    );
  }

  // If we found warning fields → status = warning
  if (warning_fields.length > 0 && status === "ok") {
    status = "warning";
  }

  return { status, status_reason, retry_guidance, warning_fields };
}

// ============================================================================
// PDF + API helpers
// ============================================================================

async function extractTextFromPdf(buffer) {
  const uint8 = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const pdf = await getDocumentProxy(uint8);
  const { text } = await extractText(pdf, { mergePages: true });
  return Array.isArray(text) ? text.join("\n") : text;
}

const PRICE = {
  "gpt-4o-mini": { in: 0.15, out: 0.6 },
  "gpt-4o": { in: 2.5, out: 10.0 },
};

function cost(model, inTok, outTok) {
  const p = PRICE[model];
  return (inTok / 1e6) * p.in + (outTok / 1e6) * p.out;
}

async function callOpenAI(model, system, user, schema) {
  const completion = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: { type: "json_schema", json_schema: schema },
  });
  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("Prázdná odpověď OpenAI");
  return {
    data: JSON.parse(raw),
    inputTokens: completion.usage?.prompt_tokens ?? 0,
    outputTokens: completion.usage?.completion_tokens ?? 0,
    model,
  };
}

async function extractV4(text, fileName, model) {
  const user = `Soubor: ${fileName}\n\nText výpisu:\n\n${text.slice(0, 80000)}`;
  return await callOpenAI(model, PROMPT_V4, user, jsonSchemaV4);
}

// ============================================================================
// Main pipeline per statement
// ============================================================================

async function processStatement(pdfPath) {
  const buffer = await readFile(pdfPath);
  const text = await extractTextFromPdf(buffer);
  const fileName = path.basename(pdfPath);

  // Pass 1: mini
  const r1 = await extractV4(text, fileName, "gpt-4o-mini");
  const agg1 = aggregate(r1.data.transactions ?? []);
  const v1 = validate(r1.data, agg1, r1.data.period_months);

  let final = { ...r1.data, ...agg1, validation: v1 };
  let modelUsed = "gpt-4o-mini";
  let totalIn = r1.inputTokens;
  let totalOut = r1.outputTokens;
  let totalCost = cost("gpt-4o-mini", r1.inputTokens, r1.outputTokens);
  let fallback = null;

  // Fallback if warning OR rejected
  if (v1.status === "warning" || v1.status === "rejected") {
    fallback = await extractV4(text, fileName, "gpt-4o");
    const agg2 = aggregate(fallback.data.transactions ?? []);
    const v2 = validate(fallback.data, agg2, fallback.data.period_months);
    final = { ...fallback.data, ...agg2, validation: v2 };
    modelUsed = "gpt-4o (fallback)";
    totalIn += fallback.inputTokens;
    totalOut += fallback.outputTokens;
    totalCost += cost("gpt-4o", fallback.inputTokens, fallback.outputTokens);
  }

  return {
    mini_pass: { data: r1.data, agg: agg1, validation: v1 },
    fallback_pass: fallback
      ? { data: fallback.data, agg: aggregate(fallback.data.transactions ?? []) }
      : null,
    final,
    modelUsed,
    didFallback: fallback !== null,
    tokens: { input: totalIn, output: totalOut },
    cost: totalCost,
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

  console.log(`v4 mini-as-classifier + TS-aggregation — ${statements.length} výpisů.\n`);

  const outDir = path.join(process.cwd(), "scripts", "extraction-results-v4-mini");
  if (!existsSync(outDir)) await mkdir(outDir, { recursive: true });

  const results = [];
  let totalCost = 0;
  let totalIn = 0;
  let totalOut = 0;
  let fallbackCount = 0;

  for (const file of statements) {
    const pdfPath = path.join(dlDir, file);
    const base = path.basename(file, ".pdf");
    try {
      const r = await processStatement(pdfPath);
      const flag = r.didFallback ? "⚠️ FALLBACK" : "✓ mini";
      const v = r.final.validation;
      console.log(
        `[${file}] ${flag}  income ${r.final.income_total.toLocaleString("cs-CZ")} | ` +
          `nutné ${r.final.necessary_total.toLocaleString("cs-CZ")} | ` +
          `zbytné ${r.final.discretionary_total.toLocaleString("cs-CZ")} | ` +
          `tx ${r.final.transaction_count} | ${v.status} | ${r.tokens.input + r.tokens.output} tok`,
      );
      if (v.warning_fields.length) {
        console.log(`   warnings: ${v.warning_fields.join("; ")}`);
      }
      results.push({ file, ...r });
      totalCost += r.cost;
      totalIn += r.tokens.input;
      totalOut += r.tokens.output;
      if (r.didFallback) fallbackCount++;
      await writeFile(
        path.join(outDir, `${base}.v4.json`),
        JSON.stringify(r, null, 2),
      );
    } catch (e) {
      console.error(`[${file}] CHYBA: ${e.message}`);
      results.push({ file, error: e.message });
    }
  }

  // === SUMMARY ===
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
      model: r.didFallback ? "4o" : "mini",
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

  console.log("\n=== FALLBACK STATS ===");
  console.log(`Fallback na 4o: ${fallbackCount}/${ok.length} výpisů (${Math.round((fallbackCount / ok.length) * 100)}%)`);

  console.log("\n=== TOKENS & COST ===");
  console.log(`Vstup:  ${totalIn.toLocaleString("cs-CZ")} tok`);
  console.log(`Výstup: ${totalOut.toLocaleString("cs-CZ")} tok`);
  console.log(`Cost:   $${totalCost.toFixed(4)} (≈ ${(totalCost * 23.5).toFixed(2)} Kč) pro ${ok.length} výpisů`);
  console.log(`Per výpis: $${(totalCost / ok.length).toFixed(4)} (≈ ${((totalCost * 23.5) / ok.length).toFixed(2)} Kč)`);

  await writeFile(
    path.join(outDir, "_summary.json"),
    JSON.stringify(
      {
        statements: ok.length,
        fallbacks: fallbackCount,
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
