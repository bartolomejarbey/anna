'use server';

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
