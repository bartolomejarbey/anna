import type { PlanData } from '@/lib/calculator/finplan/types';

interface Props {
  customerName: string;
  plan: PlanData;
}

const CZK = new Intl.NumberFormat('cs-CZ', {
  style: 'currency',
  currency: 'CZK',
  maximumFractionDigits: 0,
});

export function ClientHeader({ customerName, plan }: Props) {
  const { client, cashflow } = plan;

  return (
    <header>
      <p className="anna-section-rule mb-5" aria-hidden />
      <p className="mb-3 text-caption text-tertiary">Finanční plán</p>
      <h1 className="mb-8 text-h1 text-primary">{customerName || client.name}</h1>

      <dl className="grid grid-cols-2 gap-x-12 gap-y-4 md:grid-cols-4">
        <Stat label="Věk" value={client.age ? `${client.age}` : '—'} />
        <Stat label="Rodina" value={client.family || '—'} />
        <Stat label="Měsíční příjem" value={CZK.format(cashflow.income)} />
        <Stat label="Měsíční výdaje" value={CZK.format(cashflow.expenses)} />
      </dl>
    </header>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="mb-1 text-caption text-tertiary">{label}</dt>
      <dd className="text-body font-medium text-primary tabular-nums">{value}</dd>
    </div>
  );
}
