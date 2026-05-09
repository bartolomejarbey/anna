// server-only: this file is imported only from server-side PDF generation code.
import 'server-only';

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';
import type { CustomerExtraction } from '@/lib/openai/schemas/customer-extraction';
import type { CalculationResult } from '@/lib/calculator';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OfferDocumentProps {
  customer: {
    full_name: string | null;
    age?: number | null;
    occupation?: string | null;
    marital_status?: string | null;
    has_children?: boolean | null;
    children_count?: number | null;
  };
  advisor: { full_name: string; email: string };
  tenant: { name: string };
  extraction: CustomerExtraction;
  calculation: CalculationResult;
  narrative: string;
  generatedAt: Date;
}

// ─── Formatters ───────────────────────────────────────────────────────────────

const CZK = new Intl.NumberFormat('cs-CZ', {
  style: 'currency',
  currency: 'CZK',
  maximumFractionDigits: 0,
});

function czk(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—';
  return CZK.format(v);
}

const MARITAL_STATUS_LABELS: Record<string, string> = {
  single: 'Svobodný/á',
  married: 'V manželství',
  divorced: 'Rozvedený/á',
  widowed: 'Vdovec/Vdova',
};

const RISK_LABELS: Record<string, string> = {
  low: 'Konzervativní',
  medium: 'Vyvážený',
  high: 'Dynamický',
};

function formatDate(d: Date): string {
  return d.toLocaleDateString('cs-CZ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1D1D1F',
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 36,
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 28,
  },
  tenantName: {
    fontSize: 8,
    color: '#6E6E73',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 4,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#1D1D1F',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#1D1D1F',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 9,
    color: '#8E8E93',
    marginTop: 2,
  },

  // Section
  section: {
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#1D1D1F',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E0D5',
    paddingBottom: 4,
  },

  // 2-col grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 0,
  },
  gridCell: {
    width: '50%',
    marginBottom: 6,
    paddingRight: 8,
  },
  fieldLabel: {
    fontSize: 8,
    color: '#8E8E93',
    marginBottom: 1,
  },
  fieldValue: {
    fontSize: 10,
    color: '#1D1D1F',
  },

  // Narrative
  narrativeParagraph: {
    fontSize: 10,
    color: '#1D1D1F',
    lineHeight: 1.6,
    marginBottom: 8,
  },

  // Table
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E0D5',
    paddingBottom: 4,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E0D5',
  },
  tableRowTotal: {
    flexDirection: 'row',
    paddingVertical: 6,
    backgroundColor: '#FAF7F2',
    borderTopWidth: 1,
    borderTopColor: '#E8E0D5',
    marginTop: 2,
  },
  colProduct: { width: '45%' },
  colAmount: { width: '20%', textAlign: 'right' },
  colRationale: { width: '35%', paddingLeft: 8 },
  tableHeaderText: {
    fontSize: 8,
    color: '#8E8E93',
    fontFamily: 'Helvetica-Bold',
  },
  tableCellText: {
    fontSize: 9,
    color: '#1D1D1F',
  },
  tableCellMuted: {
    fontSize: 8,
    color: '#6E6E73',
  },
  tableTotalText: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#1D1D1F',
  },

  // Summary block
  summaryBlock: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  summaryItem: {
    flex: 1,
    backgroundColor: '#FAF7F2',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E8E0D5',
    padding: 8,
  },
  summaryLabel: { fontSize: 8, color: '#8E8E93', marginBottom: 2 },
  summaryValue: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#1D1D1F' },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 36,
    right: 36,
  },
  footerDivider: {
    borderTopWidth: 1,
    borderTopColor: '#E8E0D5',
    marginBottom: 8,
  },
  footerText: {
    fontSize: 8,
    color: '#6E6E73',
    marginBottom: 2,
  },
  footerSignature: {
    fontSize: 9,
    color: '#1D1D1F',
    marginTop: 6,
    marginBottom: 2,
  },
  footerDisclaimer: {
    fontSize: 7,
    color: '#8E8E93',
    marginTop: 4,
    lineHeight: 1.4,
  },
});

// ─── Sub-components ───────────────────────────────────────────────────────────

function FieldCell({ label, value }: { label: string; value: string | null | undefined }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <View style={S.gridCell}>
      <Text style={S.fieldLabel}>{label}</Text>
      <Text style={S.fieldValue}>{value}</Text>
    </View>
  );
}

// ─── Document ─────────────────────────────────────────────────────────────────

