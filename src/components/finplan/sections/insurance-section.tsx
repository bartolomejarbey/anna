import type { EfaInsurance, Insurance } from '@/lib/calculator/finplan/types';

interface Props {
  insurance: Insurance;
  efa: EfaInsurance;
}

const CZK = new Intl.NumberFormat('cs-CZ', {
  style: 'currency',
  currency: 'CZK',
  maximumFractionDigits: 0,
});

export function InsuranceSection({ insurance, efa }: Props) {
  return (
    <section>
      <p className="anna-section-rule mb-5" aria-hidden />
      <h2 className="mb-2 text-h2 text-primary">Pojistné krytí</h2>
      <p className="mb-8 text-prose text-secondary">
        Výpočet podle EFA metodiky — kolik by mělo krýt smrt, invaliditu a vážné nemoci, aby
        rodina udržela životní úroveň.
      </p>

      <div className="mb-10 grid gap-4 md:grid-cols-2">
        <RecommendationTile
          label="Doporučená pojistná suma"
          value={CZK.format(insurance.recommended)}
          highlight
        />
        <RecommendationTile
          label="Doporučené měsíční pojistné"
          value={CZK.format(insurance.monthlyPremium)}
        />
      </div>

      <div className="mb-10">
        <h3 className="mb-4 text-h3 text-primary">Krytí podle rizik</h3>
        <ul className="divide-y divide-border-subtle rounded-[12px] border border-border-subtle bg-surface">
          <BreakdownRow label="Smrt" value={CZK.format(insurance.breakdown.death)} />
          <BreakdownRow label="Invalidita" value={CZK.format(insurance.breakdown.disability)} />
          <BreakdownRow label="Vážné nemoci" value={CZK.format(insurance.breakdown.illness)} />
          <BreakdownRow label="Úraz" value={CZK.format(insurance.breakdown.injury)} />
        </ul>
      </div>

      <div>
        <h3 className="mb-4 text-h3 text-primary">EFA detail</h3>
        <div className="overflow-x-auto rounded-[12px] border border-border-subtle bg-surface">
          <table className="w-full text-body-sm">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="px-5 py-3 text-left text-caption text-tertiary">Riziko</th>
                <th className="px-5 py-3 text-right text-caption text-tertiary">Příjem rodiny</th>
                <th className="px-5 py-3 text-right text-caption text-tertiary">Celkové výdaje</th>
                <th className="px-5 py-3 text-right text-caption text-tertiary">Nutné výdaje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              <EfaRow label="Smrt" row={efa.death} />
              <EfaRow label="Invalidita I" row={efa.disabilityI} />
              <EfaRow label="Invalidita II" row={efa.disabilityII} />
              <EfaRow label="Invalidita III" row={efa.disabilityIII} />
            </tbody>
          </table>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <EfaTile label="Trvalé následky úrazu" value={CZK.format(efa.permanentInjury)} />
          <EfaTile label="Vážné nemoci" value={CZK.format(efa.seriousIllness)} />
          <EfaTile label="Pracovní neschopnost / den" value={CZK.format(efa.workIncapacityDailyAmount)} />
          <EfaTile label="Hospitalizace / den" value={CZK.format(efa.hospitalizationDailyAmount)} />
          <EfaTile label="Úraz / den" value={CZK.format(efa.injuryDailyAmount)} />
        </div>
      </div>
    </section>
  );
}

function RecommendationTile({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-[12px] border p-6 ${
        highlight ? 'border-accent/30 bg-accent-muted' : 'border-border-subtle bg-surface'
      }`}
    >
      <p className="mb-3 text-caption text-tertiary">{label}</p>
      <p className="text-stat text-primary tabular-nums">{value}</p>
    </div>
  );
}

function BreakdownRow({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-center justify-between px-5 py-4">
      <span className="text-body text-primary">{label}</span>
      <span className="text-body font-medium text-primary tabular-nums">{value}</span>
    </li>
  );
}

function EfaRow({
  label,
  row,
}: {
  label: string;
  row: {
    forFamilyIncome: { recommendedSum: number | null };
    forTotalExpenses: { recommendedSum: number | null };
    forNecessaryExpenses: { recommendedSum: number | null };
  };
}) {
  const fmt = (v: number | null) => (v == null ? '—' : CZK.format(v));
  return (
    <tr>
      <td className="px-5 py-3 text-body text-primary">{label}</td>
      <td className="px-5 py-3 text-right text-body text-secondary tabular-nums">
        {fmt(row.forFamilyIncome.recommendedSum)}
      </td>
      <td className="px-5 py-3 text-right text-body text-secondary tabular-nums">
        {fmt(row.forTotalExpenses.recommendedSum)}
      </td>
      <td className="px-5 py-3 text-right text-body text-secondary tabular-nums">
        {fmt(row.forNecessaryExpenses.recommendedSum)}
      </td>
    </tr>
  );
}

function EfaTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] border border-border-subtle bg-surface p-5">
      <p className="mb-1 text-caption text-tertiary">{label}</p>
      <p className="text-h3 text-primary tabular-nums">{value}</p>
    </div>
  );
}
