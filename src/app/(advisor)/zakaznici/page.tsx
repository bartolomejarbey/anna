import { Users } from '@phosphor-icons/react/dist/ssr';
import { currentAdvisorId } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { NewCustomerButton } from '@/components/customers/new-customer-button';

export const metadata = { title: 'Zákazníci — Anna' };

const CZK = new Intl.NumberFormat('cs-CZ', {
  style: 'currency',
  currency: 'CZK',
  maximumFractionDigits: 0,
});

interface CustomerRow {
  id: string;
  full_name: string;
  email: string | null;
  monthly_income_czk: number | null;
  has_children: boolean | null;
  marital_status: string | null;
}

const MARITAL: Record<string, string> = {
  single: 'Svobodný/á',
  married: 'V manželství',
  divorced: 'Rozvedený/á',
  widowed: 'Vdovec/Vdova',
};

export default async function ZakazniciPage() {
  const advisorId = await currentAdvisorId();

  let customers: CustomerRow[] = [];
  let dbError = false;
  try {
    const { data, error } = await supabaseAdmin()
      .from('customers')
      .select('id, full_name, email, monthly_income_czk, has_children, marital_status')
      .eq('advisor_id', advisorId)
      .order('full_name');
    if (error) throw error;
    customers = (data ?? []) as CustomerRow[];
  } catch {
    dbError = true;
  }

  return (
    <div className="mx-auto w-full max-w-[960px] px-8 py-16">
      <div className="mb-12 flex items-end justify-between gap-6">
        <h1 className="text-h1 text-primary">Zákazníci</h1>
        <NewCustomerButton />
      </div>

      {dbError && (
        <p className="mb-8 text-body text-secondary">
          Data se zobrazí po napojení na databázi.
        </p>
      )}

      {!dbError && customers.length === 0 && (
        <EmptyState
          icon={Users}
          heading="Zatím žádný zákazník."
          description="Přidej zákazníka tlačítkem nahoře nebo začni rovnou schůzkou — Annu poznáš zatímco mluvíš."
          action={{ label: 'Začít schůzku', href: '/schuzky/nova' }}
        />
      )}

      {customers.length > 0 && (
        <div className="flex flex-col gap-3">
          {customers.map((c) => (
            <Card
              key={c.id}
              variant="compact"
              className="flex items-center justify-between"
            >
              <div className="flex flex-col gap-1">
                <p className="text-body font-medium text-primary">{c.full_name}</p>
                <p className="text-body-sm text-tertiary">
                  {[
                    c.email,
                    c.marital_status ? MARITAL[c.marital_status] ?? c.marital_status : null,
                    c.has_children ? 'děti' : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              <div className="text-body-sm text-secondary">
                {c.monthly_income_czk != null ? CZK.format(c.monthly_income_czk) : '—'}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
