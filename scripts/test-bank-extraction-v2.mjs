#!/usr/bin/env node
/**
 * v2 prompt — bohaté schema:
 *  - income: salary, self_employed, rental, passive, other
 *  - expenses: housing, food, transport, dining, insurance, healthcare,
 *              savings, subscriptions, discretionary, other
 *  - necessary_total / discretionary_total (per EFA metodice)
 *  - detected_salary_amount + detected_employment_type
 *
 * Pošlu do GPT-4o stejný text z výpisu, ale s mnohem detailnějším promptem.
 */

import { readFile, writeFile, readdir } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { extractText, getDocumentProxy } from "unpdf";
import OpenAI from "openai";

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
// BANK_STATEMENT_PROMPT_V2 — robustní, structured, kategorizace
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
  Pokud výpis obsahuje "STORNO PLATBY" (refund) za nákup z TÉHOŽ období, NEPOČÍTEJ
  do income (sníží odpovídající expense). Pokud je refund z dřívějšího období,
  počítej do income.other.

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
  servis auta, dálniční známka. POZOR: taxi/Uber → dining (pokud výjimečné)
  nebo discretionary.
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

- **expenses.other** — Cokoliv jiného, co nesedí (poplatky, daň, alimenty,
  výběr ATM bez kontextu).
  POZOR: BANKOVNÍ POPLATKY ("POPLATEK ZA VEDENI", "ATM POPLATEK") → other.
  Výběr z bankomatu (hotovost) → other (nelze klasifikovat).

PRAVIDLA klasifikace:
1. Klasifikuj POUZE podle popisu transakce. Když nejsi jistá → expenses.other.
2. Restaurační platba TĚSNĚ po pracovní době jednou týdně = dining (zbytné).
   Restaurace 1× za pár dnů s velkou částkou = dining (zbytné).
3. Pokud výpis obsahuje souhrnný řádek "Připsáno celkem" / "Odepsáno celkem",
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

