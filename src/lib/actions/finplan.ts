"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { currentAdvisorId, currentTenantId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { generateAccessToken } from "@/lib/finplan/token";

function buildFinplanUrl(token: string): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : null) ??
    "http://localhost:3000";
  const normalizedBase = baseUrl.startsWith("http")
    ? baseUrl
    : `https://${baseUrl}`;
  return `${normalizedBase}/plan/${token}`;
}

/**
 * Advisor-facing server actions pro finanční plán z dokumentů.
 *
 * Privacy:
 *   - Poradce čte pouze finplan_sessions (status + customer link) + finplan_analyses.
 *   - finplan_uploads a finplan_extracted (raw agregáty + soubory) jsou pro
 *     poradce RLS-deny; jen super_admin a service role.
 */

// ====== Create session ======

const createSessionSchema = z.object({
  customerId: z.string().uuid(),
});

export interface CreatedSession {
  sessionId: string;
  accessToken: string;
  url: string;
  expiresAt: string;
}

export type CreateSessionResult =
  | { ok: true; session: CreatedSession }
  | { ok: false; error: string };

export async function createFinplanSession(input: {
  customerId: string;
}): Promise<CreateSessionResult> {
  const parsed = createSessionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'Neplatný zákazník.' };
  }
  const { customerId } = parsed.data;

  try {
    const advisorId = await currentAdvisorId();
    const tenantId = await currentTenantId();
    const admin = supabaseAdmin();

    const { data: customer, error: custErr } = await admin
      .from("customers")
      .select("id, advisor_id, tenant_id")
      .eq("id", customerId)
      .single();

    if (custErr || !customer) {
      console.error('[createFinplanSession] customer not found', { customerId, err: custErr });
      return { ok: false, error: 'Zákazník nenalezen.' };
    }
    if (customer.advisor_id !== advisorId) {
      return { ok: false, error: 'Tento zákazník nepatří tomuto poradci.' };
    }

    const accessToken = generateAccessToken();

    const { data, error } = await admin
      .from("finplan_sessions")
      .insert({
        tenant_id: tenantId,
        advisor_id: advisorId,
        customer_id: customerId,
        access_token: accessToken,
        status: "created",
      })
      .select("id, access_token, expires_at")
      .single();

    if (error || !data) {
      console.error('[createFinplanSession] insert failed', error);
      return {
        ok: false,
        error: `Nepodařilo se vytvořit odkaz: ${error?.message ?? 'neznámá chyba'}`,
      };
    }

    revalidatePath("/zakaznici");
    revalidatePath("/financni-plan");

    return {
      ok: true,
      session: {
        sessionId: data.id,
        accessToken: data.access_token,
        url: buildFinplanUrl(data.access_token),
        expiresAt: data.expires_at,
      },
    };
  } catch (err) {
    console.error('[createFinplanSession] unexpected error', err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Neznámá chyba.',
    };
  }
}

// ====== One-shot: create customer (if needed) + session ======
//
// Poradce zadá jméno → my buď najdeme existujícího zákazníka (case-insensitive
// match) a použijeme ho, nebo vytvoříme nového. Tím odpadá dvoukrokový flow
// „nejdřív přidat zákazníka, pak vytvořit plán".

