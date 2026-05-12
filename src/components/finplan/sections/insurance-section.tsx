import { Shield } from '@phosphor-icons/react/dist/ssr';
import type {
  EfaInputs,
  EfaInsurance,
  Insurance,
} from '@/lib/calculator/finplan/types';
import { SectionFrame } from '../ui/section-frame';
import { HeroNumber } from '../ui/hero-number';
import { InfoPopover } from '../ui/info-popover';
import { DisclosureRow, BreakdownLine } from '../ui/disclosure-row';
import { fmtCZK, fmtNumber, fmtSum } from '../ui/format';

interface Props {
  insurance: Insurance;
  efa: EfaInsurance;
  efaInputs: EfaInputs;
}

interface RiskDef {
  key: string;
  label: string;
  helper: string;
  recommended: number | null;
  formula: string;
  breakdown: Array<{ label: string; value?: string; emphasis?: boolean }>;
}

function buildRisks(
  efa: EfaInsurance,
  inputs: EfaInputs,
  totalExpenses: number,
): RiskDef[] {
  const widowState =
    inputs.widowPension * inputs.hasPartner +
    inputs.orphanPension * inputs.childrenCount;
  const familyIncomeAfterDeath =
    widowState +
    inputs.familyNetIncomeWithoutClient +
    inputs.rentPassive +
    inputs.otherPassive;
  const fullClientIncome =
    inputs.netIncomeActive +
    inputs.rentActive +
    inputs.otherActive +
    inputs.rentPassive +
    inputs.otherPassive;
  const fullHouseholdIncome =
    fullClientIncome + inputs.familyNetIncomeWithoutClient;

  const buildDisabilityBreakdown = (
    statePension: number,
    drop: number,
    correction: number,
    monthlyCashflow: number,
  ): RiskDef['breakdown'] => {
    const active =
      inputs.netIncomeActive + inputs.rentActive + inputs.otherActive;
    const remaining = active * (1 - drop);
    const passive = inputs.rentPassive + inputs.otherPassive;
    const correctedExpenses = totalExpenses * (1 + correction);
    const householdIncome =
      remaining + passive + statePension + inputs.familyNetIncomeWithoutClient;
    return [
      {
        label: 'Invalidní důchod od státu',
        value: `${fmtNumber(statePension)} Kč/měs`,
      },
      {
        label: `Pokles aktivních příjmů (${(drop * 100).toFixed(0)} %)`,
        value: `−${fmtNumber(active * drop)} Kč/měs`,
      },
      {
        label: 'Příjem rodiny bez klienta',
        value: `${fmtNumber(inputs.familyNetIncomeWithoutClient)} Kč/měs`,
      },
      {
        label: `Výdaje korigované (${(correction * 100).toFixed(0)} %)`,
        value: `${fmtNumber(correctedExpenses)} Kč/měs`,
      },
      {
        label: `Domácnost: ${fmtNumber(householdIncome)} − ${fmtNumber(correctedExpenses)} Kč/měs`,
      },
      {
        label: 'Měsíční CF (chybí)',
        value: `${fmtNumber(monthlyCashflow)} Kč/měs`,
        emphasis: true,
      },
    ];
  };

  return [
    {
      key: 'death',
      label: 'Smrt',
      helper: `Krytí pro příjmy rodiny · ${efa.death.forFamilyIncome.yearsCovered} let`,
      recommended: efa.death.forFamilyIncome.recommendedSum,
      formula: 'PV anuit · zhodnocení 2 % p.a.',
      breakdown: [
        {
          label: `Vdovský důchod${inputs.hasPartner ? ' (× partner)' : ''}`,
          value: `${fmtNumber(inputs.widowPension * inputs.hasPartner)} Kč/měs`,
        },
        {
          label: `Sirotčí důchod (× ${inputs.childrenCount} dětí)`,
          value: `${fmtNumber(inputs.orphanPension * inputs.childrenCount)} Kč/měs`,
        },
        {
          label: 'Příjem rodiny bez klienta',
          value: `${fmtNumber(inputs.familyNetIncomeWithoutClient)} Kč/měs`,
        },
        {
          label: 'Pasivní příjmy',
          value: `${fmtNumber(inputs.rentPassive + inputs.otherPassive)} Kč/měs`,
        },
        {
          label: 'Příjem rodiny po smrti (celkem)',
          value: `${fmtNumber(familyIncomeAfterDeath)} Kč/měs`,
        },
        {
          label: 'Plný současný příjem domácnosti',
          value: `${fmtNumber(fullHouseholdIncome)} Kč/měs`,
        },
        {
          label: 'Měsíční CF (chybí)',
          value: `${fmtNumber(efa.death.forFamilyIncome.monthlyCashflow)} Kč/měs`,
          emphasis: true,
        },
      ],
    },
    {
      key: 'disabilityIII',
      label: 'Invalidita III. stupně',
      helper: `Krytí pro celkové výdaje · ${efa.disabilityIII.forTotalExpenses.yearsCovered} let`,
      recommended: efa.disabilityIII.forTotalExpenses.recommendedSum,
      formula: 'PV anuit · zhodnocení 2 % p.a.',
      breakdown: buildDisabilityBreakdown(
        inputs.statePensionDisabilityIII,
        inputs.disabilityIncomeDropIII,
        inputs.expensesCorrectionDisabilityIII,
        efa.disabilityIII.forTotalExpenses.monthlyCashflow,
      ),
    },
    {
      key: 'disabilityII',
      label: 'Invalidita II. stupně',
      helper: `Krytí pro celkové výdaje · ${efa.disabilityII.forTotalExpenses.yearsCovered} let`,
      recommended: efa.disabilityII.forTotalExpenses.recommendedSum,
      formula: 'PV anuit · zhodnocení 2 % p.a.',
      breakdown: buildDisabilityBreakdown(
        inputs.statePensionDisabilityII,
        inputs.disabilityIncomeDropII,
        inputs.expensesCorrectionDisabilityII,
        efa.disabilityII.forTotalExpenses.monthlyCashflow,
      ),
    },
    {
      key: 'disabilityI',
      label: 'Invalidita I. stupně',
      helper: `Krytí pro celkové výdaje · ${efa.disabilityI.forTotalExpenses.yearsCovered} let`,
      recommended: efa.disabilityI.forTotalExpenses.recommendedSum,
      formula: 'PV anuit · zhodnocení 2 % p.a.',
      breakdown: buildDisabilityBreakdown(
        inputs.statePensionDisabilityI,
        inputs.disabilityIncomeDropI,
        inputs.expensesCorrectionDisabilityI,
        efa.disabilityI.forTotalExpenses.monthlyCashflow,
      ),
    },
    {
      key: 'illness',
      label: 'Závažné onemocnění',
      helper: '24 × čistý měsíční příjem',
      recommended: efa.seriousIllness,
      formula: 'čistý měsíční příjem × 24 měsíců',
      breakdown: [
        {
          label: 'Čistý měsíční příjem klienta',
          value: `${fmtNumber(inputs.netIncomeActive)} Kč/měs`,
        },
        {
          label: '× 24 měsíců',
          value: `${fmtNumber(efa.seriousIllness)} Kč`,
          emphasis: true,
        },
      ],
    },
    {
      key: 'injury',
      label: 'Trvalé následky úrazu',
      helper: 'Min. 1 mil. Kč, jinak 50 % krytí inv. III.',
      recommended: efa.permanentInjury,
      formula: 'max(1 000 000; 50 % krytí inv. III)',
      breakdown: [
        {
          label: 'Krytí pro příjmy rodiny — inv. III',
          value: `${fmtNumber(efa.disabilityIII.forFamilyIncome.recommendedSum ?? 0)} Kč`,
        },
        {
          label: 'Polovina (50 %)',
          value: `${fmtNumber((efa.disabilityIII.forFamilyIncome.recommendedSum ?? 0) * 0.5)} Kč`,
        },
        {
          label: 'Doporučeno',
          value: `${fmtNumber(efa.permanentInjury)} Kč`,
          emphasis: true,
        },
      ],
    },
  ];
}