const jsonSchemaV2 = {
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

async function extractTextFromPdf(buffer) {
  const uint8 = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const pdf = await getDocumentProxy(uint8);
  const { text } = await extractText(pdf, { mergePages: true });
  return Array.isArray(text) ? text.join("\n") : text;
}

async function extractV2(text, fileName) {
  const start = Date.now();
  const userPrompt = `Soubor: ${fileName}\n\nText výpisu:\n\n${text.slice(0, 80000)}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: BANK_STATEMENT_PROMPT_V2 },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_schema", json_schema: jsonSchemaV2 },
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("Prázdná odpověď OpenAI");
  return {
    data: JSON.parse(raw),
    inputTokens: completion.usage?.prompt_tokens ?? 0,
    outputTokens: completion.usage?.completion_tokens ?? 0,
    totalTokens: completion.usage?.total_tokens ?? 0,
    latencyMs: Date.now() - start,
  };
}

async function main() {
  const dlDir = path.join(os.homedir(), "Downloads");
  const all = await readdir(dlDir);
  const statements = all
    .filter((f) => /AirBank_vypis_Tomas_Novak_2024-\d{2}\.pdf$/i.test(f))
    .sort();

  console.log(`Spouštím v2 prompt na ${statements.length} výpisech.\n`);

  const outDir = path.join(process.cwd(), "scripts", "extraction-results-v2");
  await readdir(outDir).catch(async () => {
    const { mkdir } = await import("node:fs/promises");
    await mkdir(outDir, { recursive: true });
  });

  const results = [];

  for (const fname of statements) {
    process.stdout.write(`[${fname}] ... `);
    const buf = await readFile(path.join(dlDir, fname));
    const text = await extractTextFromPdf(buf);

    try {
      const r = await extractV2(text, fname);
      console.log(
        `OK (${r.totalTokens} tok, ${r.latencyMs}ms) — income ${r.data.income_total.toLocaleString("cs-CZ")} | nutné ${r.data.necessary_total.toLocaleString("cs-CZ")} | zbytné ${r.data.discretionary_total.toLocaleString("cs-CZ")} | mzda? ${r.data.detected_salary_amount ?? "null"}`,
      );

      const base = fname.replace(/\.pdf$/i, "");
      await writeFile(
        path.join(outDir, `${base}.v2.json`),
        JSON.stringify(r.data, null, 2),
        "utf-8",
      );

      results.push({ fname, ok: true, ...r });
    } catch (err) {
      console.log(`FAIL: ${err.message}`);
      results.push({ fname, ok: false, error: err.message });
    }
  }

  // ----- Souhrn -----
  console.log("\n=== BREAKDOWN PER MĚSÍC ===");
  console.table(
    results
      .filter((r) => r.ok)
      .map((r) => ({
        m: r.fname.match(/2024-(\d{2})/)[1],
        salary: r.data.income.salary,
        rental: r.data.income.rental,
        passive: r.data.income.passive,
        other: r.data.income.other,
        housing: r.data.expenses.housing,
        food: r.data.expenses.food,
        savings: r.data.expenses.savings,
        ins: r.data.expenses.insurance,
        dining: r.data.expenses.dining,
        subs: r.data.expenses.subscriptions,
        disc: r.data.expenses.discretionary,
        nec: r.data.necessary_total,
        zbyt: r.data.discretionary_total,
        emp: r.data.detected_employment_type,
      })),
  );

  // Průměr per kategorie
  const ok = results.filter((r) => r.ok);
  const sumCat = (path) =>
    ok.reduce((s, r) => s + path.split(".").reduce((o, k) => o[k], r.data), 0);

  console.log("\n=== PRŮMĚR PER MĚSÍC (přes 12 měsíců) ===");
  console.log(`Mzda:           ${Math.round(sumCat("income.salary") / 12).toLocaleString("cs-CZ")} Kč`);
  console.log(`OSVČ příjmy:    ${Math.round(sumCat("income.self_employed") / 12).toLocaleString("cs-CZ")} Kč`);
  console.log(`Nájem:          ${Math.round(sumCat("income.rental") / 12).toLocaleString("cs-CZ")} Kč`);
  console.log(`Pasivní:        ${Math.round(sumCat("income.passive") / 12).toLocaleString("cs-CZ")} Kč`);
  console.log(`Other income:   ${Math.round(sumCat("income.other") / 12).toLocaleString("cs-CZ")} Kč`);
  console.log("------");
  console.log(`Bydlení:        ${Math.round(sumCat("expenses.housing") / 12).toLocaleString("cs-CZ")} Kč`);
  console.log(`Potraviny:      ${Math.round(sumCat("expenses.food") / 12).toLocaleString("cs-CZ")} Kč`);
  console.log(`Doprava:        ${Math.round(sumCat("expenses.transport") / 12).toLocaleString("cs-CZ")} Kč`);
  console.log(`Pojištění:      ${Math.round(sumCat("expenses.insurance") / 12).toLocaleString("cs-CZ")} Kč`);
  console.log(`Zdraví:         ${Math.round(sumCat("expenses.healthcare") / 12).toLocaleString("cs-CZ")} Kč`);
  console.log(`Spoření:        ${Math.round(sumCat("expenses.savings") / 12).toLocaleString("cs-CZ")} Kč`);
  console.log(`Restaurace:     ${Math.round(sumCat("expenses.dining") / 12).toLocaleString("cs-CZ")} Kč`);
  console.log(`Předplatné:     ${Math.round(sumCat("expenses.subscriptions") / 12).toLocaleString("cs-CZ")} Kč`);
  console.log(`Zbytné:         ${Math.round(sumCat("expenses.discretionary") / 12).toLocaleString("cs-CZ")} Kč`);
  console.log(`Other expense:  ${Math.round(sumCat("expenses.other") / 12).toLocaleString("cs-CZ")} Kč`);
  console.log("------");
  console.log(`SUMA NUTNÉ:     ${Math.round(sumCat("necessary_total") / 12).toLocaleString("cs-CZ")} Kč`);
  console.log(`SUMA ZBYTNÉ:    ${Math.round(sumCat("discretionary_total") / 12).toLocaleString("cs-CZ")} Kč`);
  console.log(`SUMA INCOME:    ${Math.round(sumCat("income_total") / 12).toLocaleString("cs-CZ")} Kč`);
  console.log(`SUMA EXPENSE:   ${Math.round(sumCat("expense_total") / 12).toLocaleString("cs-CZ")} Kč`);

  const totalIn = ok.reduce((s, r) => s + r.inputTokens, 0);
  const totalOut = ok.reduce((s, r) => s + r.outputTokens, 0);
  const usd = (totalIn / 1e6) * 2.5 + (totalOut / 1e6) * 10.0;
  console.log("\n=== TOKENS & COST ===");
  console.log(`Vstup:  ${totalIn.toLocaleString("cs-CZ")} tok`);
  console.log(`Výstup: ${totalOut.toLocaleString("cs-CZ")} tok`);
  console.log(`Cost:   $${usd.toFixed(4)} (≈ ${(usd * 23.5).toFixed(2)} Kč) pro ${ok.length} výpisů`);
  console.log(`Per výpis: $${(usd / ok.length).toFixed(4)} (≈ ${((usd * 23.5) / ok.length).toFixed(2)} Kč)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
