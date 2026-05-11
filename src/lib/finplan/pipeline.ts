import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  extractBankStatementFromText,
  extractIdCard,
} from "./extract-documents";
import { extractTextFromPdf } from "./parse-pdf";
import { buildPlanFromAggregates, type BankAggregate, type IdInfo } from "@/lib/calculator/finplan/build-plan";
import type { EmploymentType } from "@/lib/calculator/finplan/types";

const BUCKET = "finplan-docs";

interface UploadRow {
  id: string;
  kind: "bank_statement" | "id_front" | "id_back" | "other";
  file_path: string;
  file_name: string;
  mime_type: string | null;
}

async function downloadFile(filePath: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const admin = supabaseAdmin();
  const { data, error } = await admin.storage.from(BUCKET).download(filePath);
  if (error || !data) {
    throw new Error(`Nepodařilo se stáhnout soubor ${filePath}: ${error?.message}`);
  }
  const arrayBuffer = await data.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    mimeType: data.type || "application/octet-stream",
  };
}

/**
 * Hlavní pipeline pro session:
 *   1. Načti všechny uploads.
 *   2. Pro každý bank statement: download → extract text (PDF) nebo image → GPT-4o → finplan_extracted.
 *   3. Pro ID front+back společně: download obě → GPT-4o vision → finplan_extracted.
 *   4. Agregace → buildPlanFromAggregates → finplan_analyses.
 *   5. Status session = 'analyzed'.
 */
export async function runFinplanExtraction(sessionId: string): Promise<void> {
  const admin = supabaseAdmin();

  // Update status: extracting
  await admin
    .from("finplan_sessions")
    .update({ status: "extracting" })
    .eq("id", sessionId);

  try {
    const { data: session, error: sessErr } = await admin
      .from("finplan_sessions")
      .select(
        "id, tenant_id, advisor_id, customer_id, employment_type",
      )
      .eq("id", sessionId)
      .single();

    if (sessErr || !session) {
      throw new Error("Session nenalezena.");
    }

    const employmentType: EmploymentType =
      (session.employment_type as EmploymentType) ?? "employee";

    const { data: uploads, error: uplErr } = await admin
      .from("finplan_uploads")
      .select("id, kind, file_path, file_name, mime_type")
      .eq("session_id", sessionId);

    if (uplErr) {
      throw new Error(`Nepodařilo se načíst uploads: ${uplErr.message}`);
    }

    const rows: UploadRow[] = (uploads ?? []) as UploadRow[];

    // Bank statements
    const bankUploads = rows.filter((r) => r.kind === "bank_statement");
    const bankAggregates: BankAggregate[] = [];

    for (const upload of bankUploads) {
      try {
        const { buffer, mimeType } = await downloadFile(upload.file_path);

        let text = "";
        if (mimeType === "application/pdf" || upload.file_name.toLowerCase().endsWith(".pdf")) {
          text = await extractTextFromPdf(buffer);
        } else if (mimeType.startsWith("text/")) {
          text = buffer.toString("utf-8");
        } else {
          // Image — TODO: pošli rovnou do vision. Pro MVP přeskočíme.
          // (V praxi výpisy jsou skoro vždy PDF.)
          await admin
            .from("finplan_uploads")
            .update({ extract_error: "Obrázkové výpisy zatím nepodporujeme. Nahrajte PDF." })
            .eq("id", upload.id);
          continue;
        }

        if (!text || text.length < 50) {
          await admin
            .from("finplan_uploads")
            .update({ extract_error: "PDF neobsahuje textovou vrstvu (skenovaný výpis)." })
            .eq("id", upload.id);
          continue;
        }

        const result = await extractBankStatementFromText(text, upload.file_name);

        await admin.from("finplan_extracted").insert({
          upload_id: upload.id,
          session_id: sessionId,
          total_income: result.data.total_income,
          total_expenses: result.data.total_expenses,
          period_months: result.data.period_months,
          transaction_count: result.data.transaction_count,
          bank_name: result.data.bank_name,
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

        if (
          result.data.total_income != null &&
          result.data.total_expenses != null &&
          result.data.period_months != null
        ) {
          bankAggregates.push({
            totalIncome: result.data.total_income,
            totalExpenses: result.data.total_expenses,
            periodMonths: result.data.period_months,
            transactionCount: result.data.transaction_count ?? 0,
            bankName: result.data.bank_name,
          });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await admin
          .from("finplan_uploads")
          .update({ extract_error: msg })
          .eq("id", upload.id);
      }
    }

    // ID card (kombinace front + back)
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

        // Save agregát pod první upload row (typicky front)
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

    // Build PlanData
    const planData = buildPlanFromAggregates({
      bankAggregates,
      id: idInfo,
      employmentType,
    });

    // Update customer name if we got it from ID
    if (idInfo?.fullName && idInfo.fullName.length >= 3) {
      await admin
        .from("customers")
        .update({ full_name: idInfo.fullName })
        .eq("id", session.customer_id);
    }

    // Upsert analysis
    await admin
      .from("finplan_analyses")
      .upsert(
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
