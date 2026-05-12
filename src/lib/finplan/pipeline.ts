import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  extractBankStatementRichFromText,
  extractIdCard,
  type BankStatementRichExtract,
} from "./extract-documents";
import { extractTextFromPdf } from "./parse-pdf";
import {
  buildPlanFromAggregates,
  type BankAggregate,
  type IdInfo,
} from "@/lib/calculator/finplan/build-plan";
import type {
  EmploymentType,
  FinplanPrivacyMode,
} from "@/lib/calculator/finplan/types";
import { formResponseDataSchema } from "./form-types";
import { formToBankAggregate } from "./form-to-aggregate";

const BUCKET = "finplan-docs";

interface UploadRow {
  id: string;
  kind: "bank_statement" | "id_front" | "id_back" | "other";
  file_path: string;
  file_name: string;
  mime_type: string | null;
}

async function downloadFile(filePath: string): Promise<{
  buffer: Buffer;
  mimeType: string;
}> {
  const admin = supabaseAdmin();
  const { data, error } = await admin.storage.from(BUCKET).download(filePath);
  if (error || !data) {
    throw new Error(
      `Nepodařilo se stáhnout soubor ${filePath}: ${error?.message}`,
    );
  }
  const arrayBuffer = await data.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    mimeType: data.type || "application/octet-stream",
  };
}

/**
 * Převod rich extrakce → BankAggregate (camelCase pro buildPlanFromAggregates).
 */
function toBankAggregate(d: BankStatementRichExtract): BankAggregate | null {
  if (d.period_months == null) return null;
  return {
    periodMonths: d.period_months,
    bankName: d.bank_name,
    transactionCount: d.transaction_count ?? 0,
    income: {
      salary: d.income.salary,
      selfEmployed: d.income.self_employed,
      rental: d.income.rental,
      passive: d.income.passive,
      other: d.income.other,
    },
    expenses: {
      housing: d.expenses.housing,
      food: d.expenses.food,
      transport: d.expenses.transport,
      insurance: d.expenses.insurance,
      healthcare: d.expenses.healthcare,
      savings: d.expenses.savings,
      dining: d.expenses.dining,
      subscriptions: d.expenses.subscriptions,
      discretionary: d.expenses.discretionary,
      other: d.expenses.other,
    },
    necessaryTotal: d.necessary_total,
    discretionaryTotal: d.discretionary_total,
    detectedSalary: d.detected_salary_amount,
    detectedEmploymentType: d.detected_employment_type,
  };
}

/**
 * Hlavní pipeline pro session:
 *   1. Načti všechny uploads + session metadata (privacy_mode, employment_type).
 *   2. Pro každý bank statement: download → PDF → text → GPT-4o rich extract.
 *      Ukládáme bohatý breakdown do finplan_extracted.
 *   3. Pro ID front+back společně: download obě → GPT-4o vision → finplan_extracted.
 *   4. Agregace → buildPlanFromAggregates(..., privacyMode) → finplan_analyses.
 *      Privacy gating: 'full' vystaví detailní kategorie, 'categorized' jen
 *      necessary/discretionary souhrn, 'aggregate_only' jen totály.
 *   5. Status session = 'analyzed'.
 */
