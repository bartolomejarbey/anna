"use server";

import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { runFinplanExtraction } from "@/lib/finplan/pipeline";
import {
  createEmptyFormResponse,
  formResponseDataSchema,
  TOTAL_STEPS,
  type FormResponseData,
} from "@/lib/finplan/form-types";

/**
 * Customer-facing server actions pro fallback formulář.
 * Identifikace přes access_token z URL /plan/<token>/formular.
 */

const tokenSchema = z.string().min(20).max(64);

async function loadSessionByToken(token: string) {
  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("finplan_sessions")
    .select("id, status, expires_at, employment_type, privacy_mode")
    .eq("access_token", token)
    .maybeSingle();

  if (error) throw new Error("Nepodařilo se ověřit odkaz.");
  if (!data) throw new Error("Odkaz neexistuje nebo byl smazán.");
  if (new Date(data.expires_at) < new Date()) {
    throw new Error("Odkaz vypršel. Požádej poradce o nový.");
  }
  return data;
}

// ====== Get or create form response ======

export interface FormResponseState {
  data: FormResponseData;
  currentStep: number;
  totalSteps: number;
  submitted: boolean;
}

export async function getFormResponse(
  token: string,
): Promise<FormResponseState> {
  const parsed = tokenSchema.parse(token);
  const session = await loadSessionByToken(parsed);
  const admin = supabaseAdmin();

  const { data: row } = await admin
    .from("finplan_form_responses")
    .select("data, current_step, total_steps, submitted_at")
    .eq("session_id", session.id)
    .maybeSingle();

  if (!row) {
    return {
      data: createEmptyFormResponse(),
      currentStep: 0,
      totalSteps: TOTAL_STEPS,
      submitted: false,
    };
  }

  // Parse přes Zod — pokud data v DB neodpovídají schématu (migrace, change),
  // mergneme s prázdným defaultem aby UI nespadlo.
  const parsedData = formResponseDataSchema.safeParse(row.data);
  const data = parsedData.success ? parsedData.data : createEmptyFormResponse();

  return {
    data,
    currentStep: row.current_step ?? 0,
    totalSteps: row.total_steps ?? TOTAL_STEPS,
    submitted: !!row.submitted_at,
  };
}

// ====== Save form step (autosave) ======

const saveSchema = z.object({
  token: tokenSchema,
  data: formResponseDataSchema,
  currentStep: z.number().int().min(0).max(50),
});

export async function saveFormStep(input: {
  token: string;
  data: FormResponseData;
  currentStep: number;
}): Promise<void> {
  const { token, data, currentStep } = saveSchema.parse(input);
  const session = await loadSessionByToken(token);
  const admin = supabaseAdmin();

  // Update session status na 'uploading' (re-use existing enum) pokud je v 'created' nebo 'opened'
  if (session.status === "created" || session.status === "opened") {
    await admin
      .from("finplan_sessions")
      .update({ status: "uploading" })
      .eq("id", session.id);
  }

  const { error } = await admin.from("finplan_form_responses").upsert(
    {
      session_id: session.id,
      data,
      current_step: currentStep,
      total_steps: TOTAL_STEPS,
    },
    { onConflict: "session_id" },
  );

  if (error) {
    throw new Error(`Uložení selhalo: ${error.message}`);
  }
}

// ====== Submit form (trigger pipeline) ======

const submitSchema = z.object({
  token: tokenSchema,
  data: formResponseDataSchema,
  employmentType: z.enum(["employee", "selfemployed"]),
  privacyMode: z.enum(["full", "categorized", "aggregate_only"]),
});

export async function submitFinplanFormSession(input: {
  token: string;
  data: FormResponseData;
  employmentType: "employee" | "selfemployed";
  privacyMode: "full" | "categorized" | "aggregate_only";
}): Promise<{ sessionId: string }> {
  const { token, data, employmentType, privacyMode } = submitSchema.parse(input);
  const session = await loadSessionByToken(token);
  const admin = supabaseAdmin();

  // Validace: aspoň netMonthly musí být vyplněn (jinak je plán bezcenný)
  if (data.income.netMonthly == null) {
    throw new Error("Vyplň prosím čistou měsíční mzdu — bez příjmu nelze plán spočítat.");
  }

  // 1) uložit final form response + označit submitted
  const { error: saveErr } = await admin.from("finplan_form_responses").upsert(
    {
      session_id: session.id,
      data,
      current_step: TOTAL_STEPS,
      total_steps: TOTAL_STEPS,
      submitted_at: new Date().toISOString(),
    },
    { onConflict: "session_id" },
  );
  if (saveErr) throw new Error(`Uložení selhalo: ${saveErr.message}`);

  // 2) update session
  await admin
    .from("finplan_sessions")
    .update({
      status: "uploaded",
      uploaded_at: new Date().toISOString(),
      employment_type: employmentType,
      privacy_mode: privacyMode,
    })
    .eq("id", session.id);

  // 3) trigger pipeline — pipeline detekuje submitted form response a větví na form-fallback cestu
  await runFinplanExtraction(session.id);

  return { sessionId: session.id };
}
