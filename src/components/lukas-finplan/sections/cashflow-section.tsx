import { Wallet } from '@phosphor-icons/react/dist/ssr';
import type { Cashflow } from '@/lib/calculator/finplan/types';
import { SectionFrame } from '../ui/section-frame';
import { HeroNumber } from '../ui/hero-number';
import { InfoPopover } from '../ui/info-popover';
import { fmtCZK } from '../ui/format';

interface Props {
  cashflow: Cashflow;
}

export function CashflowSection({ cashflow }: Props) {
  const surplusPositive = cashflow.surplus >= 0;
  const regularPositive = cashflow.regularSurplus >= 0;

  return (
    <SectionFrame kicker="Cash flow" icon={Wallet}>
      <div className="grid grid-cols-1 gap-12 md:grid-cols-2 md:gap-20">
        <div>
          <HeroNumber
            label={
              <>
                Volný měsíční zůstatek
                <InfoPopover label="Co je volný měsíční zůstatek">
                  Měsíční příjmy minus výdaje. Co zbývá k dispozici na úložky,
                  rezervy a nepravidelné výdaje.
                </InfoPopover>
              </>
            }
            value={fmtCZK(cashflow.surplus)}
            accent={surplusPositive}
            caption={
              <>
                z příjmu {fmtCZK(cashflow.income)} po výdajích{' '}
                {fmtCZK(cashflow.expenses)}
              </>
            }
          />

          <div className="mt-10 max-w-md rounded-[12px] border border-border-subtle bg-surface px-5 py-4">
            <div className="flex items-center gap-1.5 text-body-sm text-tertiary">
              Pravidelný přebytek
              <InfoPopover label="Co je pravidelný přebytek">
                Volný zůstatek po odečtu doporučené měsíční úložky na důchod.
                Tohle máš opravdu volně k dispozici.
              </InfoPopover>
            </div>
            <div
              className={`mt-1 text-h2 tabular-nums ${
                regularPositive ? 'text-primary' : 'text-error'
              }`}
            >
              {fmtCZK(cashflow.regularSurplus)}
            </div>
            <div className="mt-1 text-body-sm text-tertiary">
              {fmtCZK(cashflow.surplus)} zůstatek −{' '}
              {fmtCZK(cashflow.recommendedRetirementSaving)} úložka na důchod
            </div>
          </div>
        </div>

        <div className="rounded-[12px] border border-border-subtle bg-surface px-6 py-7 md:px-8">
          <div className="mb-5 text-body-sm text-tertiary">Měsíční rozvaha</div>
          <CashflowBars cashflow={cashflow} />
        </div>
      </div>
    </SectionFrame>
  );
}

function CashflowBars({ cashflow }: { cashflow: Cashflow }) {
  const max = Math.max(cashflow.income, cashflow.expenses, 1);
  const incomePct = (cashflow.income / max) * 100;
  const expensePct = (cashflow.expenses / max) * 100;
  const surplusPct = (Math.max(cashflow.surplus, 0) / max) * 100;

  return (
    <div className="space-y-5">
      <BarRow
        label="Příjmy"
        value={fmtCZK(cashflow.income)}
        widthPct={incomePct}
        tone="primary"
      />
      <BarRow
        label="Výdaje"
        value={fmtCZK(cashflow.expenses)}
        widthPct={expensePct}
        tone="muted"
      />
      <BarRow
        label="Zbývá"
        value={fmtCZK(Math.max(cashflow.surplus, 0))}
        widthPct={surplusPct}
        tone="accent"
      />
    </div>
  );
}

function BarRow({
  label,
  value,
  widthPct,
  tone,
}: {
  label: string;
  value: string;
  widthPct: number;
  tone: 'primary' | 'muted' | 'accent';
}) {
  const fill =
    tone === 'accent'
      ? 'bg-accent'
      : tone === 'primary'
        ? 'bg-primary'
        : 'bg-bg-inset';

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-body-sm">
        <span className="text-secondary">{label}</span>
        <span className="tabular-nums text-primary">{value}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-subtle">
        <div
          className={`h-full rounded-full transition-all duration-500 ${fill}`}
          style={{ width: `${Math.min(100, Math.max(0, widthPct))}%` }}
        />
      </div>
    </div>
  );
}