export function OfferDocument({
  customer,
  advisor,
  tenant,
  extraction,
  calculation,
  narrative,
  generatedAt,
}: OfferDocumentProps): React.ReactElement {
  const { finances, goals } = extraction;

  const customerName = customer.full_name ?? 'Zákazník';

  // Narrative paragraphs split on double newline
  const narrativeParagraphs = narrative
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  // Total recommended monthly amount
  const totalMonthly =
    calculation.recommended_savings_czk_per_month +
    calculation.recommended_pension_czk_per_month;

  return (
    <Document
      title={`Nabídka finančního plánu — ${customerName}`}
      author={advisor.full_name}
      subject="Nabídka finančního plánu"
    >
      <Page size="A4" style={S.page}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <View style={S.headerRow}>
          <View>
            <Text style={S.title}>Nabídka finančního plánu</Text>
            <Text style={S.subtitle}>{customerName}</Text>
            <Text style={S.dateText}>{formatDate(generatedAt)}</Text>
          </View>
          <Text style={S.tenantName}>{tenant.name}</Text>
        </View>

        {/* ── O zákazníkovi ────────────────────────────────────────────────── */}
        <View style={S.section}>
          <Text style={S.sectionHeading}>O zákazníkovi</Text>
          <View style={S.grid}>
            <FieldCell label="Jméno" value={customer.full_name} />
            <FieldCell
              label="Věk"
              value={customer.age != null ? `${customer.age} let` : null}
            />
            <FieldCell label="Povolání" value={customer.occupation} />
            <FieldCell
              label="Rodinný stav"
              value={
                customer.marital_status
                  ? (MARITAL_STATUS_LABELS[customer.marital_status] ?? customer.marital_status)
                  : null
              }
            />
            <FieldCell
              label="Děti"
              value={customer.has_children === true ? 'Ano' : customer.has_children === false ? 'Ne' : null}
            />
            <FieldCell
              label="Počet dětí"
              value={customer.children_count != null ? String(customer.children_count) : null}
            />
          </View>
        </View>

        {/* ── Finanční situace ─────────────────────────────────────────────── */}
        <View style={S.section}>
          <Text style={S.sectionHeading}>Finanční situace</Text>
          <View style={S.grid}>
            <FieldCell label="Měsíční příjem" value={czk(finances.monthly_income_czk)} />
            <FieldCell label="Měsíční výdaje" value={czk(finances.monthly_expenses_czk)} />
            <FieldCell label="Stávající úspory" value={czk(finances.existing_savings_czk)} />
            {finances.has_mortgage === true && (
              <FieldCell label="Splátka hypotéky" value={czk(finances.monthly_mortgage_czk)} />
            )}
          </View>
        </View>

        {/* ── Cíle a horizont ──────────────────────────────────────────────── */}
        <View style={S.section}>
          <Text style={S.sectionHeading}>Cíle a horizont</Text>
          <View style={S.grid}>
            <FieldCell label="Hlavní cíl" value={goals.primary_goal} />
            <FieldCell
              label="Horizont"
              value={goals.target_horizon_years != null ? `${goals.target_horizon_years} let` : 'neuveden'}
            />
            <FieldCell
              label="Rizikový profil"
              value={goals.risk_appetite ? (RISK_LABELS[goals.risk_appetite] ?? goals.risk_appetite) : null}
            />
          </View>
        </View>

        {/* ── Doporučení (narrative) ────────────────────────────────────────── */}
        {narrativeParagraphs.length > 0 && (
          <View style={S.section}>
            <Text style={S.sectionHeading}>Doporučení</Text>
            {narrativeParagraphs.map((para, i) => (
              <Text key={i} style={S.narrativeParagraph}>{para}</Text>
            ))}
          </View>
        )}

        {/* ── Plán ─────────────────────────────────────────────────────────── */}
        <View style={S.section}>
          <Text style={S.sectionHeading}>Finanční plán</Text>

          {/* Summary block */}
          <View style={S.summaryBlock}>
            <View style={S.summaryItem}>
              <Text style={S.summaryLabel}>Doporučená měsíční úložka celkem</Text>
              <Text style={S.summaryValue}>{czk(totalMonthly)}</Text>
            </View>
            <View style={S.summaryItem}>
              <Text style={S.summaryLabel}>Doporučená rezerva</Text>
              <Text style={S.summaryValue}>{czk(calculation.recommended_emergency_fund_czk)}</Text>
            </View>
            <View style={S.summaryItem}>
              <Text style={S.summaryLabel}>Očekávaný roční výnos</Text>
              <Text style={S.summaryValue}>{calculation.estimated_annual_growth_pct} %</Text>
            </View>
          </View>

          {/* Products table */}
          <View style={S.tableHeader}>
            <Text style={[S.tableHeaderText, S.colProduct]}>Produkt</Text>
            <Text style={[S.tableHeaderText, S.colAmount]}>Měsíčně</Text>
            <Text style={[S.tableHeaderText, S.colRationale]}>Zdůvodnění</Text>
          </View>

          {calculation.product_recommendations.map((rec, i) => (
            <View key={i} style={S.tableRow}>
              <Text style={[S.tableCellText, S.colProduct]}>{rec.product}</Text>
              <Text style={[S.tableCellText, S.colAmount]}>
                {rec.monthly_amount_czk > 0 ? czk(rec.monthly_amount_czk) : '—'}
              </Text>
              <Text style={[S.tableCellMuted, S.colRationale]}>{rec.rationale}</Text>
            </View>
          ))}

          <View style={S.tableRowTotal}>
            <Text style={[S.tableTotalText, S.colProduct]}>Doporučená měsíční úložka celkem</Text>
            <Text style={[S.tableTotalText, S.colAmount]}>{czk(totalMonthly)}</Text>
            <Text style={[S.tableCellMuted, S.colRationale]} />
          </View>
        </View>

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <View style={S.footer} fixed>
          <View style={S.footerDivider} />
          <Text style={S.footerText}>
            Vypracoval: {advisor.full_name}, {advisor.email} — Za {tenant.name}
          </Text>
          <Text style={S.footerSignature}>Datum a podpis zákazníka: ____________</Text>
          <Text style={S.footerDisclaimer}>
            Toto je orientační návrh, nikoliv závazná nabídka. Plné podmínky stanoví uzavřená smlouva s daným poskytovatelem produktu.
          </Text>
        </View>

      </Page>
    </Document>
  );
}
