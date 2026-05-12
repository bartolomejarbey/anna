#!/usr/bin/env node
// Standalone test: spustit produkční extrakci proti AirBank výpisům v ~/Downloads.
// 1:1 prompt z src/lib/finplan/extract-documents.ts.

import { readFile, writeFile, readdir } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { extractText, getDocumentProxy } from "unpdf";
import OpenAI from "openai";

// ---- Načti .env.local ručně (žádný dotenv) ----
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
  console.error("Chybí OPENAI_API_KEY v .env.local");
  process.exit(1);
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 1:1 z extract-documents.ts
const BANK_STATEMENT_PROMPT = `Jsi extraktor dat z českých bankovních výpisů. Z poskytnutého PDF nebo obrázku výpisu vytáhni JEN tyto souhrnné údaje:

1. **total_income** — celkové příjmy v Kč (součet kreditních pohybů, tedy „Připsáno"/„Přišlo"/„Příjmy"). Z české terminologie: „Celkem přišlo", „Celkové kredity", „Suma připsáno". Vrať celé číslo bez desetinných míst.

2. **total_expenses** — celkové výdaje v Kč (součet debetních pohybů, tedy „Odepsáno"/„Odešlo"/„Výdaje"). Z české terminologie: „Celkem odešlo", „Celkové debety", „Suma odepsáno". Vrať celé číslo bez desetinných míst.

3. **period_months** — délka období výpisu v měsících. Pokud výpis pokrývá 1.6.–30.6., je to 1 měsíc. Pokud 15.5.–14.7., je to 2 měsíce.

4. **transaction_count** — počet jednotlivých transakcí v období.

5. **bank_name** — název banky (Česká spořitelna, Komerční banka, ČSOB, Raiffeisenbank, Air Bank, Fio banka, mBank, UniCredit Bank, Equa Bank, Moneta, atd.).

KRITICKÁ PRAVIDLA:
- NIKDY nevrať jednotlivé transakce, jména protistran, popisy plateb. Jen agregáty.
- Pokud výpis obsahuje souhrnný řádek („Celkem přišlo: 87 432 Kč"), použij ho přednostně.
- Pokud souhrn chybí, sečti samostatně kreditní a debetní řádky.
- Hodnotu, kterou nedokážeš určit, vrať jako null.
- Vrať POUZE validní JSON podle dodaného schématu.`;

const jsonSchema = {
  name: "bank_statement_extract",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      total_income: { type: ["number", "null"] },
      total_expenses: { type: ["number", "null"] },
      period_months: { type: ["number", "null"] },
      transaction_count: { type: ["integer", "null"] },
      bank_name: { type: ["string", "null"] },
    },
    required: [
      "total_income",
      "total_expenses",
      "period_months",
      "transaction_count",
      "bank_name",
    ],
  },
};

async function extractTextFromPdf(buffer) {
  const uint8 = new Uint8Array(
    buffer.buffer,
    buffer.byteOffset,
    buffer.byteLength,
  );
  const pdf = await getDocumentProxy(uint8);
  const { text } = await extractText(pdf, { mergePages: true });
  return Array.isArray(text) ? text.join("\n") : text;
}

