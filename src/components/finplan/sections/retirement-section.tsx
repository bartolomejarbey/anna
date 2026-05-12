import { Hourglass } from '@phosphor-icons/react/dist/ssr';
import type { Retirement } from '@/lib/calculator/finplan/types';
import { SectionFrame } from '../ui/section-frame';
import { HeroNumber } from '../ui/hero-number';
import { InfoPopover } from '../ui/info-popover';
import { fmtCZK } from '../ui/format';

interface Props {
  retirement: Retirement;
}

export function RetirementSection({ retirement }: Props) {
  const yearsToRetirement = Math.max(
    0,
    retirement.retirementAge - retirement.currentAge,
  );
  const gapPct =
    retirement.targetIncome > 0
      ? Math.min(
          100,
          Math.round(
            (retirement.expectedStatePension / retirement.targetIncome) * 100,
          ),
        )
      : 0;

  return (
    <SectionFrame kicker="Důchod" icon={Hourglass}>
      <div className="grid grid-cols-1 gap-12 md:grid-cols-2 md:gap-20">
        <div>
          <HeroNumber
            label={
              <>
                Doporučená měsíční úložka
                <InfoPopover label="Jak se počítá doporučená úložka">
                  Kolik měsíčně potřebuješ odkládat, aby tvůj investiční účet
                  v důchodovém věku pokryl mezeru mezi cílovou rentou a
                  očekávaným státním důchodem. Počítá se s reálným výnosem
                  portfolia a inflací.
                </InfoPopover>
              </>
            }
            value={fmtCZK(retirement.recommendedMonthlySaving)}
            accent
            caption={
              <>
                po dobu {yearsToRetirement} let při zhodnocení{' '}
                {retirement.annualReturnPct.toFixed(1)} % ročně
              </>
            }
          />

          <div className="mt-10 max-w-md">
            <div className="mb-2 flex items-baseline justify-between gap-3 text-body-sm">
              <span className="text-secondary">Stát pokryje</span>
              <span className="text-primary tabular-nums">{gapPct} %</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-subtle">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${gapPct}%` }}
              />
            </div>
            <div className="mt-2 text-body-sm text-tertiary">
              Mezera oproti cíli:{' '}
              <span className="text-primary tabular-nums">
                {fmtCZK(retirement.gap)}/měs
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-[12px] border border-border-subtle bg-surface px-6 py-7 md:px-7">
          <div className="mb-5 flex items-center gap-1.5 text-caption text-tertiary">
            Parametry plánu
            <InfoPopover label="Jak číst parametry plánu">
              Cílový příjem je úroveň, kterou chceš v důchodu udržet (typicky
              75 % současného čistého příjmu). Mezera je rozdíl mezi cílem a
              tím, co dostaneš od státu.
            </InfoPopover>
          </div>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-5">
            <Fact label="Současný věk" value={`${retirement.currentAge} let`} />
            <Fact
              label="Odchod do důchodu"
              value={`${retirement.retirementAge} let`}
            />
            <Fact
              label="Roky v důchodu"
              value={`${retirement.yearsInRetirement} let`}
            />
            <Fact label="Cílový příjem" value={fmtCZK(retirement.targetIncome)} />
            <Fact
              label="Státní důchod"
              value={fmtCZK(retirement.expectedStatePension)}
            />
            <Fact label="Mezera" value={fmtCZK(retirement.gap)} />
          </dl>
        </div>
      </div>
    </SectionFrame>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="mb-1 text-body-sm text-tertiary">{label}</dt>
      <dd className="text-body font-medium text-primary tabular-nums">
        {value}
      </dd>
    </div>
  );
}
