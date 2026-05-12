'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  CaretLeft,
  CaretRight,
  CheckCircle,
  Plus,
  Trash,
  Spinner,
} from '@phosphor-icons/react';
import {
  CATEGORIES,
  STEP_DEBTS_FROM_CATEGORIES,
  STEP_INCOME,
  STEP_INTRO,
  STEP_SUMMARY,
  TOTAL_STEPS,
  categoryForStep,
  shouldSkipStep,
  type CategoryDef,
  type FieldDef,
  type FormCategory,
  type FormDebt,
  type FormFieldValue,
  type FormResponseData,
} from '@/lib/finplan/form-types';
import {
  saveFormStep,
  submitFinplanFormSession,
} from '@/lib/actions/finplan-customer-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/cn';

type EmploymentType = 'employee' | 'selfemployed';
type PrivacyMode = 'full' | 'categorized' | 'aggregate_only';

interface Props {
  token: string;
  customerName: string;
  advisorName: string;
  initialData: FormResponseData;
  initialStep: number;
  initialEmploymentType: EmploymentType;
  initialPrivacyMode: PrivacyMode;
}

export function CustomerFormWizard({
  token,
  customerName,
  advisorName,
  initialData,
  initialStep,
  initialEmploymentType,
  initialPrivacyMode,
}: Props) {
  const router = useRouter();
  const [data, setData] = useState<FormResponseData>(initialData);
  const [step, setStep] = useState<number>(initialStep);
  const [employmentType, setEmploymentType] = useState<EmploymentType>(initialEmploymentType);
  const [privacyMode, setPrivacyMode] = useState<PrivacyMode>(initialPrivacyMode);
  const [isSubmitting, startSubmit] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  // ── Autosave (debounced 800ms) ──────────────────────────────────────
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextSave = useRef(true); // skip first auto-save on mount
  useEffect(() => {
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveFormStep({ token, data, currentStep: step })
        .then(() => setSavedAt(new Date()))
        .catch(() => {
          // autosave failed — UI nezachytává, customer to ucítí až při submitu
        });
    }, 800);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [data, step, token]);

  // ── Navigation helpers ──────────────────────────────────────────────
  const goToStep = useCallback(
    (next: number) => {
      let target = Math.max(STEP_INTRO, Math.min(STEP_SUMMARY, next));
      // Skip conditional steps (Děti pokud hasChildren=false)
      while (target > STEP_INTRO && target < STEP_SUMMARY && shouldSkipStep(target, data)) {
        target += next > step ? 1 : -1;
      }
      setStep(target);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [data, step],
  );

  const handleNext = () => goToStep(step + 1);
  const handleBack = () => goToStep(step - 1);

  // ── Field updates ───────────────────────────────────────────────────
  const updateField = useCallback(
    (categoryKey: keyof FormResponseData['expenses'], fieldKey: string, partial: Partial<FormFieldValue>) => {
      setData((d) => ({
        ...d,
        expenses: {
          ...d.expenses,
          [categoryKey]: {
            ...d.expenses[categoryKey],
            fields: {
              ...d.expenses[categoryKey].fields,
              [fieldKey]: {
                ...d.expenses[categoryKey].fields[fieldKey],
                ...partial,
              } as FormFieldValue,
            },
          },
        },
      }));
    },
    [],
  );

  const setCategorySkipped = useCallback(
    (categoryKey: keyof FormResponseData['expenses'], skipped: boolean) => {
      setData((d) => ({
        ...d,
        expenses: {
          ...d.expenses,
          [categoryKey]: {
            ...d.expenses[categoryKey],
            skipped,
          },
        },
      }));
    },
    [],
  );

  // ── Submit ──────────────────────────────────────────────────────────
  const handleSubmit = () => {
    setError(null);
    if (data.income.netMonthly == null) {
      setError('Vyplň prosím čistou měsíční mzdu — bez příjmu nelze plán spočítat.');
      goToStep(STEP_INCOME);
      return;
    }
    startSubmit(async () => {
      try {
        await submitFinplanFormSession({ token, data, employmentType, privacyMode });
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    });
  };

  // ── Step computation for progress ───────────────────────────────────
  const visibleTotal = useMemo(() => {
    let total = TOTAL_STEPS;
    if (!data.hasChildren) total -= 1; // skip Děti step
    return total;
  }, [data.hasChildren]);

  const visibleStepIndex = useMemo(() => {
    let idx = 0;
    for (let i = STEP_INTRO; i <= step; i += 1) {
      if (!shouldSkipStep(i, data)) idx += 1;
    }
    return idx;
  }, [step, data]);

  // ── Render ──────────────────────────────────────────────────────────
  const category = categoryForStep(step);

  return (
    <div className="flex flex-col gap-10">
      <ProgressBar current={visibleStepIndex} total={visibleTotal} savedAt={savedAt} />

      {error && (
        <div className="rounded-[8px] border border-[color-mix(in_oklab,_var(--color-error)_30%,_transparent)] bg-error-bg px-4 py-3 text-body-sm text-error">
          {error}
        </div>
      )}

      {step === STEP_INTRO && (
        <IntroStep
          customerName={customerName}
          advisorName={advisorName}
          employmentType={employmentType}
          onEmploymentTypeChange={setEmploymentType}
          privacyMode={privacyMode}
          onPrivacyModeChange={setPrivacyMode}
          hasChildren={data.hasChildren}
          onHasChildrenChange={(v) => setData((d) => ({ ...d, hasChildren: v }))}
        />
      )}

      {step === STEP_INCOME && (
        <IncomeStep
          income={data.income}
          employmentType={employmentType}
          onChange={(partial) =>
            setData((d) => ({ ...d, income: { ...d.income, ...partial } }))
          }
        />
      )}

      {category && (
        <CategoryStep
          category={category}
          state={data.expenses[category.key]}
          onFieldChange={(fieldKey, partial) => updateField(category.key, fieldKey, partial)}
          onSkippedChange={(v) => setCategorySkipped(category.key, v)}
        />
      )}

      {step === STEP_DEBTS_FROM_CATEGORIES && (
        <DebtsStep
          debts={data.debts}
          onChange={(debts) => setData((d) => ({ ...d, debts }))}
        />
      )}

      {step === STEP_SUMMARY && (
        <SummaryStep
          data={data}
          employmentType={employmentType}
        />
      )}

      {/* ── Navigation ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 border-t border-border-subtle pt-8">
        <Button
          variant="ghost"
          size="default"
          onClick={handleBack}
          disabled={step === STEP_INTRO || isSubmitting}
        >
          <CaretLeft size={16} weight="regular" className="mr-2" />
          Zpět
        </Button>

        {step === STEP_SUMMARY ? (
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <Spinner size={16} weight="regular" className="animate-spin" />
                Odesílám…
              </span>
            ) : (
              'Odeslat'
            )}
          </Button>
        ) : (
          <Button onClick={handleNext} disabled={isSubmitting}>
            Pokračovat
            <CaretRight size={16} weight="regular" className="ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Progress bar
// ════════════════════════════════════════════════════════════════════

function ProgressBar({
  current,
  total,
  savedAt,
}: {
  current: number;
  total: number;
  savedAt: Date | null;
}) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-caption text-tertiary">
          Krok {current} z {total}
        </p>
        {savedAt && (
          <p className="text-caption text-tertiary">
            Uloženo {savedAt.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-subtle">
        <div
          className="h-full bg-accent transition-all"
          style={{
            width: `${pct}%`,
            transitionDuration: '300ms',
            transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Step: Intro
// ════════════════════════════════════════════════════════════════════

function IntroStep({
  customerName,
  advisorName,
  employmentType,
  onEmploymentTypeChange,
  privacyMode,
  onPrivacyModeChange,
  hasChildren,
  onHasChildrenChange,
}: {
  customerName: string;
  advisorName: string;
  employmentType: EmploymentType;
  onEmploymentTypeChange: (v: EmploymentType) => void;
  privacyMode: PrivacyMode;
  onPrivacyModeChange: (v: PrivacyMode) => void;
  hasChildren: boolean;
  onHasChildrenChange: (v: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-10">
      <header>
        <p className="anna-section-rule mb-5" aria-hidden />
        <p className="mb-4 text-caption text-tertiary">Ruční vyplnění</p>
        <h1 className="mb-6 text-h1 text-primary">
          {customerName ? `${customerName.split(' ')[0]}, ` : ''}
          projdeme tvoje příjmy a výdaje po kategoriích.
        </h1>
        <p className="text-prose text-secondary">
          Bude to trvat 5–10 minut. Po každém kroku se odpovědi ukládají, takže můžeš
          klidně skončit a vrátit se. Tam, kde nevíš přesnou částku, klikni na &bdquo;Nevím&ldquo;.
          Tvůj poradce {advisorName} pak dostane stejný plán jako kdyby měl výpisy.
        </p>
      </header>

      <Section title="Jak vyděláváš?">
        <div className="inline-flex rounded-[10px] border border-border-default bg-surface p-1">
          <SegmentBtn
            active={employmentType === 'employee'}
            onClick={() => onEmploymentTypeChange('employee')}
          >
            Zaměstnanec
          </SegmentBtn>
          <SegmentBtn
            active={employmentType === 'selfemployed'}
            onClick={() => onEmploymentTypeChange('selfemployed')}
          >
            OSVČ
          </SegmentBtn>
        </div>
      </Section>

      <Section title="Máš děti?" hint="Pokud ano, přidáme krok pro náklady na děti.">
        <div className="inline-flex rounded-[10px] border border-border-default bg-surface p-1">
          <SegmentBtn active={hasChildren} onClick={() => onHasChildrenChange(true)}>
            Ano
          </SegmentBtn>
          <SegmentBtn active={!hasChildren} onClick={() => onHasChildrenChange(false)}>
            Ne
          </SegmentBtn>
        </div>
      </Section>

      <Section
        title="Co uvidí tvůj poradce?"
        hint="Detail výdajových kategorií, nebo jen souhrnné částky — ty rozhoduješ."
      >
        <div className="flex flex-col gap-3">
          <PrivacyOption
            label="Kategorizovaně"
            description="Bydlení, jídlo, doprava…. — poradce vidí, kam peníze tečou."
            active={privacyMode === 'full'}
            onClick={() => onPrivacyModeChange('full')}
          />
          <PrivacyOption
            label="Nutné vs. zbytné"
            recommended
            description="Souhrn nezbytných a zbytných výdajů. Stačí pro dobré doporučení."
            active={privacyMode === 'categorized'}
            onClick={() => onPrivacyModeChange('categorized')}
          />
          <PrivacyOption
            label="Pouze celkový součet"
            description="Poradce vidí jen měsíční příjem a výdaj."
            active={privacyMode === 'aggregate_only'}
            onClick={() => onPrivacyModeChange('aggregate_only')}
            warning
          />
        </div>
      </Section>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Step: Income
// ════════════════════════════════════════════════════════════════════

function IncomeStep({
  income,
  employmentType,
  onChange,
}: {
  income: FormResponseData['income'];
  employmentType: EmploymentType;
  onChange: (partial: Partial<FormResponseData['income']>) => void;
}) {
  const netLabel = employmentType === 'selfemployed' ? 'Čistý měsíční zisk z OSVČ' : 'Čistá měsíční mzda';
  const netHint =
    employmentType === 'selfemployed'
      ? 'Po odečtení daně a odvodů — to, co ti reálně zbývá.'
      : 'To, co ti chodí na účet po srážkách. Najdeš na výplatní pásce.';

  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="mb-4 text-caption text-tertiary">Příjmy</p>
        <h2 className="mb-3 text-h1 text-primary">Tvůj měsíční příjem</h2>
        <p className="text-prose text-secondary">
          Bez příjmu nelze plán spočítat — vyplň aspoň hlavní mzdu.
        </p>
      </header>

      <div className="flex flex-col gap-6">
        <NumberField
          label={netLabel}
          hint={netHint}
          value={income.netMonthly}
          onChange={(v) => onChange({ netMonthly: v })}
          required
        />
        <NumberField
          label="Příjem z pronájmu"
          hint="Pokud pronajímáš byt nebo nemovitost."
          value={income.rental}
          onChange={(v) => onChange({ rental: v ?? 0 })}
        />
        <NumberField
          label="Ostatní pasivní příjem"
          hint="Dividendy, úroky, autorské honoráře, alimenty…"
          value={income.otherPassive}
          onChange={(v) => onChange({ otherPassive: v ?? 0 })}
        />
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Step: Category
// ════════════════════════════════════════════════════════════════════

function CategoryStep({
  category,
  state,
  onFieldChange,
  onSkippedChange,
}: {
  category: CategoryDef;
  state: FormCategory;
  onFieldChange: (fieldKey: string, partial: Partial<FormFieldValue>) => void;
  onSkippedChange: (v: boolean) => void;
}) {
  const subtotal = useMemo(() => {
    if (state.skipped) return 0;
    let sum = 0;
    for (const f of category.fields) {
      const v = state.fields[f.key];
      if (v?.amount && v.amount > 0) sum += v.amount;
    }
    return sum;
  }, [category, state]);

  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="mb-4 text-caption text-tertiary">Výdaje</p>
        <h2 className="mb-3 text-h1 text-primary">{category.label}</h2>
        {category.description && (
          <p className="text-prose text-secondary">{category.description}</p>
        )}
      </header>

      <button
        type="button"
        onClick={() => onSkippedChange(!state.skipped)}
        className={cn(
          'flex w-fit items-center gap-2 rounded-[8px] border px-3 py-2 text-body-sm transition-colors',
          state.skipped
            ? 'border-accent bg-accent-muted text-accent'
            : 'border-border-default bg-surface text-secondary hover:bg-subtle',
        )}
      >
        <div
          className={cn(
            'flex h-4 w-4 items-center justify-center rounded-[4px] border transition-colors',
            state.skipped ? 'border-accent bg-accent' : 'border-border-default',
          )}
        >
          {state.skipped && <CheckCircle size={12} weight="fill" className="text-accent-text" />}
        </div>
        Tato kategorie pro mě neplatí — přeskočit
      </button>

      {!state.skipped && (
        <>
          <div className="flex flex-col gap-5">
            {category.fields.map((field) => (
              <FieldRow
                key={field.key}
                field={field}
                value={state.fields[field.key] ?? { amount: null, necessary: field.defaultNecessary }}
                onChange={(partial) => onFieldChange(field.key, partial)}
              />
            ))}
          </div>

          {subtotal > 0 && (
            <div className="flex items-center justify-between border-t border-border-subtle pt-4">
              <span className="text-caption text-tertiary">Mezisoučet měsíčně</span>
              <span className="text-stat tabular-nums text-primary">
                {subtotal.toLocaleString('cs-CZ')} Kč
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Step: Debts
// ════════════════════════════════════════════════════════════════════

function DebtsStep({
  debts,
  onChange,
}: {
  debts: FormDebt[];
  onChange: (debts: FormDebt[]) => void;
}) {
  const addDebt = () => {
    const newDebt: FormDebt = {
      id: crypto.randomUUID(),
      name: '',
      monthlyPayment: 0,
      currentBalance: 0,
      necessary: true,
    };
    onChange([...debts, newDebt]);
  };

  const updateDebt = (id: string, partial: Partial<FormDebt>) => {
    onChange(debts.map((d) => (d.id === id ? { ...d, ...partial } : d)));
  };

  const removeDebt = (id: string) => {
    onChange(debts.filter((d) => d.id !== id));
  };

  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="mb-4 text-caption text-tertiary">Závazky</p>
        <h2 className="mb-3 text-h1 text-primary">Úvěry, leasing, alimenty</h2>
        <p className="text-prose text-secondary">
          Cokoliv pravidelně splácíš. Pokud nemáš žádné závazky, klidně přeskoč.
        </p>
      </header>

      {debts.length === 0 && (
        <p className="text-body-sm text-tertiary italic">Zatím žádný závazek nepřidán.</p>
      )}

      <div className="flex flex-col gap-5">
        {debts.map((debt) => (
          <div
            key={debt.id}
            className="flex flex-col gap-3 rounded-[12px] border border-border-subtle bg-surface p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <Input
                placeholder="Hypotéka, úvěr na auto…"
                value={debt.name}
                onChange={(e) => updateDebt(debt.id, { name: e.target.value })}
                className="max-w-xs"
              />
              <button
                type="button"
                onClick={() => removeDebt(debt.id)}
                className="rounded-[6px] p-1.5 text-tertiary hover:bg-subtle hover:text-error"
                aria-label="Smazat"
              >
                <Trash size={16} weight="regular" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <NumberField
                label="Měsíční splátka"
                value={debt.monthlyPayment}
                onChange={(v) => updateDebt(debt.id, { monthlyPayment: v ?? 0 })}
                compact
              />
              <NumberField
                label="Aktuální zůstatek dluhu"
                value={debt.currentBalance}
                onChange={(v) => updateDebt(debt.id, { currentBalance: v ?? 0 })}
                compact
              />
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-body-sm text-secondary">
              <input
                type="checkbox"
                checked={debt.necessary}
                onChange={(e) => updateDebt(debt.id, { necessary: e.target.checked })}
                className="h-4 w-4 accent-accent"
              />
              Nezbytný závazek (hypotéka, alimenty…)
            </label>
          </div>
        ))}
      </div>

      <Button variant="secondary" onClick={addDebt} className="w-fit">
        <Plus size={16} weight="regular" className="mr-2" />
        Přidat závazek
      </Button>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Step: Summary
// ════════════════════════════════════════════════════════════════════

function SummaryStep({
  data,
  employmentType,
}: {
  data: FormResponseData;
  employmentType: EmploymentType;
}) {
  const { incomeSum, expenseSum, necessarySum, discretionarySum, debtPaymentsSum } = useMemo(() => {
    let inc = 0;
    inc += data.income.netMonthly ?? 0;
    inc += data.income.rental ?? 0;
    inc += data.income.otherPassive ?? 0;

    let exp = 0;
    let nec = 0;
    let disc = 0;
    for (const cat of CATEGORIES) {
      const state = data.expenses[cat.key];
      if (state.skipped) continue;
      for (const f of cat.fields) {
        const v = state.fields[f.key];
        if (!v || !v.amount || v.amount <= 0) continue;
        exp += v.amount;
        if (v.necessary) nec += v.amount;
        else disc += v.amount;
      }
    }

    let debtSum = 0;
    for (const d of data.debts) {
      const p = d.monthlyPayment ?? 0;
      if (p <= 0) continue;
      debtSum += p;
      exp += p;
      if (d.necessary) nec += p;
      else disc += p;
    }

    return {
      incomeSum: inc,
      expenseSum: exp,
      necessarySum: nec,
      discretionarySum: disc,
      debtPaymentsSum: debtSum,
    };
  }, [data]);

  const balance = incomeSum - expenseSum;

  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="mb-4 text-caption text-tertiary">Souhrn</p>
        <h2 className="mb-3 text-h1 text-primary">
          Skoro hotovo. Zkontroluj si čísla.
        </h2>
        <p className="text-prose text-secondary">
          {employmentType === 'selfemployed' ? 'Příjem OSVČ' : 'Čistý měsíční příjem'} a výdaje
          dle tvých odpovědí. Po odeslání už nepůjde upravovat.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <SummaryCard label="Měsíční příjem" value={incomeSum} accent />
        <SummaryCard label="Měsíční výdaje" value={expenseSum} />
        <SummaryCard label="Z toho nezbytné" value={necessarySum} dim />
        <SummaryCard label="Z toho zbytné" value={discretionarySum} dim />
        {debtPaymentsSum > 0 && (
          <SummaryCard label="Z toho splátky závazků" value={debtPaymentsSum} dim />
        )}
        <SummaryCard
          label="Zbývá k investování / spoření"
          value={balance}
          tone={balance >= 0 ? 'positive' : 'negative'}
        />
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  accent,
  dim,
  tone,
}: {
  label: string;
  value: number;
  accent?: boolean;
  dim?: boolean;
  tone?: 'positive' | 'negative';
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-[12px] border p-5',
        accent ? 'border-accent bg-accent-muted' : 'border-border-subtle bg-surface',
      )}
    >
      <span className={cn('text-caption', dim ? 'text-tertiary' : 'text-secondary')}>{label}</span>
      <span
        className={cn(
          'text-stat tabular-nums',
          tone === 'negative' && 'text-error',
          tone === 'positive' && 'text-primary',
          !tone && 'text-primary',
        )}
      >
        {value.toLocaleString('cs-CZ')} Kč
      </span>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Field row (single expense field)
// ════════════════════════════════════════════════════════════════════

function FieldRow({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: FormFieldValue;
  onChange: (partial: Partial<FormFieldValue>) => void;
}) {
  const isUnknown = value.amount == null;

  return (
    <div className="flex flex-col gap-2 border-b border-border-subtle pb-5 last:border-b-0 last:pb-0">
      <div className="flex flex-col gap-1">
        <label className="text-body text-primary">{field.label}</label>
        {field.hint && <p className="text-body-sm text-tertiary">{field.hint}</p>}
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
        <div className="relative w-full md:max-w-[200px]">
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            step={100}
            placeholder="0"
            value={value.amount ?? ''}
            disabled={isUnknown}
            onChange={(e) => {
              const v = e.target.value;
              if (v === '') onChange({ amount: null });
              else onChange({ amount: Math.max(0, Math.round(Number(v))) });
            }}
            className="pr-10"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-body-sm text-tertiary">
            Kč
          </span>
        </div>

        <div className="flex items-center gap-4">
          <CheckOption
            checked={isUnknown}
            onChange={(checked) => {
              if (checked) onChange({ amount: null });
              else onChange({ amount: 0 });
            }}
            label="Nevím"
          />
          <CheckOption
            checked={value.necessary}
            onChange={(checked) => onChange({ necessary: checked })}
            label="Nezbytný"
            disabled={isUnknown || (value.amount ?? 0) === 0}
          />
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Generic reusable bits
// ════════════════════════════════════════════════════════════════════

function NumberField({
  label,
  hint,
  value,
  onChange,
  required,
  compact,
}: {
  label: string;
  hint?: string;
  value: number | null;
  onChange: (v: number | null) => void;
  required?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={cn('flex flex-col gap-2', compact && 'gap-1')}>
      <label className="text-body text-primary">
        {label}
        {required && <span className="ml-1 text-error">*</span>}
      </label>
      {hint && !compact && <p className="text-body-sm text-tertiary">{hint}</p>}
      <div className="relative max-w-[260px]">
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          step={100}
          placeholder="0"
          value={value ?? ''}
          onChange={(e) => {
            const v = e.target.value;
            if (v === '') onChange(null);
            else onChange(Math.max(0, Math.round(Number(v))));
          }}
          className="pr-10"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-body-sm text-tertiary">
          Kč
        </span>
      </div>
    </div>
  );
}

function CheckOption({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-center gap-2 text-body-sm',
        disabled ? 'cursor-not-allowed opacity-50' : 'text-secondary',
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-accent"
      />
      {label}
    </label>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h3 className="text-h3 text-primary">{title}</h3>
        {hint && <p className="mt-1 text-body-sm text-secondary">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function SegmentBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-[8px] px-4 py-1.5 text-body-sm font-medium transition-all',
        active ? 'bg-primary text-canvas' : 'text-secondary hover:text-primary',
      )}
      style={{
        // override pokud Tailwind nezná `bg-primary text-canvas` — použijeme custom vars
        backgroundColor: active ? 'var(--text-primary)' : 'transparent',
        color: active ? 'var(--bg-canvas)' : undefined,
      }}
    >
      {children}
    </button>
  );
}

function PrivacyOption({
  label,
  description,
  active,
  onClick,
  recommended,
  warning,
}: {
  label: string;
  description: string;
  active: boolean;
  onClick: () => void;
  recommended?: boolean;
  warning?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col gap-1 rounded-[12px] border p-4 text-left transition-colors',
        active ? 'border-accent bg-accent-muted' : 'border-border-subtle bg-surface hover:bg-subtle',
      )}
    >
      <div className="flex items-center gap-2">
        <span className="text-body font-medium text-primary">{label}</span>
        {recommended && (
          <span className="rounded-[4px] bg-accent-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-accent">
            Doporučeno
          </span>
        )}
        {warning && (
          <span className="rounded-[4px] border border-border-default px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-tertiary">
            Méně přesné
          </span>
        )}
      </div>
      <span className="text-body-sm text-secondary">{description}</span>
    </button>
  );
}