const createSessionFromNameSchema = z.object({
  full_name: z.string().trim().min(1, 'Zadej jméno zákazníka.').max(200),
  email: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  phone: z
    .string()
    .trim()
    .max(64)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export type CreateSessionFromNameResult =
  | {
      ok: true;
      session: CreatedSession;
      customer: { id: string; full_name: string; isNew: boolean };
    }
  | { ok: false; error: string };

export async function createFinplanSessionFromName(input: {
  full_name: string;
  email?: string | null;
  phone?: string | null;
}): Promise<CreateSessionFromNameResult> {
  const parsed = createSessionFromNameSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Neplatný vstup.' };
  }

  try {
    const advisorId = await currentAdvisorId();
    const tenantId = await currentTenantId();
    const admin = supabaseAdmin();

    // 1. Pokus najít existujícího zákazníka (case-insensitive na jméno)
    const { data: existing, error: searchErr } = await admin
      .from('customers')
      .select('id, full_name')
      .eq('advisor_id', advisorId)
      .ilike('full_name', parsed.data.full_name)
      .limit(1)
      .maybeSingle();

    if (searchErr) {
      console.error('[createFinplanSessionFromName] search failed', searchErr);
    }

    let customerId: string;
    let customerName: string;
    let isNew = false;

    if (existing) {
      customerId = existing.id;
      customerName = existing.full_name;
    } else {
      const { data: created, error: insErr } = await admin
        .from('customers')
        .insert({
          tenant_id: tenantId,
          advisor_id: advisorId,
          full_name: parsed.data.full_name,
          email: parsed.data.email,
          phone: parsed.data.phone,
        })
        .select('id, full_name')
        .single();

      if (insErr || !created) {
        console.error('[createFinplanSessionFromName] customer insert failed', insErr);
        return {
          ok: false,
          error: `Nepodařilo se vytvořit zákazníka: ${insErr?.message ?? 'neznámá chyba'}`,
        };
      }
      customerId = created.id;
      customerName = created.full_name;
      isNew = true;
    }

    // 2. Vytvořit finplan_session pro tohoto zákazníka
    const accessToken = generateAccessToken();
    const { data: session, error: sessErr } = await admin
      .from('finplan_sessions')
      .insert({
        tenant_id: tenantId,
        advisor_id: advisorId,
        customer_id: customerId,
        access_token: accessToken,
        status: 'created',
      })
      .select('id, access_token, expires_at')
      .single();

    if (sessErr || !session) {
      console.error('[createFinplanSessionFromName] session insert failed', sessErr);
      return {
        ok: false,
        error: `Nepodařilo se vytvořit odkaz: ${sessErr?.message ?? 'neznámá chyba'}`,
      };
    }

    revalidatePath('/zakaznici');
    revalidatePath('/financni-plan');

    return {
      ok: true,
      customer: { id: customerId, full_name: customerName, isNew },
      session: {
        sessionId: session.id,
        accessToken: session.access_token,
        url: buildFinplanUrl(session.access_token),
        expiresAt: session.expires_at,
      },
    };
  } catch (err) {
    console.error('[createFinplanSessionFromName] unexpected error', err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Neznámá chyba.',
    };
  }
}

// ====== List sessions for advisor ======

export interface FinplanSessionRow {
  id: string;
  customerId: string;
  customerName: string;
  status: string;
  createdAt: string;
  analyzedAt: string | null;
  accessToken: string;
}

export async function listFinplanSessions(): Promise<FinplanSessionRow[]> {
  const advisorId = await currentAdvisorId();
  const admin = supabaseAdmin();

  const { data, error } = await admin
    .from("finplan_sessions")
    .select(
      "id, customer_id, status, created_at, analyzed_at, access_token, customers(full_name)",
    )
    .eq("advisor_id", advisorId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    throw new Error(`Nepodařilo se načíst plány: ${error.message}`);
  }

  return (data ?? []).map((row) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const customer = (row as any).customers as { full_name: string } | null;
    return {
      id: row.id,
      customerId: row.customer_id,
      customerName: customer?.full_name ?? "Neznámý zákazník",
      status: row.status,
      createdAt: row.created_at,
      analyzedAt: row.analyzed_at,
      accessToken: row.access_token,
    };
  });
}

// ====== Get analysis ======

