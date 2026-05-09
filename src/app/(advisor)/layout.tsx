import { AdvisorShell } from '@/components/layout/advisor-shell';
import { currentAdvisor, currentAdvisorId } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

type CustomerJoin = { full_name: string } | { full_name: string }[] | null;

function joinName(c: CustomerJoin): string | null {
  if (!c) return null;
  if (Array.isArray(c)) return c[0]?.full_name ?? null;
  return c.full_name ?? null;
}

export default async function AdvisorLayout({ children }: { children: React.ReactNode }) {
  const advisor = (await currentAdvisor()) ?? {
    id: 'unknown',
    full_name: 'Poradce',
    email: '',
    role: 'advisor' as const,
    avatar_url: null,
  };

  const advisorId = await currentAdvisorId();
  const sb = supabaseAdmin();

  const [customersRes, meetingsRes] = await Promise.all([
    sb
      .from('customers')
      .select('id, full_name')
      .eq('advisor_id', advisorId)
      .order('full_name', { ascending: true })
      .limit(50),
    sb
      .from('meetings')
      .select('id, created_at, customer:customers(full_name)')
      .eq('advisor_id', advisorId)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  const customers = ((customersRes.data ?? []) as Array<{ id: string; full_name: string }>).map(
    (c) => ({ id: c.id, full_name: c.full_name }),
  );

  const recentMeetings = (
    (meetingsRes.data ?? []) as Array<{ id: string; created_at: string; customer: CustomerJoin }>
  ).map((m) => ({
    id: m.id,
    created_at: m.created_at,
    customer_name: joinName(m.customer),
  }));

  return (
    <AdvisorShell advisor={advisor} customers={customers} recentMeetings={recentMeetings}>
      {children}
    </AdvisorShell>
  );
}
