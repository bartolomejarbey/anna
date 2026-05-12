import { Users } from '@phosphor-icons/react/dist/ssr';
import { currentAdvisorId } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { EmptyState } from '@/components/ui/empty-state';
import { NewCustomerButton } from '@/components/customers/new-customer-button';
import { PageShell } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/ui/page-header';
import { ListRow } from '@/components/ui/list-row';
import { Avatar } from '@/components/ui/avatar';

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
    <PageShell>
      <PageHeader
        title="Zákazníci"
        description="Lidé, kterým pomáháš s financemi."
        actions={<NewCustomerButton />}
      />

      {dbError && (
        <p className="mb-8 text-body text-secondary">
          Data se zobrazí po napojení na databázi.
        </p>
      )}

      {!dbError && customers.length === 0 && (
        <EmptyState
          icon={Users}
          heading="Zatím žádný zákazník."
          description="Přidej zákazníka tlačítkem nahoře nebo začni rovnou schůzkou — Anna ho pozná zatímco mluvíš."
          action={{ label: 'Začít schůzku', href: '/schuzky/nova' }}
        />
      )}

      {customers.length > 0 && (
        <ul className="divide-y divide-border-subtle">
          {customers.map((c) => {
            const meta = [
              c.email,
              c.marital_status ? MARITAL[c.marital_status] ?? c.marital_status : null,
              c.has_children ? 'děti' : null,
            ]
              .filter(Boolean)
              .join(' · ');

            return (
              <li key={c.id}>
                <ListRow
                  href={`/zakaznici/${c.id}`}
                  primary={
                    <span className="inline-flex items-center gap-3">
                      <Avatar name={c.full_name} size="default" />
                      <span className="font-medium">{c.full_name}</span>
                    </span>
                  }
                  secondary={meta || '—'}
                  trailing={
                    <span className="text-body-sm text-secondary tabular-nums">
                      {c.monthly_income_czk != null ? CZK.format(c.monthly_income_czk) : '—'}
                    </span>
                  }
                />
              </li>
            );
          })}
        </ul>
      )}
    </PageShell>
  );
}
