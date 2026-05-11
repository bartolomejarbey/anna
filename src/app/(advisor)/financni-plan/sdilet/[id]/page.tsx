import Link from 'next/link';
import { ArrowLeft } from '@phosphor-icons/react/dist/ssr';
import { currentAdvisorId } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { ShareLinkPanel } from '@/components/finplan/share-link-panel';

export const metadata = { title: 'Odkaz pro zákazníka — Anna' };

const STATUS_LABEL: Record<string, string> = {
  created: 'Zákazník zatím neotevřel odkaz.',
  opened: 'Zákazník odkaz otevřel, ale dokumenty zatím nenahrál.',
  uploading: 'Zákazník právě nahrává dokumenty.',
  uploaded: 'Dokumenty máme. Anna je teď zpracovává.',
  extracting: 'Anna zpracovává dokumenty…',
  failed: 'Něco se pokazilo. Spojte se s podporou.',
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function SharePlanPage({ params }: Props) {
  const { id } = await params;
  const advisorId = await currentAdvisorId();
  const sb = supabaseAdmin();

  const { data } = await sb
    .from('finplan_sessions')
    .select('id, status, access_token, expires_at, customers(full_name)')
    .eq('id', id)
    .eq('advisor_id', advisorId)
    .maybeSingle();

  if (!data) {
    return (
      <div className="mx-auto w-full max-w-[640px] px-8 py-16">
        <p className="text-body text-primary">Plán nenalezen.</p>
        <Link href="/financni-plan" className="mt-4 inline-block text-body-sm text-accent">
          Zpět na plány
        </Link>
      </div>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const customer = (data as any).customers as { full_name: string } | null;
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_VERCEL_URL ??
    'http://localhost:3000';
  const normalizedBase = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;
  const url = `${normalizedBase}/plan/${data.access_token}`;

  return (
    <div className="mx-auto w-full max-w-[640px] px-8 py-16">
      <Link
        href="/financni-plan"
        className="mb-8 inline-flex items-center gap-2 text-body-sm text-secondary hover:text-primary"
      >
        <ArrowLeft size={14} weight="regular" />
        Plány
      </Link>

      <p className="anna-section-rule mb-5" aria-hidden />
      <p className="mb-3 text-caption text-tertiary">Finanční plán</p>
      <h1 className="mb-3 text-h1 text-primary">{customer?.full_name ?? 'Zákazník'}</h1>
      <p className="mb-12 text-prose text-secondary">
        {STATUS_LABEL[data.status] ?? data.status}
      </p>

      <ShareLinkPanel url={url} />
    </div>
  );
}
