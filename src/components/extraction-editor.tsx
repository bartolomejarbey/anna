import React from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';

const MARITAL_STATUS_LABELS: Record<string, string> = {
  single: 'Svobodný/á',
  married: 'V manželství',
  divorced: 'Rozvedený/á',
  widowed: 'Vdovec/Vdova',
};

const RISK_APPETITE_LABELS: Record<string, string> = {
  low: 'Konzervativní',
  medium: 'Vyvážený',
  high: 'Dynamický',
};

const CZK_FORMAT = new Intl.NumberFormat('cs-CZ', {
  style: 'currency',
  currency: 'CZK',
  maximumFractionDigits: 0,
});

type StringOrNull = string | null | undefined;
type NumberOrNull = number | null | undefined;
type BoolOrNull = boolean | null | undefined;

interface ExtractionData {
  customer?: {
    full_name?: StringOrNull;
    age?: NumberOrNull;
    marital_status?: StringOrNull;
    has_children?: BoolOrNull;
    children_count?: NumberOrNull;
    occupation?: StringOrNull;
  };
  finances?: {
    monthly_income_czk?: NumberOrNull;
    monthly_expenses_czk?: NumberOrNull;
    existing_savings_czk?: NumberOrNull;
    has_mortgage?: BoolOrNull;
    monthly_mortgage_czk?: NumberOrNull;
  };
  goals?: {
    primary_goal?: StringOrNull;
    target_horizon_years?: NumberOrNull;
    risk_appetite?: StringOrNull;
  };
  notes?: StringOrNull;
}

interface ExtractionEditorProps {
  data: unknown;
  className?: string;
}

function FieldRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}): React.ReactElement {
  const isEmpty = value === null || value === undefined || value === '';
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-caption text-tertiary">{label}</span>
      <span className={cn('text-body', isEmpty ? 'text-tertiary' : 'text-primary')}>
        {isEmpty ? '—' : value}
      </span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <h4 className="col-span-2 mt-2 text-caption text-tertiary first:mt-0">{children}</h4>
  );
}

function boolToText(v: BoolOrNull): string | null {
  if (v === null || v === undefined) return null;
  return v ? 'Ano' : 'Ne';
}

function currencyOrNull(v: NumberOrNull): string | null {
  if (v === null || v === undefined) return null;
  return CZK_FORMAT.format(v);
}

function horizonOrNull(v: NumberOrNull): string | null {
  if (v === null || v === undefined) return null;
  return `${v} ${v === 1 ? 'rok' : v < 5 ? 'roky' : 'let'}`;
}

export function ExtractionEditor({ data, className }: ExtractionEditorProps): React.ReactElement {
  const d = (typeof data === 'object' && data !== null ? data : {}) as ExtractionData;

  const c = d.customer ?? {};
  const f = d.finances ?? {};
  const g = d.goals ?? {};
  const notes = d.notes;

  const maritalLabel = c.marital_status
    ? (MARITAL_STATUS_LABELS[c.marital_status] ?? c.marital_status)
    : null;

  const riskLabel = g.risk_appetite
    ? (RISK_APPETITE_LABELS[g.risk_appetite] ?? g.risk_appetite)
    : null;

  return (
    <Card className={cn('flex flex-col gap-6', className)}>
      <h3 className="text-h3 text-primary">Data</h3>

      <div className="grid grid-cols-2 gap-x-8 gap-y-3">
        <SectionTitle>Zákazník</SectionTitle>
        <FieldRow label="Jméno" value={c.full_name ?? null} />
        <FieldRow
          label="Věk"
          value={c.age !== null && c.age !== undefined ? String(c.age) : null}
        />
        <FieldRow label="Rodinný stav" value={maritalLabel} />
        <FieldRow label="Děti" value={boolToText(c.has_children)} />
        <FieldRow
          label="Počet dětí"
          value={
            c.children_count !== null && c.children_count !== undefined
              ? String(c.children_count)
              : null
          }
        />
        <FieldRow label="Povolání" value={c.occupation ?? null} />

        <SectionTitle>Finance</SectionTitle>
        <FieldRow label="Měsíční příjem" value={currencyOrNull(f.monthly_income_czk)} />
        <FieldRow label="Měsíční výdaje" value={currencyOrNull(f.monthly_expenses_czk)} />
        <FieldRow label="Stávající úspory" value={currencyOrNull(f.existing_savings_czk)} />
        <FieldRow label="Hypotéka" value={boolToText(f.has_mortgage)} />
        <FieldRow label="Splátka hypotéky" value={currencyOrNull(f.monthly_mortgage_czk)} />

        <SectionTitle>Cíle</SectionTitle>
        <FieldRow label="Hlavní cíl" value={g.primary_goal ?? null} />
        <FieldRow label="Horizont" value={horizonOrNull(g.target_horizon_years)} />
        <FieldRow label="Risk profil" value={riskLabel} />
      </div>

      {notes !== undefined && (
        <div className="flex flex-col gap-1.5 border-t border-border-subtle pt-6">
          <span className="text-caption text-tertiary">Poznámka</span>
          <p
            className={cn(
              'text-body whitespace-pre-wrap',
              notes ? 'text-primary' : 'text-tertiary',
            )}
          >
            {notes || '—'}
          </p>
        </div>
      )}
    </Card>
  );
}
