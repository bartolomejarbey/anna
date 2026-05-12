import { currentAdvisorId } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { NewFinplanForm } from '@/components/lukas-finplan/new-finplan-form';
import { PageShell } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/ui/page-header';

export const metadata = { title: 'Nový finanční plán — Anna' };

export default async function NewFinplanPage() {
  const advisorId = await currentAdvisorId();
  const sb = supabaseAdmin();

  const { data } = await sb
    .from('customers')
    .select('id, full_name, email')
    .eq('advisor_id', advisorId)
    .order('full_name', { ascending: true });

  const customers = (data ?? []) as Array<{ id: string; full_name: string; email: string | null }>;

  return (
    <PageShell width="narrow">
      <PageHeader
        eyebrow="Finanční plán"
        title="Nový plán z dokumentů"
        description="Vyber zákazníka, kterého chceš požádat o výpisy a občanku. Anna vytvoří odkaz, který mu pošleš. Zákazník nahraje dokumenty, my je zpracujeme — a ty uvidíš cashflow, krytí a doporučení."
      />
      <NewFinplanForm customers={customers} />
    </PageShell>
  );
}
