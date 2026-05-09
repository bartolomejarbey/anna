import Link from 'next/link';
import { Users } from 'lucide-react';
import { currentAdvisorId } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';

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
    <div className="mx-auto w-full max-w-[1280px] px-8 py-12">
      <div className="mb-10">
        <h1 className="text-4xl font-semibold text-text-primary">Zákazníci</h1>
        <p className="mt-2 text-[15px] text-text-secondary">
          {customers.length > 0
            ? `${customers.length} zákazníků v péči.`
            : 'Vaši zákazníci se zobrazí po první schůzce.'}
        </p>
      </div>

      {dbError && (
        <div className="mb-8 rounded-xl border border-border-subtle bg-bg-tertiary px-6 py-4">
          <p className="text-[15px] text-text-secondary">
            Data se zobrazí po napojení na databázi.
          </p>
        </div>
      )}

      {!dbError && customers.length === 0 && (
        <EmptyState
          icon={Users}
          heading="Žádný zákazník v systému."
          description="Přidávejte je ze stránky schůzky."
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
                <p className="text-[15px] font-medium text-text-primary">{c.full_name}</p>
                <p className="text-[13px] text-text-tertiary">
                  {[
                    c.email,
                    c.marital_status ? MARITAL[c.marital_status] ?? c.marital_status : null,
                    c.has_children ? 'děti' : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              <div className="text-[13px] text-text-secondary">
                {c.monthly_income_czk != null ? CZK.format(c.monthly_income_czk) : '—'}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