export interface FinplanAnalysisRow {
  id: string;
  sessionId: string;
  customerName: string;
  monthlyIncome: number | null;
  monthlyExpenses: number | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  planData: any;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function getFinplanAnalysis(
  sessionId: string,
): Promise<FinplanAnalysisRow | null> {
  const advisorId = await currentAdvisorId();
  const admin = supabaseAdmin();

  const { data, error } = await admin
    .from("finplan_analyses")
    .select(
      "id, session_id, monthly_income, monthly_expenses, plan_data, notes, created_at, updated_at, customers(full_name)",
    )
    .eq("session_id", sessionId)
    .eq("advisor_id", advisorId)
    .maybeSingle();

  if (error) {
    throw new Error(`Nepodařilo se načíst analýzu: ${error.message}`);
  }
  if (!data) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const customer = (data as any).customers as { full_name: string } | null;

  return {
    id: data.id,
    sessionId: data.session_id,
    customerName: customer?.full_name ?? "Zákazník",
    monthlyIncome: data.monthly_income,
    monthlyExpenses: data.monthly_expenses,
    planData: data.plan_data,
    notes: data.notes,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

// ====== Update notes ======

const updateNotesSchema = z.object({
  sessionId: z.string().uuid(),
  notes: z.string().max(5000),
});

export async function updateFinplanNotes(input: {
  sessionId: string;
  notes: string;
}): Promise<void> {
  const { sessionId, notes } = updateNotesSchema.parse(input);
  const advisorId = await currentAdvisorId();
  const admin = supabaseAdmin();

  const { error } = await admin
    .from("finplan_analyses")
    .update({ notes })
    .eq("session_id", sessionId)
    .eq("advisor_id", advisorId);

  if (error) {
    throw new Error(`Nepodařilo se uložit poznámky: ${error.message}`);
  }
}

// ====== Debug: per-upload extraction visibility ======
//
// Vrací surová data z extrakce pro každý upload. Pro demo verzi advisor UI,
// aby šlo testovat, co GPT-4o reálně viděla a vrátila. Žádné transakce,
// jen souhrn co se v pipeline stalo.

export interface FinplanDebugUpload {
  uploadId: string;
  fileName: string;
  kind: 'bank_statement' | 'id_front' | 'id_back' | 'other';
  fileSize: number;
  mimeType: string | null;
  extractedAt: string | null;
  extractError: string | null;

  // Extracted aggregates (one row per upload, maybe null if extraction failed)
  totalIncome: number | null;
  totalExpenses: number | null;
  periodMonths: number | null;
  transactionCount: number | null;
  bankName: string | null;
  idFullName: string | null;
  idBirthDate: string | null;
  idAddress: string | null;

  // Debug payload — what AI saw / returned
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rawResponse: any;
  inputExcerpt: string | null;
  systemPrompt: string | null;
  userPrompt: string | null;

  // Diagnostics
  model: string | null;
  tokensUsed: number | null;
  latencyMs: number | null;
}

export interface FinplanDebugBundle {
  sessionId: string;
  sessionStatus: string;
  customerName: string;
  uploads: FinplanDebugUpload[];
}

export async function getFinplanDebug(
  sessionId: string,
): Promise<FinplanDebugBundle | null> {
  const advisorId = await currentAdvisorId();
  const admin = supabaseAdmin();

  const { data: session, error: sessErr } = await admin
    .from('finplan_sessions')
    .select('id, status, advisor_id, customers(full_name)')
    .eq('id', sessionId)
    .eq('advisor_id', advisorId)
    .maybeSingle();

  if (sessErr || !session) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const customer = (session as any).customers as { full_name: string } | null;

  const { data: uploads, error: uplErr } = await admin
    .from('finplan_uploads')
    .select(
      'id, kind, file_name, file_size, mime_type, extracted_at, extract_error, created_at',
    )
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (uplErr) {
    throw new Error(`Nepodařilo se načíst uploads: ${uplErr.message}`);
  }

  const uploadIds = (uploads ?? []).map((u) => u.id);
  const { data: extracted, error: extErr } = await admin
    .from('finplan_extracted')
    .select(
      'upload_id, total_income, total_expenses, period_months, transaction_count, bank_name, id_full_name, id_birth_date, id_address, raw_response, input_excerpt, system_prompt, user_prompt, model, tokens_used, latency_ms',
    )
    .in('upload_id', uploadIds.length > 0 ? uploadIds : ['00000000-0000-0000-0000-000000000000']);

  if (extErr) {
    throw new Error(`Nepodařilo se načíst extrakce: ${extErr.message}`);
  }

  const extractedByUpload = new Map<string, (typeof extracted)[number]>();
  for (const row of extracted ?? []) {
    extractedByUpload.set(row.upload_id, row);
  }

  const rows: FinplanDebugUpload[] = (uploads ?? []).map((u) => {
    const ext = extractedByUpload.get(u.id);
    return {
      uploadId: u.id,
      fileName: u.file_name,
      kind: u.kind as FinplanDebugUpload['kind'],
      fileSize: u.file_size,
      mimeType: u.mime_type,
      extractedAt: u.extracted_at,
      extractError: u.extract_error,
      totalIncome: ext?.total_income != null ? Number(ext.total_income) : null,
      totalExpenses:
        ext?.total_expenses != null ? Number(ext.total_expenses) : null,
      periodMonths:
        ext?.period_months != null ? Number(ext.period_months) : null,
      transactionCount: ext?.transaction_count ?? null,
      bankName: ext?.bank_name ?? null,
      idFullName: ext?.id_full_name ?? null,
      idBirthDate: ext?.id_birth_date ?? null,
      idAddress: ext?.id_address ?? null,
      rawResponse: ext?.raw_response ?? null,
      inputExcerpt: ext?.input_excerpt ?? null,
      systemPrompt: ext?.system_prompt ?? null,
      userPrompt: ext?.user_prompt ?? null,
      model: ext?.model ?? null,
      tokensUsed: ext?.tokens_used ?? null,
      latencyMs: ext?.latency_ms ?? null,
    };
  });

  return {
    sessionId,
    sessionStatus: session.status,
    customerName: customer?.full_name ?? 'Zákazník',
    uploads: rows,
  };
}

// ====== Delete session ======

export async function deleteFinplanSession(sessionId: string): Promise<void> {
  const advisorId = await currentAdvisorId();
  const admin = supabaseAdmin();

  const { error } = await admin
    .from("finplan_sessions")
    .delete()
    .eq("id", sessionId)
    .eq("advisor_id", advisorId);

  if (error) {
    throw new Error(`Nepodařilo se smazat plán: ${error.message}`);
  }
  revalidatePath("/zakaznici");
}
