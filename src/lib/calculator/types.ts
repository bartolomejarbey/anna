// Port from ~/Downloads/Finplan 2 /src/types.ts (Lukáš).
// Strukturu drž 1:1 s Excel sheetem „Zadání hodnot klienta, legenda" + sheetem
// „NEMAZATNEMĚNIT" v „Metodika výpočtu zajištění 2025.xlsx".

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

// === EFA životní pojištění ===

export type EmploymentType = "employee" | "selfemployed";

export interface EfaInputs {
  // Klient
  age: number;
  retirementAge: number;
  employmentType: EmploymentType;
  /** Hrubý měsíční příjem (z DPP, mzdy nebo obratu OSVČ — podle employmentType). */
  grossMonthlyIncome: number;

  // Příjmy klienta (měsíční)
  netIncomeActive: number; // čistá mzda + aktivní podnikání (B7)
  rentActive: number; // pronájem aktivní (D12)
  otherActive: number; // ostatní aktivní (D13)
  rentPassive: number; // pronájem pasivní (B12)
  otherPassive: number; // ostatní pasivní (B13)

  // Pokles aktivních příjmů při invaliditě (0–1)
  disabilityIncomeDropI: number; // C11, např. 0.5
  disabilityIncomeDropII: number; // C12, např. 0.7
  disabilityIncomeDropIII: number; // C13, typicky 1.0

  // Stát — měsíční dávky
  statePensionDisabilityI: number; // C23
  statePensionDisabilityII: number; // C24
  statePensionDisabilityIII: number; // C25
  stateSickPay: number; // C28
  widowPension: number; // C31
  orphanPension: number; // C32

  // Rodina
  childrenCount: number; // C33
  hasPartner: 0 | 1; // C34
  familyNetIncomeWithoutClient: number; // C38

  // Výdaje rodiny (měsíční)
  expensesNecessary: number; // C42
  expensesDiscretionary: number; // C41

  // Korekce výdajů (záporná = pokles)
  expensesCorrectionDisabilityI: number; // C47
  expensesCorrectionDisabilityII: number; // C50
  expensesCorrectionDisabilityIII: number; // C53
  expensesCorrectionDeath: number; // C56

  // Doba zajištění (roky)
  yearsDeath: number; // C59
  yearsDisabilityI: number; // C60
  yearsDisabilityII: number; // C61
  yearsDisabilityIII: number; // C62

  // Roční zhodnocení (0..1)
  returnDeath: number; // C65
  returnDisabilityI: number; // C66
  returnDisabilityII: number; // C67
  returnDisabilityIII: number; // C68
}

export interface EfaCoverageVariant {
  monthlyCashflow: number; // záporná = potřeba zajistit
  recommendedSum: number | null; // null = "Není třeba zajistit"
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

// === Plán ===

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

export interface PlanData {
  client: Client;
  cashflow: Cashflow;
  insurance: Insurance;
  retirement: Retirement;
  efa: EfaInsurance;
  efaInputs: EfaInputs;
}

// === MeetingFacts — extraction → calculator bridge ===
// Subset of facts the customer/advisor verbalize on a meeting. The adapter
// fills in policy-level defaults (corrections, years, returns) from
// EFA_DEFAULTS to produce a full `EfaInputs`.

export interface MeetingFacts {
  employment_type: EmploymentType | null;
  gross_monthly_income_czk: number | null;
  has_partner: boolean;
  partner_employment_type: EmploymentType | null;
  partner_gross_monthly_income_czk: number | null;
  current_savings_czk: number | null;
  rent_passive_czk: number | null;
  monthly_mortgage_czk: number | null;
  desired_retirement_age: number | null;
  desired_retirement_monthly_czk: number | null;
}