export function InsuranceSection({ insurance, efa, efaInputs }: Props) {
  const totalExpenses =
    efaInputs.expensesNecessary + efaInputs.expensesDiscretionary;
  const risks = buildRisks(efa, efaInputs, totalExpenses);

  const dailyAmounts = [
    { label: 'Pracovní neschopnost', value: efa.workIncapacityDailyAmount },
    { label: 'Hospitalizace', value: efa.hospitalizationDailyAmount },
    { label: 'Denní odškodné úrazem', value: efa.injuryDailyAmount },
  ];

  return (
    <SectionFrame kicker="Životní pojištění · metodika EFA" icon={Shield}>
      <HeroNumber
        label={
          <>
            Doporučená pojistná suma
            <InfoPopover label="Co je EFA metodika">
              European Financial Advisory — evropská metodika výpočtu pojistné
              ochrany. Pojistka má pokrýt výpadek příjmu rodiny při smrti,
              invaliditě i závažné nemoci. Čísla vycházejí z výdajů, příjmů a
              dávek od státu.
            </InfoPopover>
          </>
        }
        value={fmtCZK(insurance.recommended)}
        accent
        caption={
          <>
            Doporučené měsíční pojistné{' '}
            <span className="text-primary tabular-nums">
              {fmtCZK(insurance.monthlyPremium)}
            </span>
          </>
        }
      />

      <div className="mt-16 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="rounded-[12px] border border-border-subtle bg-surface px-6 py-7 md:px-7">
          <div className="mb-4 flex items-center gap-1.5 text-caption text-tertiary">
            Nosná rizika
            <InfoPopover label="Co jsou nosná rizika">
              Pět hlavních rizik, na která se EFA zaměřuje: smrt, tři stupně
              invalidity, závažná nemoc a trvalé následky úrazu. Klikni na
              řádek pro detail výpočtu.
            </InfoPopover>
          </div>
          <div className="divide-y divide-border-subtle">
            {risks.map((r) => (
              <DisclosureRow
                key={r.key}
                label={r.label}
                helper={r.helper}
                value={fmtSum(r.recommended)}
              >
                <div className="mb-3 text-caption text-tertiary">Výpočet</div>
                <div className="mb-3 text-body-sm text-secondary">
                  {r.formula}
                </div>
                <div className="space-y-1.5">
                  {r.breakdown.map((b, i) => (
                    <BreakdownLine
                      key={i}
                      label={b.label}
                      value={b.value}
                      emphasis={b.emphasis}
                    />
                  ))}
                </div>
              </DisclosureRow>
            ))}
          </div>
        </div>

        <div className="rounded-[12px] border border-border-subtle bg-surface px-6 py-7 md:px-7">
          <div className="mb-4 flex items-center gap-1.5 text-caption text-tertiary">
            Denní dávky
            <InfoPopover label="Co jsou denní dávky">
              Jednorázové denní výplaty pro období pracovní neschopnosti,
              hospitalizace nebo po úrazu. Vypočteno tak, aby pokryly výpadek
              příjmu po odečtu státních dávek a dalších zdrojů.
            </InfoPopover>
          </div>
          <div className="divide-y divide-border-subtle">
            {dailyAmounts.map((d) => (
              <div
                key={d.label}
                className="flex items-baseline justify-between gap-4 py-4"
              >
                <div className="text-body text-primary">{d.label}</div>
                <div className="whitespace-nowrap text-body text-primary tabular-nums">
                  {d.value > 0
                    ? `${fmtNumber(d.value)} Kč/den`
                    : 'Není třeba zajistit'}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 text-body-sm text-tertiary leading-relaxed">
            (měsíční výdaje − státní nemocenská − příjem rodiny − pasivní
            příjmy) / 30
          </div>
        </div>
      </div>
    </SectionFrame>
  );
}
