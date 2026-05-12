#!/usr/bin/env node
/**
 * v3 prompt — robustní pro GPT-4o-mini.
 *
 * Architektura:
 *   Pass 1 (extract):
 *     • mini vypíše VŠECHNY transakce explicitně (date, desc, amount, category, conf)
 *     • + agregace per kategorie
 *     • + overall_confidence
 *   Pass 2 (audit):
 *     • mini dostane Pass 1 output + originální text
 *     • najde chybějící transakce + opraví low-confidence kategorie
 *     • vrací corrected breakdown + new confidence
 *   TS Validation gate:
 *     • suma kategorií ≈ expense_total ± 2 %
 *     • salary > 0 u employee
 *     • transaction_count ≥ 20 (full měsíc)
 *     • income/expense ratio sanity
 *   Fallback:
 *     • Pokud final confidence < 0.85 OR validation fail → GPT-4o single-pass
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
// ANCHOR PATTERNS — konkrétní české firmy / banky / služby
// Mini má tendenci klasifikovat na "intuici" — anchor patterns ho přinutí
// rozpoznat known patterns deterministicky.
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
  ROSSMANN, DROGERIE, TESCO, ALBERT, KAUFLAND, LIDL, BILLA, GLOBUS,
  MAKRO, PENNY, NORMA, COOP, ŽABKA, FLOP, SAVE,
  PEKAŘSTVÍ, ŘEZNICTVÍ, FARMÁŘSKÉ, BIOMARKET, ROHLÍK, KOŠÍK

expenses.transport:
  BENZINA, ORLEN, OMV, MOL, SHELL, BP, EUROOIL, PRIM,
  ŠKODA AUTO, SERVIS AUTO, PNEU,
  DPP, DPB, ROPID, LÍTAČKA, JÍZDENKA,
  ARRIVA, REGIOJET, STUDENT AGENCY, ČD, ČESKÉ DRÁHY,
  TAXI, BOLT (jen jízdy, ne food), LIFTAGO, UBER,
  STK, POVINNÉ RUČENÍ, HAVARIJNÍ POJIŠTĚNÍ

expenses.insurance:
  ALLIANZ, GENERALI, KOOPERATIVA, ČESKÁ POJIŠŤOVNA, UNIQA, AXA, ERGO,
  ČSOB POJIŠŤOVNA, MAXIMA, METLIFE, NN POJIŠŤOVNA, AEGON,
  ŽIVOTNÍ POJIŠTĚNÍ, ÚRAZOVÉ POJIŠTĚNÍ, RIZIKOVÉ POJ,
  (ALE NE povinné ručení/havarijko → to je transport,
   NE pojištění nemovitosti → to je housing)

expenses.healthcare:
  NEMOCNICE, POLIKLINIKA, LÉKAŘ, ZUBNÍ, DENTAL,
  LÉKÁRNA, BENU, DR.MAX, PILULKA, ZENTIVA,
  OPTIKA, BRÝLE,
  VZP, OZP, ZPMV, RBP, ZAMĚSTNANECKÁ POJIŠŤOVNA (pokud platí klient sám)

expenses.savings:
  REVOLUT (transfer), WISE (transfer), TRADING212, DEGIRO, ETORO,
  PORTU, FONDEE, INDIGO, INVESTOWN,
  PENZIJNÍ FOND, DPS, DSS, doplňkové penzijní spoření,
  STAVEBNÍ SPOŘENÍ, MODRÁ PYRAMIDA, RAIFFEISEN STAVEBNÍ,
  XTB, SAXO BANK, INTERACTIVE BROKERS,
  ETF, AKCIE, FOND, MUTUAL FUND,
  PŘEVOD NA SPOŘENÍ, převod na spořicí, savings account transfer

expenses.dining:
  MCDONALD, KFC, BURGER KING, SUBWAY, STARBUCKS, COSTA, PIZZA HUT,
  WOLT, FOODORA, BOLT FOOD, DAMEJÍDLO, NESNĚZENO,
  RESTAURACE, BISTRO, CAFE, KAVÁRNA, HOSPODA, PIVOVAR, BAR,
  ZMRZLINA, COFFEE, ESPRESSO

expenses.subscriptions:
  NETFLIX, SPOTIFY, HBO MAX, DISNEY+, APPLE TV, AMAZON PRIME,
  APPLE.COM/BILL, ICLOUD, GOOGLE STORAGE, ONEDRIVE, DROPBOX,
  OPENAI, ANTHROPIC, CHATGPT,
  ADOBE, MICROSOFT 365, OFFICE,
  NOTION, FIGMA, GITHUB, JETBRAINS,
  STRAVA, FITNESS, MULTISPORT, ACTIVEPASS,
  PŘEDPLATNÉ, MEMBERSHIP

expenses.discretionary:
  ZALANDO, ZARA, H&M, MANGO, RESERVED, NEW YORKER, BERSHKA,
  ALZA, MALL, NOTINO, DOUGLAS, MARIONNAUD,
  AMAZON (kromě Prime), AMZN MKTP,
  IKEA, JYSK, MÖBELIX, KIKA, ASKO,
  DATART, ELECTRO WORLD, OKAY,
  DECATHLON, INTERSPORT, A3 SPORT,
  DM (drogerie obecná), TETA, SUPER ZOO,
  KINO, DIVADLO, KONCERT, FESTIVAL, TICKETPORTAL, GOOUT,
  CESTOVKA, BOOKING, AIRBNB, EXPEDIA, LETENKY, RYANAIR, WIZZAIR,
  HRACKY, DARKY, KVĚTINY,
  KADEŘNÍK, MASÁŽ, KOSMETIKA, NEHTY, SOLÁRIUM, WELLNESS

expenses.other:
  Pokud transakce nepatří jasně do žádné výše, dej do other + low confidence.
  Bankovní poplatky < 100 Kč ignoruj (zápis do other s amount=0).
`;

// ============================================================================
// PROMPT V3 — Pass 1: explicit transaction listing
// ============================================================================

const PROMPT_V3_EXTRACT = `Jsi extraktor a kategorizátor finančních dat z českých bankovních výpisů.
Tvůj výstup jde DIRECTLY do EFA výpočtu zajištění klienta (metodika 4FIN).
Přesnost je kritická. NESMÍŠ přehlédnout žádnou transakci.

═══════════════════════════════════════════════════════════════════════════════
 POSTUP — krok za krokem
═══════════════════════════════════════════════════════════════════════════════

KROK 1: Identifikuj období výpisu (period_months) a banku (bank_name).

KROK 2: Vypiš VŠECHNY transakce do pole "transactions". Pro každou:
   - date: ISO datum "YYYY-MM-DD" (pokud lze)
   - description: krátký popis transakce (max 60 znaků)
   - amount: částka v Kč (pozitivní = příjem, negativní = výdaj)
   - category: jedna z: income.salary | income.self_employed | income.rental |
     income.passive | income.other | expenses.housing | expenses.food |
     expenses.transport | expenses.insurance | expenses.healthcare |
     expenses.savings | expenses.dining | expenses.subscriptions |
     expenses.discretionary | expenses.other | ignore (poplatek <100 Kč,
     mezibankovní převod mezi vlastními účty, IB transfer)
   - confidence: 0.0–1.0, jak si jsi jistý kategorií

⚠️ KRITICKÉ: VYPIŠ KAŽDOU TRANSAKCI VIDITELNOU VE VÝPISU.
Když tě láká „tohle je jen drobnost, přeskočím" → NE, vypiš ji.
Cíl: počet řádků v transactions = počet transakcí ve výpisu.

KROK 3: Agreguj sumy per kategorie do income/expenses objektů.
   • Suma absolutních hodnot transakcí v dané kategorii.
   • Kategorie "ignore" se nepočítá nikde.

KROK 4: Spočítej totals:
   • income_total = sum(income.*)
   • expense_total = sum(expenses.*)
   • necessary_total = housing + food + transport + insurance + healthcare + savings
   • discretionary_total = dining + subscriptions + discretionary

KROK 5: Detected_salary_amount = největší recurring příjem označený jako
   income.salary (typicky stejná částka 1× měsíčně). Pokud nejsou žádné
   pravidelné mzdy → null. detected_employment_type = "employee" pokud je
   salary, "selfemployed" pokud převažují self_employed faktury, jinak
   "unknown".

KROK 6: Spočítej overall_confidence (0.0–1.0):
   • Začni s 1.0.
   • Odečti 0.1 pokud > 20 % transakcí má confidence < 0.7.
   • Odečti 0.1 pokud transaction_count < 20 (málo dat).
   • Odečti 0.15 pokud nebyla detekována žádná mzda u zjevně zaměstnaneckého
     výpisu (pravidelné velké platby z firemního IBAN).
   • Odečti 0.1 pokud necessary + discretionary se výrazně liší od
     expense_total (suma kategorií neodpovídá total).

${ANCHORS}

═══════════════════════════════════════════════════════════════════════════════
 PRAVIDLA
═══════════════════════════════════════════════════════════════════════════════

• Všechny částky v Kč, zaokrouhlené na celé Kč.
• Necessary kategorie: housing, food, transport, insurance, healthcare, savings.
• Discretionary: dining, subscriptions, discretionary.
• "other" výdaje se NEPOČÍTÁ do necessary ani discretionary (jen do expense_total).
• Mezibankovní převody mezi vlastními účty (např. „PŘEVOD NA SPOŘICÍ ÚČET")
  klasifikuj jako expenses.savings (jde to do spoření). Ale skutečně interní
  „převod z účtu A na účet B téhož klienta" → ignore.
• Pokud je text nečitelný / poškozený → vrať null hodnoty s overall_confidence < 0.5.

Vrať POUZE validní JSON dle dodaného schématu.`;

// ============================================================================
// PROMPT V3 — Pass 2: AUDIT (najdi chybějící, opravu confidence)
// ============================================================================

const PROMPT_V3_AUDIT = `Jsi auditor finančních dat. Dostáváš:
  (A) ORIGINÁLNÍ TEXT bankovního výpisu
  (B) PŘEDCHOZÍ EXTRAKCI — pole "transactions" + agregace.

Tvoje úkoly:

1. **Najdi chybějící transakce.** Projdi originální text a porovnej s polem
   "transactions". Pokud najdeš transakce, které tam chybí, doplň je.
   Hledej zejména:
   - PAYPAL, AMZN MKTP, online platby
   - Jednorázové nákupy < 500 Kč
   - Drobné platby kartou v zahraničí
   - Inkasní platby (SIPO, energie, telco)

2. **Opravu nízkou confidence.** U transakcí s confidence < 0.7 navrhni
   přesnější kategorii. Pokud opravdu nejde určit, ponech jako "other"
   ale s confidence ~0.5.

3. **Přepočítej agregace.** Sumy per kategorie, totals, necessary/discretionary.

4. **Vypočítej novou overall_confidence:**
   • Pokud jsi NEnašel chybějící transakce a všechny low-conf jsi reklasifikoval
     do high-conf → confidence z Pass 1 + 0.1 (max 1.0).
   • Pokud jsi našel < 3 chybějící → confidence z Pass 1.
   • Pokud jsi našel ≥ 3 chybějící → confidence z Pass 1 − 0.1.
   • Pokud jsi musel ponechat > 20 % transakcí v "other" → confidence − 0.1.

${ANCHORS}

Vrať POUZE validní JSON dle stejného schématu jako Pass 1, s opravenými
hodnotami. Pole "audit_changes" naplň lidsky čitelným popisem co jsi změnil
(pro debug log).`;

// ============================================================================
// JSON SCHEMA V3
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
    confidence: { type: "number" },
  },
};

const incomeObj = {
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
};

const expensesObj = {
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
};

const baseSchemaProps = {
  period_months: { type: ["number", "null"] },
  bank_name: { type: ["string", "null"] },
  transaction_count: { type: ["integer", "null"] },
  transactions: { type: "array", items: transactionSchema },
  income: incomeObj,
  expenses: expensesObj,
  necessary_total: { type: "integer" },
  discretionary_total: { type: "integer" },
  income_total: { type: "integer" },
  expense_total: { type: "integer" },
  detected_salary_amount: { type: ["integer", "null"] },
  detected_employment_type: {
    type: "string",
    enum: ["employee", "selfemployed", "unknown"],
  },
  overall_confidence: { type: "number" },
};

const baseRequired = [
  "period_months",
  "bank_name",
  "transaction_count",
  "transactions",
  "income",
  "expenses",
  "necessary_total",
  "discretionary_total",
  "income_total",
  "expense_total",
  "detected_salary_amount",
  "detected_employment_type",
  "overall_confidence",
];

const jsonSchemaExtract = {
  name: "bank_statement_v3_extract",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: baseRequired,
    properties: baseSchemaProps,
  },
};

const jsonSchemaAudit = {
  name: "bank_statement_v3_audit",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [...baseRequired, "audit_changes"],
    properties: {
      ...baseSchemaProps,
      audit_changes: { type: "string" },
    },
  },
};

// ============================================================================
// PDF text extraction
// ============================================================================

async function extractTextFromPdf(buffer) {
  const uint8 = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const pdf = await getDocumentProxy(uint8);
  const { text } = await extractText(pdf, { mergePages: true });
  return Array.isArray(text) ? text.join("\n") : text;
}

// ============================================================================
// Cost calc
// ============================================================================

const PRICE = {
  "gpt-4o-mini": { in: 0.15, out: 0.6 },
  "gpt-4o": { in: 2.5, out: 10.0 },
};

function cost(model, inTok, outTok) {
  const p = PRICE[model];
  return (inTok / 1e6) * p.in + (outTok / 1e6) * p.out;
}

// ============================================================================
// Pipeline
// ============================================================================

async function callOpenAI(model, system, user, schema) {
  const start = Date.now();
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
    latencyMs: Date.now() - start,
    model,
  };
}

async function extractPass1(text, fileName) {
  const user = `Soubor: ${fileName}\n\nText výpisu:\n\n${text.slice(0, 80000)}`;
  return await callOpenAI(
    "gpt-4o-mini",
    PROMPT_V3_EXTRACT,
    user,
    jsonSchemaExtract,
  );
}

async function auditPass2(text, fileName, pass1Data) {
  const user = `Soubor: ${fileName}

ORIGINÁLNÍ TEXT VÝPISU:
${text.slice(0, 70000)}

PŘEDCHOZÍ EXTRAKCE (Pass 1):
${JSON.stringify(pass1Data, null, 2)}

Tvůj úkol: audit, najdi chybějící transakce, oprav low-confidence kategorie.`;
  return await callOpenAI("gpt-4o-mini", PROMPT_V3_AUDIT, user, jsonSchemaAudit);
}

async function fallbackToGpt4o(text, fileName) {
  const user = `Soubor: ${fileName}\n\nText výpisu:\n\n${text.slice(0, 80000)}`;
  return await callOpenAI("gpt-4o", PROMPT_V3_EXTRACT, user, jsonSchemaExtract);
}

// ============================================================================
// TS Validation gate
// ============================================================================

function validate(d) {
  const errors = [];
  const sumExpenseCats =
    d.expenses.housing +
    d.expenses.food +
    d.expenses.transport +
    d.expenses.insurance +
    d.expenses.healthcare +
    d.expenses.savings +
    d.expenses.dining +
    d.expenses.subscriptions +
    d.expenses.discretionary +
    d.expenses.other;
  if (Math.abs(sumExpenseCats - d.expense_total) > Math.max(50, d.expense_total * 0.02)) {
    errors.push(
      `expense category sum (${sumExpenseCats}) ≠ expense_total (${d.expense_total})`,
    );
  }
  if (
    d.detected_employment_type === "employee" &&
    (!d.detected_salary_amount || d.detected_salary_amount < 1000)
  ) {
    errors.push("employee but no salary detected");
  }
  if (d.transaction_count != null && d.transaction_count < 15) {
    errors.push(`transaction_count too low (${d.transaction_count})`);
  }
  if (d.income_total > 0 && d.expense_total > 0) {
    const ratio = d.expense_total / d.income_total;
    if (ratio < 0.2 || ratio > 3.0) {
      errors.push(`expense/income ratio suspicious (${ratio.toFixed(2)})`);
    }
  }
  return errors;
}

// ============================================================================
// Main
// ============================================================================

async function processStatement(pdfPath) {
  const buffer = await readFile(pdfPath);
  const text = await extractTextFromPdf(buffer);

  // Pass 1
  const p1 = await extractPass1(text, path.basename(pdfPath));

  // Pass 2 (audit)
  const p2 = await auditPass2(text, path.basename(pdfPath), p1.data);

  // Validation
  const errors = validate(p2.data);
  const lowConf = p2.data.overall_confidence < 0.85;
  const needsFallback = lowConf || errors.length > 0;

  let final = p2.data;
  let fallback = null;
  let modelUsed = "gpt-4o-mini (pass1+audit)";
  let totalIn = p1.inputTokens + p2.inputTokens;
  let totalOut = p1.outputTokens + p2.outputTokens;
  let totalCost = cost("gpt-4o-mini", totalIn, totalOut);

  if (needsFallback) {
    fallback = await fallbackToGpt4o(text, path.basename(pdfPath));
    final = fallback.data;
    modelUsed = "gpt-4o (fallback)";
    totalIn += fallback.inputTokens;
    totalOut += fallback.outputTokens;
    totalCost += cost("gpt-4o", fallback.inputTokens, fallback.outputTokens);
  }

  return {
    pass1: p1.data,
    audit: p2.data,
    fallback: fallback ? fallback.data : null,
    final,
    audit_changes: p2.data.audit_changes ?? "",
    validation_errors: errors,
    confidence: p2.data.overall_confidence,
    needsFallback,
    modelUsed,
    tokens: { input: totalIn, output: totalOut },
    cost: totalCost,
  };
}

async function main() {
  const dlDir = path.join(os.homedir(), "Downloads");
  const all = await readdir(dlDir);
  const statements = all
    .filter((f) => /AirBank_vypis_Tomas_Novak_2024-\d{2}\.pdf$/i.test(f))
    .sort();

  console.log(`v3 mini + audit + fallback — ${statements.length} výpisů.\n`);

  const outDir = path.join(process.cwd(), "scripts", "extraction-results-v3-mini");
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
      const flag = r.needsFallback ? "⚠️ FALLBACK" : "✓ mini";
      console.log(
        `[${file}] ${flag}  income ${r.final.income_total.toLocaleString("cs-CZ")} | ` +
          `nutné ${r.final.necessary_total.toLocaleString("cs-CZ")} | ` +
          `zbytné ${r.final.discretionary_total.toLocaleString("cs-CZ")} | ` +
          `conf ${r.confidence.toFixed(2)} | ${r.tokens.input + r.tokens.output} tok`,
      );
      if (r.validation_errors.length) {
        console.log(`   errors: ${r.validation_errors.join("; ")}`);
      }
      results.push({ file, ...r });
      totalCost += r.cost;
      totalIn += r.tokens.input;
      totalOut += r.tokens.output;
      if (r.needsFallback) fallbackCount++;
      await writeFile(
        path.join(outDir, `${base}.v3.json`),
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
      ins: r.final.expenses.insurance,
      health: r.final.expenses.healthcare,
      sav: r.final.expenses.savings,
      dining: r.final.expenses.dining,
      subs: r.final.expenses.subscriptions,
      disc: r.final.expenses.discretionary,
      nec: r.final.necessary_total,
      zbyt: r.final.discretionary_total,
      conf: r.confidence?.toFixed(2),
      model: r.needsFallback ? "4o" : "mini",
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
        perStatementUsd: totalCost / ok.length,
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
