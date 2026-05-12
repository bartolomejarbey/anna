/**
 * EFA finanční plán — typy.
 * Port z Finplanu 1.2 (Lukášova verze). Math je správně, jen UI/integraci děláme znovu.
 */

export interface Client {
  name: string;
  age: number;
  family: string;
  address?: string;
}

export interface Cashflow {
  income: number;
  expenses: number;
  surplus: number;
  /** surplus − doporučená měsíční úložka na důchod */
  regularSurplus: number;
  /** doporučená měsíční úložka na důchod, použitá pro výpočet regularSurplus */
  recommendedRetirementSaving: number;
}

export type EmploymentType = "employee" | "selfemployed";

export interface EfaInputs {
  age: number;
  retirementAge: number;
  employmentType: EmploymentType;
  grossMonthlyIncome: number;

  netIncomeActive: number;
  rentActive: number;
  otherActive: number;
  rentPassive: number;
  otherPassive: number;

  disabilityIncomeDropI: number;
  disabilityIncomeDropII: number;
  disabilityIncomeDropIII: number;

  statePensionDisabilityI: number;
  statePensionDisabilityII: number;
  statePensionDisabilityIII: number;
  stateSickPay: number;
  widowPension: number;
  orphanPension: number;

  childrenCount: number;
  hasPartner: 0 | 1;
  familyNetIncomeWithoutClient: number;

  expensesNecessary: number;
  expensesDiscretionary: number;

  expensesCorrectionDisabilityI: number;
  expensesCorrectionDisabilityII: number;
  expensesCorrectionDisabilityIII: number;
  expensesCorrectionDeath: number;

  yearsDeath: number;
  yearsDisabilityI: number;
  yearsDisabilityII: number;
  yearsDisabilityIII: number;

  returnDeath: number;
  returnDisabilityI: number;
  returnDisabilityII: number;
  returnDisabilityIII: number;
}

export interface EfaCoverageVariant {
  monthlyCashflow: number;
  recommendedSum: number | null;
  yearsCovered: number;
}

export interface EfaCoverageRow {
  forFamilyIncome: EfaCoverageVariant;
  forTotalExpenses: EfaCoverageVariant;
  forNecessaryExpenses: EfaCoverageVariant;
}

export interface EfaInsurance {
  death: EfaCoverageRow;
  disabilityI: EfaCoverageRow;
  disabilityII: EfaCoverageRow;
  disabilityIII: EfaCoverageRow;

  permanentInjury: number;
  seriousIllness: number;

  workIncapacityDailyAmount: number;
  hospitalizationDailyAmount: number;
  injuryDailyAmount: number;
}

export interface Insurance {
  recommended: number;
  breakdown: {
    death: number;
    disability: number;
    illness: number;
    injury: number;
  };
  monthlyPremium: number;
}

export interface Retirement {
  currentAge: number;
  retirementAge: number;
  expectedStatePension: number;
  targetIncome: number;
  gap: number;
  recommendedMonthlySaving: number;
  currentSavings: number;
  annualReturnPct: number;
  annualInflationPct: number;
  yearsInRetirement: number;
}

export type FinplanPrivacyMode = "full" | "categorized" | "aggregate_only";

export interface IncomeBreakdownData {
  salary: number;
  selfEmployed: number;
  rental: number;
  passive: number;
  other: number;
}

export interface ExpenseBreakdownData {
  housing: number;
  food: number;
  transport: number;
  insurance: number;
  healthcare: number;
  savings: number;
  dining: number;
  subscriptions: number;
  discretionary: number;
  other: number;
}

export interface CategorySummary {
  necessary: number;
  discretionary: number;
}

export interface PlanData {
  client: Client;
  cashflow: Cashflow;
  insurance: Insurance;
  retirement: Retirement;
  efa: EfaInsurance;
  efaInputs: EfaInputs;
  /** Privacy mode zvolený zákazníkem na landing page. */
  privacyMode: FinplanPrivacyMode;
  /** Plné kategorie — vystaveno jen pokud privacyMode === 'full'. */
  incomeBreakdown?: IncomeBreakdownData;
  expenseBreakdown?: ExpenseBreakdownData;
  /** Nutné/zbytné souhrn — vystaveno pro 'full' i 'categorized', NE pro 'aggregate_only'. */
  categorySummary?: CategorySummary;
  /** Detekovaná pravidelná čistá mzda (pokud byla rozpoznána). */
  detectedSalary?: number | null;
  /** AI-detekovaný typ zaměstnání. */
  detectedEmploymentType?: "employee" | "selfemployed" | "unknown";
}
