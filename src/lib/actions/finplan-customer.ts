"use server";

import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { runFinplanExtraction } from "@/lib/finplan/pipeline";

/**
 * Customer-facing server actions. Žádné cookies, žádný auth.
 * Identifikace přes access_token z URL /plan/<token>.
 *
 * Všechno běží přes service-role klienta (RLS neaplikuje), takže autorizace
 * je čistě přes ověření tokenu v každé akci.
 */

const BUCKET = "finplan-docs";

// ====== Get session info by token ======

export interface CustomerSessionInfo {
  sessionId: string;
  customerName: string;
  advisorName: string;
  status: string;
  expiresAt: string;
  employmentType: "employee" | "selfemployed" | null;
}

const tokenSchema = z.string().min(20).max(64);

async function loadSessionByToken(token: string) {
  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("finplan_sessions")
    .select(
      "id, status, expires_at, employment_type, advisor_id, customer_id, customers(full_name), advisors(full_name)",
    )
    .eq("access_token", token)
    .maybeSingle();

  if (error) {
    throw new Error("Nepodařilo se ověřit odkaz.");
  }
  if (!data) {
    throw new Error("Odkaz neexistuje nebo byl smazán.");
  }
  if (new Date(data.expires_at) < new Date()) {
    throw new Error("Odkaz vypršel. Požádej poradce o nový.");
  }
  return data;
}

export async function getCustomerSession(
  token: string,
): Promise<CustomerSessionInfo> {
  const parsed = tokenSchema.parse(token);
  const data = await loadSessionByToken(parsed);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const customer = (data as any).customers as { full_name: string } | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const advisor = (data as any).advisors as { full_name: string } | null;

  return {
    sessionId: data.id,
    customerName: customer?.full_name ?? "",
    advisorName: advisor?.full_name ?? "Tvůj poradce",
    status: data.status,
    expiresAt: data.expires_at,
    employmentType: data.employment_type,
  };
}

// ====== Mark session as opened ======

export async function markSessionOpened(token: string): Promise<void> {
  const parsed = tokenSchema.parse(token);
  const session = await loadSessionByToken(parsed);

  if (session.status === "created") {
    const admin = supabaseAdmin();
    await admin
      .from("finplan_sessions")
      .update({ status: "opened", opened_at: new Date().toISOString() })
      .eq("id", session.id);
  }
}

// ====== Upload file ======

const uploadSchema = z.object({
  token: z.string().min(20).max(64),
  kind: z.enum(["bank_statement", "id_front", "id_back"]),
  fileName: z.string().min(1).max(255),
  fileSize: z.number().int().positive(),
  mimeType: z.string().min(1).max(100),
});

export interface UploadResult {
  uploadId: string;
}

/**
 * Klient zavolá tuto akci s FormData obsahující soubor.
 * (Server actions s FormData umožňují streamování binárního obsahu.)
 */
export async function uploadFinplanDocument(formData: FormData): Promise<UploadResult> {
  const token = formData.get("token");
  const kind = formData.get("kind");
  const file = formData.get("file");

  if (typeof token !== "string" || typeof kind !== "string") {
    throw new Error("Chybí token nebo kind.");
  }
  if (!(file instanceof File)) {
    throw new Error("Chybí soubor.");
  }

  const validated = uploadSchema.parse({
    token,
    kind,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type || "application/octet-stream",
  });

  const session = await loadSessionByToken(validated.token);
  const admin = supabaseAdmin();

  // Update status pokud je 'created' nebo 'opened'
  if (session.status === "created" || session.status === "opened") {
    await admin
      .from("finplan_sessions")
      .update({ status: "uploading" })
      .eq("id", session.id);
  }

  // Cesta v bucketu: <session_id>/<uuid>-<filename>
  const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
  const safeBase = crypto.randomUUID();
  const filePath = `${session.id}/${safeBase}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error: uploadErr } = await admin.storage
    .from(BUCKET)
    .upload(filePath, buffer, {
      contentType: validated.mimeType,
      upsert: false,
    });

  if (uploadErr) {
    throw new Error(`Nahrání selhalo: ${uploadErr.message}`);
  }

  const { data: row, error: dbErr } = await admin
    .from("finplan_uploads")
    .insert({
      session_id: session.id,
      kind: validated.kind,
      file_path: filePath,
      file_name: validated.fileName,
      file_size: validated.fileSize,
      mime_type: validated.mimeType,
    })
    .select("id")
    .single();

  if (dbErr || !row) {
    // Cleanup soubor v bucketu
    await admin.storage.from(BUCKET).remove([filePath]);
    throw new Error(`Záznam o souboru se neuložil: ${dbErr?.message}`);
  }

  return { uploadId: row.id };
}

// ====== Remove uploaded file ======

const removeSchema = z.object({
  token: z.string().min(20).max(64),
  uploadId: z.string().uuid(),
});

export async function removeFinplanDocument(input: {
  token: string;
  uploadId: string;
}): Promise<void> {
  const { token, uploadId } = removeSchema.parse(input);
  const session = await loadSessionByToken(token);
  const admin = supabaseAdmin();

  const { data: upload, error } = await admin
    .from("finplan_uploads")
    .select("file_path, session_id")
    .eq("id", uploadId)
    .single();

  if (error || !upload || upload.session_id !== session.id) {
    throw new Error("Soubor nenalezen v této session.");
  }

  await admin.storage.from(BUCKET).remove([upload.file_path]);
  await admin.from("finplan_uploads").delete().eq("id", uploadId);
}

// ====== Submit session (trigger pipeline) ======

const submitSchema = z.object({
  token: z.string().min(20).max(64),
  employmentType: z.enum(["employee", "selfemployed"]),
});

export async function submitFinplanSession(input: {
  token: string;
  employmentType: "employee" | "selfemployed";
}): Promise<{ sessionId: string }> {
  const { token, employmentType } = submitSchema.parse(input);
  const session = await loadSessionByToken(token);
  const admin = supabaseAdmin();

  // Ověř, že má aspoň 1 výpis
  const { count, error: countErr } = await admin
    .from("finplan_uploads")
    .select("*", { count: "exact", head: true })
    .eq("session_id", session.id)
    .eq("kind", "bank_statement");

  if (countErr) {
    throw new Error("Nepodařilo se ověřit nahrané soubory.");
  }
  if (!count || count === 0) {
    throw new Error("Nahrajte alespoň jeden bankovní výpis.");
  }

  await admin
    .from("finplan_sessions")
    .update({
      status: "uploaded",
      uploaded_at: new Date().toISOString(),
      employment_type: employmentType,
    })
    .eq("id", session.id);

  // Trigger pipeline. Pro MVP synchronně (10–60s). V produkci → background queue.
  await runFinplanExtraction(session.id);

  return { sessionId: session.id };
}

// ====== List uploaded files (for customer UI) ======

export interface CustomerUpload {
  id: string;
  kind: "bank_statement" | "id_front" | "id_back" | "other";
  fileName: string;
  fileSize: number;
  createdAt: string;
}

export async function listCustomerUploads(
  token: string,
): Promise<CustomerUpload[]> {
  const parsed = tokenSchema.parse(token);
  const session = await loadSessionByToken(parsed);
  const admin = supabaseAdmin();

  const { data, error } = await admin
    .from("finplan_uploads")
    .select("id, kind, file_name, file_size, created_at")
    .eq("session_id", session.id)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error("Nepodařilo se načíst soubory.");
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    kind: row.kind,
    fileName: row.file_name,
    fileSize: row.file_size,
    createdAt: row.created_at,
  }));
}