async function extractBankStatementFromText(text, fileName) {
  const start = Date.now();
  const userPrompt = `Soubor: ${fileName}\n\nText výpisu:\n\n${text.slice(0, 80000)}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: BANK_STATEMENT_PROMPT },
      { role: "user", content: userPrompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: jsonSchema,
    },
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("Prázdná odpověď OpenAI");
  return {
    data: JSON.parse(raw),
    tokensUsed: completion.usage?.total_tokens ?? 0,
    inputTokens: completion.usage?.prompt_tokens ?? 0,
    outputTokens: completion.usage?.completion_tokens ?? 0,
    latencyMs: Date.now() - start,
  };
}

// ---- Main ----
async function main() {
  const downloadsDir = path.join(os.homedir(), "Downloads");
  const all = await readdir(downloadsDir);
  const statements = all
    .filter((f) => /AirBank_vypis_Tomas_Novak_2024-\d{2}\.pdf$/i.test(f))
    .sort();

  console.log(`Nalezeno ${statements.length} výpisů:`);
  statements.forEach((s) => console.log("  -", s));
  console.log();

  const outDir = path.join(process.cwd(), "scripts", "extraction-results");
  const results = [];

  for (const fname of statements) {
    const fpath = path.join(downloadsDir, fname);
    process.stdout.write(`[${fname}] reading PDF... `);
    const buf = await readFile(fpath);
    const text = await extractTextFromPdf(buf);
    process.stdout.write(`${text.length} znaků, GPT-4o... `);

    try {
      const result = await extractBankStatementFromText(text, fname);
      console.log(
        `OK (${result.tokensUsed} tok, ${result.latencyMs}ms)`,
      );
      console.log(
        `  → příjmy: ${result.data.total_income?.toLocaleString("cs-CZ") ?? "null"} Kč | výdaje: ${result.data.total_expenses?.toLocaleString("cs-CZ") ?? "null"} Kč | tx: ${result.data.transaction_count} | period: ${result.data.period_months}m`,
      );

      // Ulož text + JSON pro audit
      const base = fname.replace(/\.pdf$/i, "");
      await writeFile(
        path.join(outDir, `${base}.text.txt`),
        text,
        "utf-8",
      );
      await writeFile(
        path.join(outDir, `${base}.json`),
        JSON.stringify(result.data, null, 2),
        "utf-8",
      );

      results.push({
        fname,
        ok: true,
        ...result.data,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        totalTokens: result.tokensUsed,
        latencyMs: result.latencyMs,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`FAIL: ${msg}`);
      results.push({ fname, ok: false, error: msg });
    }
  }

  // Souhrn
  await writeFile(
    path.join(outDir, "_summary.json"),
    JSON.stringify(results, null, 2),
    "utf-8",
  );

  console.log("\n=== SOUHRN ===");
  console.table(
    results.map((r) => ({
      file: r.fname,
      ok: r.ok ? "✓" : "✗",
      income: r.ok ? r.total_income : "-",
      expenses: r.ok ? r.total_expenses : "-",
      tx: r.ok ? r.transaction_count : "-",
      months: r.ok ? r.period_months : "-",
      bank: r.ok ? r.bank_name : "-",
    })),
  );

  // Agregát jako v build-plan.ts
  const ok = results.filter((r) => r.ok && r.total_income > 0);
  if (ok.length) {
    const totalIncome = ok.reduce((s, r) => s + r.total_income, 0);
    const totalExpenses = ok.reduce((s, r) => s + r.total_expenses, 0);
    const totalMonths = ok.reduce(
      (s, r) => s + Math.max(r.period_months ?? 1, 0.5),
      0,
    );
    console.log(
      `\nPrůměr per měsíc (váženo periodou): ${Math.round(totalIncome / totalMonths).toLocaleString("cs-CZ")} Kč příjem / ${Math.round(totalExpenses / totalMonths).toLocaleString("cs-CZ")} Kč výdaj`,
    );
    console.log(`Celkem ${totalMonths} měsíců dat z ${ok.length} výpisů.`);
  }

  // ----- Token / cost analýza -----
  // GPT-4o ceník 2025: $2.50 / 1M input, $10.00 / 1M output (Anthropic/OpenAI public list).
  const INPUT_USD_PER_1M = 2.5;
  const OUTPUT_USD_PER_1M = 10.0;
  const USD_TO_CZK = 23.5;

  const totalInputTok = results.reduce((s, r) => s + (r.inputTokens ?? 0), 0);
  const totalOutputTok = results.reduce((s, r) => s + (r.outputTokens ?? 0), 0);
  const inputUsd = (totalInputTok / 1_000_000) * INPUT_USD_PER_1M;
  const outputUsd = (totalOutputTok / 1_000_000) * OUTPUT_USD_PER_1M;
  const totalUsd = inputUsd + outputUsd;
  const avgLatency =
    results.reduce((s, r) => s + (r.latencyMs ?? 0), 0) / results.length;

  console.log("\n=== TOKENS & COST ===");
  console.log(`Vstup:  ${totalInputTok.toLocaleString("cs-CZ")} tok → $${inputUsd.toFixed(4)}`);
  console.log(`Výstup: ${totalOutputTok.toLocaleString("cs-CZ")} tok → $${outputUsd.toFixed(4)}`);
  console.log(
    `CELKEM: ${(totalInputTok + totalOutputTok).toLocaleString("cs-CZ")} tok → $${totalUsd.toFixed(4)} (≈ ${(totalUsd * USD_TO_CZK).toFixed(2)} Kč)`,
  );
  console.log(`Průměr na výpis: $${(totalUsd / results.length).toFixed(4)} (≈ ${((totalUsd * USD_TO_CZK) / results.length).toFixed(2)} Kč)`);
  console.log(`Průměrná latence: ${Math.round(avgLatency)} ms / výpis`);

  console.log(`\nVšechny výsledky uloženy do: ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
