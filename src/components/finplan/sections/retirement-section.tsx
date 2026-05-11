import type { Retirement } from '@/lib/calculator/finplan/types';

interface Props {
  retirement: Retirement;
}

const CZK = new Intl.NumberFormat('cs-CZ', {
  style: 'currency',
  currency: 'CZK',
  maximumFractionDigits: 0,
});

export function RetirementSection({ retirement }: Props) {
  const yearsToRetirement = Math.max(0, retirement.retirementAge - retirement.currentAge);

  return (
    <section>
      <p className="anna-section-rule mb-5" aria-hidden />
      <h2 className="mb-2 text-h2 text-primary">Důchod</h2>
      <p className="mb-8 text-prose text-secondary">
        Cílová životní úroveň v důchodu — kolik měsíčně potřebujeme, kolik dostaneme od státu a
        kolik je třeba měsíčně odkládat, abychom rozdíl pokryli.
      </p>

      <div className="mb-8 rounded-[12px] border border-accent/30 bg-accent-muted p-6">
        <p className="mb-3 text-caption text-tertiary">Doporučená měsíční úložka</p>
        <p className="text-stat text-primary tabular-nums">
          {CZK.format(retirement.recommendedMonthlySaving)}
        </p>
        <p className="mt-3 text-body-sm text-secondary">
          Po dobu {yearsToRetirement} let při zhodnocení {retirement.annualReturnPct.toFixed(1)} %
          ročně.
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-x-12 gap-y-6 md:grid-cols-3">
        <Row label="Současný věk" value={`${retirement.currentAge} let`} />
        <Row label="Odchod do důchodu" value={`${retirement.retirementAge} let`} />
        <Row label="Roky v důchodu" value={`${retirement.yearsInRetirement} let`} />
        <Row label="Cílový příjem" value={CZK.format(retirement.targetIncome)} />
        <Row label="Očekávaný státní důchod" value={CZK.format(retirement.expectedStatePension)} />
        <Row label="Mezera v příjmu" value={CZK.format(retirement.gap)} />
      </dl>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="mb-1 text-caption text-tertiary">{label}</dt>
      <dd className="text-body font-medium text-primary tabular-nums">{value}</dd>
    </div>
  );
}
