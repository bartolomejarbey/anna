'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { currentAdvisorId, currentTenantId } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * České finanční značky používané v hintech pro Whisper / cleanup. Whisper-1
 * tyto názvy občas komolí (např. "Komerčka" → "Komerční"), GPT-4o-mini
 * cleanup je s hintem opraví.
 *
 * Záměrně držíme krátké — Whisper `prompt` má limit ~224 tokenů a všechny
 * customer-name hinty + tyto značky musí dohromady dostat pod tento limit.
 */
const CZECH_FINANCIAL_BRANDS: ReadonlyArray<string> = [
  // Banky
  'Česká spořitelna',
  'ČSOB',
  'Komerční banka',
  'Raiffeisenbank',
  'UniCredit Bank',
  'Moneta Money Bank',
  'Air Bank',
  'mBank',
  'Fio banka',
  'Trinity Bank',
  // Pojišťovny
  'Allianz',
  'Generali',
  'Generali Česká pojišťovna',
  'Kooperativa',
  'ČSOB Pojišťovna',
  'NN Životní pojišťovna',
  'Uniqa',
  'Direct pojišťovna',
  'Pojišťovna VZP',
  'Slavia pojišťovna',
  // Investiční / penzijní
  'ČSOB Penzijní společnost',
  'KB Penzijní společnost',
  'Conseq',
  'Generali Investments',
  'Amundi',
];

/**
 * Vrátí pole jmen a značek pro biasování AI:
 *   - jména VŠECH zákazníků v poradcově portfoliu (ground truth pravopisu),
 *   - kanonické názvy českých bank, pojišťoven a penzijních společností.
 *
 * Použití:
 *   - Whisper `prompt` parameter (české vlastní jména a zkratky),
 *   - GPT-4o-mini cleanup pass jako `customerHints`.
 *
 * RLS: čteme přes admin klienta (server action), filtrujeme přes `advisor_id`.
 */
export async function getCustomerHints(advisorId: string): Promise<string[]> {
  if (!advisorId) return [...CZECH_FINANCIAL_BRANDS];

  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from('customers')
    .select('full_name')
    .eq('advisor_id', advisorId)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    // Hint je best-effort — degradace na samotné značky.
    return [...CZECH_FINANCIAL_BRANDS];
  }

  const customerNames = (data ?? [])
    .map((row) => (row as { full_name: string | null }).full_name?.trim())
    .filter((name): name is string => !!name && name.length > 0);

  // Deduplikace: stejné jméno (case-insensitive) ponecháme jen jednou.
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const name of [...customerNames, ...CZECH_FINANCIAL_BRANDS]) {
    const key = name.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(name);
    }
  }

  return unique;
}

/**
 * Tvar pro Whisper `prompt` parametr (max ~224 tokenů). Slepí hinty čárkou,
 * tvrdě ořízne na 800 znaků (~200 tokenů s rezervou).
 */
export async function getWhisperPromptHint(advisorId: string): Promise<string> {
  const hints = await getCustomerHints(advisorId);
  const joined = hints.join(', ');
  return joined.length > 800 ? joined.slice(0, 800) : joined;
}

// ====== Create customer ======
// Bez klientské zóny. Zákazník nemusí mít e-mail ani účet — poradce
// si může spravovat i pouhý záznam s jménem.

const createCustomerSchema = z.object({
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

export type CreatedCustomer = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
};

export type CreateCustomerResult =
  | { ok: true; customer: CreatedCustomer }
  | { ok: false; error: string };

export async function createCustomer(input: {
  full_name: string;
  email?: string | null;
  phone?: string | null;
}): Promise<CreateCustomerResult> {
  const parsed = createCustomerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Neplatný vstup.' };
  }

  try {
    const advisorId = await currentAdvisorId();
    const tenantId = await currentTenantId();
    const admin = supabaseAdmin();

    const { data, error } = await admin
      .from('customers')
      .insert({
        tenant_id: tenantId,
        advisor_id: advisorId,
        full_name: parsed.data.full_name,
        email: parsed.data.email,
        phone: parsed.data.phone,
      })
      .select('id, full_name, email, phone')
      .single();

    if (error || !data) {
      console.error('[createCustomer] insert failed', error);
      return {
        ok: false,
        error: error?.message ?? 'Nepodařilo se uložit zákazníka.',
      };
    }

    revalidatePath('/zakaznici');
    revalidatePath('/financni-plan/novy');

    return {
      ok: true,
      customer: {
        id: data.id,
        full_name: data.full_name,
        email: data.email,
        phone: data.phone,
      },
    };
  } catch (err) {
    console.error('[createCustomer] unexpected error', err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Neznámá chyba.',
    };
  }
}
