import { currentAdvisorId } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { NewFinplanForm } from '@/components/finplan/new-finplan-form';

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
    <div className="mx-auto w-full max-w-[640px] px-8 py-16">
      <p className="anna-section-rule mb-5" aria-hidden />
      <p className="mb-3 text-caption text-tertiary">Finanční plán</p>
      <h1 className="mb-6 text-h1 text-primary">Nový plán z dokumentů</h1>
      <p className="mb-12 text-prose text-secondary">
        Vyber zákazníka, kterého chceš požádat o výpisy a občanku. Anna pak vytvoří odkaz,
        který mu pošleš. Zákazník nahraje dokumenty, my je zpracujeme — a ty uvidíš cashflow,
        krytí a doporučení.
      </p>
      <NewFinplanForm customers={customers} />
    </div>
  );
}
