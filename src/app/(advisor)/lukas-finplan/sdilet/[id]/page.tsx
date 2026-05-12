import Link from 'next/link';
import { ArrowLeft } from '@phosphor-icons/react/dist/ssr';
import { currentAdvisorId } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { ShareLinkPanel } from '@/components/lukas-finplan/share-link-panel';
import { PageShell } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/ui/page-header';

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
      <PageShell width="narrow">
        <p className="mt-20 text-body text-primary">Plán nenalezen.</p>
        <Link href="/lukas-finplan" className="mt-4 inline-block text-body-sm text-accent">
          Zpět na plány
        </Link>
      </PageShell>
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
    <PageShell width="narrow">
      <Link
        href="/lukas-finplan"
        className="mt-10 mb-2 inline-flex items-center gap-1.5 text-body-sm text-tertiary transition-colors hover:text-primary"
      >
        <ArrowLeft size={14} weight="regular" />
        Plány
      </Link>

      <PageHeader
        eyebrow="Finanční plán"
        title={customer?.full_name ?? 'Zákazník'}
        description={STATUS_LABEL[data.status] ?? data.status}
      />

      <ShareLinkPanel url={url} />
    </PageShell>
  );
}
