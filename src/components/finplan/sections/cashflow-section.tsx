import type { Cashflow } from '@/lib/calculator/finplan/types';

interface Props {
  cashflow: Cashflow;
}

const CZK = new Intl.NumberFormat('cs-CZ', {
  style: 'currency',
  currency: 'CZK',
  maximumFractionDigits: 0,
});

export function CashflowSection({ cashflow }: Props) {
  const surplusPositive = cashflow.regularSurplus >= 0;

  return (
    <section>
      <p className="anna-section-rule mb-5" aria-hidden />
      <h2 className="mb-2 text-h2 text-primary">Cashflow</h2>
      <p className="mb-8 text-prose text-secondary">
        Měsíční tok peněz odvozený z bankovních výpisů. Volné peníze jsou to, co zbývá po
        nutných výdajích a doporučené úložce na důchod.
      </p>

      <div className="grid gap-4 md:grid-cols-3">
        <Tile
          label="Příjem"
          value={CZK.format(cashflow.income)}
          tone="default"
        />
        <Tile
          label="Výdaje"
          value={CZK.format(cashflow.expenses)}
          tone="default"
        />
        <Tile
          label={surplusPositive ? 'Volné peníze' : 'Schodek'}
          value={CZK.format(Math.abs(cashflow.regularSurplus))}
          tone={surplusPositive ? 'positive' : 'negative'}
        />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <SubTile
          label="Přebytek před úložkou"
          value={CZK.format(cashflow.surplus)}
        />
        <SubTile
          label="Doporučená úložka na důchod"
          value={CZK.format(cashflow.recommendedRetirementSaving)}
        />
      </div>
    </section>
  );
}

function Tile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'default' | 'positive' | 'negative';
}) {
  const toneClasses =
    tone === 'positive'
      ? 'border-success/30 bg-success-bg'
      : tone === 'negative'
        ? 'border-[color-mix(in_oklab,_var(--color-error)_30%,_transparent)] bg-error-bg'
        : 'border-border-subtle bg-surface';

  return (
    <div className={`rounded-[12px] border p-6 ${toneClasses}`}>
      <p className="mb-3 text-caption text-tertiary">{label}</p>
      <p className="text-stat text-primary tabular-nums">{value}</p>
    </div>
  );
}

function SubTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] border border-border-subtle bg-surface p-5">
      <p className="mb-1 text-caption text-tertiary">{label}</p>
      <p className="text-h3 text-primary tabular-nums">{value}</p>
    </div>
  );
}