export async function runFinplanExtraction(sessionId: string): Promise<void> {
  const admin = supabaseAdmin();

  await admin
    .from("finplan_sessions")
    .update({ status: "extracting" })
    .eq("id", sessionId);

  try {
    const { data: session, error: sessErr } = await admin
      .from("finplan_sessions")
      .select(
        "id, tenant_id, advisor_id, customer_id, employment_type, privacy_mode",
      )
      .eq("id", sessionId)
      .single();

    if (sessErr || !session) {
      throw new Error("Session nenalezena.");
    }

    const employmentType: EmploymentType =
      (session.employment_type as EmploymentType) ?? "employee";
    const privacyMode: FinplanPrivacyMode =
      (session.privacy_mode as FinplanPrivacyMode) ?? "categorized";

    // ---------- Detekce cesty: form fallback vs bank statements ----------
    // Pokud customer submitted form response (cesta "Nechci posílat výpisy"),
    // přeskočíme AI extrakci a postavíme aggregate přímo z formuláře.
    const { data: formRow } = await admin
      .from("finplan_form_responses")
      .select("data, submitted_at")
      .eq("session_id", sessionId)
      .maybeSingle();

    const isFormPath = !!formRow?.submitted_at;

    const { data: uploads, error: uplErr } = await admin
      .from("finplan_uploads")
      .select("id, kind, file_path, file_name, mime_type")
      .eq("session_id", sessionId);

    if (uplErr) {
      throw new Error(`Nepodařilo se načíst uploads: ${uplErr.message}`);
    }

    const rows: UploadRow[] = (uploads ?? []) as UploadRow[];

    // ---------- Bank statements (jen pokud není form path) ----------
    const bankUploads = isFormPath
      ? []
      : rows.filter((r) => r.kind === "bank_statement");
    const bankAggregates: BankAggregate[] = [];

    // ---------- Form fallback: aggregate z formuláře ----------
    if (isFormPath && formRow) {
      const parsed = formResponseDataSchema.safeParse(formRow.data);
      if (parsed.success) {
        const agg = formToBankAggregate(parsed.data, employmentType);
        bankAggregates.push(agg);
      }
    }

    for (const upload of bankUploads) {
      try {
        const { buffer, mimeType } = await downloadFile(upload.file_path);

        let text = "";
        if (
          mimeType === "application/pdf" ||
          upload.file_name.toLowerCase().endsWith(".pdf")
        ) {
          text = await extractTextFromPdf(buffer);
        } else if (mimeType.startsWith("text/")) {
          text = buffer.toString("utf-8");
        } else {
          await admin
            .from("finplan_uploads")
            .update({
              extract_error:
                "Obrázkové výpisy zatím nepodporujeme. Nahrajte PDF.",
            })
            .eq("id", upload.id);
          continue;
        }

        if (!text || text.length < 50) {
          await admin
            .from("finplan_uploads")
            .update({
              extract_error: "PDF neobsahuje textovou vrstvu (skenovaný výpis).",
            })
            .eq("id", upload.id);
          continue;
        }

        const result = await extractBankStatementRichFromText(
          text,
          upload.file_name,
        );
        const d = result.data;

        await admin.from("finplan_extracted").insert({
          upload_id: upload.id,
          session_id: sessionId,
          // Souhrnné agregáty (zpětně kompatibilní s existujícími sloupci)
          total_income: d.income_total,
          total_expenses: d.expense_total,
          period_months: d.period_months,
          transaction_count: d.transaction_count,
          bank_name: d.bank_name,
          // Bohatý breakdown (nové sloupce)
          income_breakdown: d.income,
          expense_breakdown: d.expenses,
          necessary_total: d.necessary_total,
          discretionary_total: d.discretionary_total,
          detected_salary: d.detected_salary_amount,
          detected_employment_type: d.detected_employment_type,
          // Debug
          model: result.model,
          tokens_used: result.tokensUsed,
          latency_ms: result.latencyMs,
          raw_response: result.rawResponse,
          input_excerpt: result.inputExcerpt,
          system_prompt: result.systemPrompt,
          user_prompt: result.userPrompt,
        });

        await admin
          .from("finplan_uploads")
          .update({ extracted_at: new Date().toISOString() })
          .eq("id", upload.id);

        const agg = toBankAggregate(d);
        if (agg) bankAggregates.push(agg);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await admin
          .from("finplan_uploads")
          .update({ extract_error: msg })
          .eq("id", upload.id);
      }
    }

    // ---------- ID card ----------
    const idUploads = rows.filter(
      (r) => r.kind === "id_front" || r.kind === "id_back",
    );

    let idInfo: IdInfo | null = null;

    if (idUploads.length > 0) {
      try {
        const buffers = await Promise.all(
          idUploads.map(async (u) => {
            const { buffer, mimeType } = await downloadFile(u.file_path);
            return { buffer, mimeType, name: u.file_name };
          }),
        );

        const result = await extractIdCard(buffers);

        const firstUpload = idUploads[0]!;
        await admin.from("finplan_extracted").insert({
          upload_id: firstUpload.id,
          session_id: sessionId,
          id_full_name: result.data.full_name,
          id_birth_date: result.data.birth_date,
          id_address: result.data.address,
          model: result.model,
          tokens_used: result.tokensUsed,
          latency_ms: result.latencyMs,
          raw_response: result.rawResponse,
          input_excerpt: result.inputExcerpt,
          system_prompt: result.systemPrompt,
          user_prompt: result.userPrompt,
        });

        await admin
          .from("finplan_uploads")
          .update({ extracted_at: new Date().toISOString() })
          .in(
            "id",
            idUploads.map((u) => u.id),
          );

        idInfo = {
          fullName: result.data.full_name,
          birthDate: result.data.birth_date,
          address: result.data.address,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await admin
          .from("finplan_uploads")
          .update({ extract_error: msg })
          .in(
            "id",
            idUploads.map((u) => u.id),
          );
      }
    }

    // ---------- PlanData (privacy-gated) ----------
    const planData = buildPlanFromAggregates({
      bankAggregates,
      id: idInfo,
      employmentType,
      privacyMode,
    });

    if (idInfo?.fullName && idInfo.fullName.length >= 3) {
      await admin
        .from("customers")
        .update({ full_name: idInfo.fullName })
        .eq("id", session.customer_id);
    }

    await admin.from("finplan_analyses").upsert(
      {
        session_id: sessionId,
        tenant_id: session.tenant_id,
        advisor_id: session.advisor_id,
        customer_id: session.customer_id,
        monthly_income: planData.cashflow.income,
        monthly_expenses: planData.cashflow.expenses,
        plan_data: planData,
      },
      { onConflict: "session_id" },
    );

    await admin
      .from("finplan_sessions")
      .update({
        status: "analyzed",
        analyzed_at: new Date().toISOString(),
      })
      .eq("id", sessionId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await admin
      .from("finplan_sessions")
      .update({ status: "failed" })
      .eq("id", sessionId);
    throw new Error(`Pipeline selhala: ${msg}`);
  }
}
