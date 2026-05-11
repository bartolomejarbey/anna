"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { currentAdvisorId, currentTenantId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { generateAccessToken } from "@/lib/finplan/token";

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

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : null) ??
      "http://localhost:3000";
    const normalizedBase = baseUrl.startsWith("http")
      ? baseUrl
      : `https://${baseUrl}`;

    revalidatePath("/zakaznici");
    revalidatePath("/financni-plan");

    return {
      ok: true,
      session: {
        sessionId: data.id,
        accessToken: data.access_token,
        url: `${normalizedBase}/plan/${data.access_token}`,
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
