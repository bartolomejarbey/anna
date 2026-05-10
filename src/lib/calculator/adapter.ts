// Adapter — z Anniny extrakce (`CustomerExtraction` + `MeetingFacts`)
// vytváří kompletní `EfaInputs` pro EFA kalkulátor.
//
// Defaults vycházejí z Lukášova `mockData.ts` (Finplan 2). Vyžadují sign-off
// 4FIN před spuštěním na realných zákaznících.

import type { CustomerExtraction } from "@/lib/openai/schemas/customer-extraction";
import {
  buildInsuranceFromEfa,
  calculateRetirement,
  deriveBenefitsFromIncome,
} from "./zajisteni-2025";
import type {
  Cashflow,
  Client,
  EfaInputs,
  EmploymentType,
  MeetingFacts,
  PlanData,
  Retirement,
} from "./types";

// ---------------------------------------------------------------------
// Defaults (Phase 1 — z Finplan 2 demo)
// ---------------------------------------------------------------------

export const EFA_DEFAULTS = {
  // Pokles aktivních příjmů při invaliditě
  disabilityIncomeDropI: 0.5,
  disabilityIncomeDropII: 0.7,
  disabilityIncomeDropIII: 1.0,

  // Korekce výdajů (záporná = pokles)
  expensesCorrectionDisabilityI: 0.05,
  expensesCorrectionDisabilityII: -0.05,
  expensesCorrectionDisabilityIII: 0.25,
  expensesCorrectionDeath: -0.25,

  // Doba zajištění (roky)
  yearsDeath: 12,
  yearsDisabilityI: 12,
  yearsDisabilityII: 12,
  yearsDisabilityIII: 12,

  // Roční zhodnocení
  returnDeath: 0.02,
  returnDisabilityI: 0.02,
  returnDisabilityII: 0.02,
  returnDisabilityIII: 0.02,

  // Default věk odchodu do důchodu
  retirementAge: 65,
} as const;

export const RETIREMENT_DEFAULTS = {
  retirementAge: 65,
  expectedStatePension: 18500,
  targetIncomeFallback: 45000,
  annualReturnPct: 0.04,
  annualInflationPct: 0.025,
  yearsInRetirement: 20,
} as const;

export const EXPENSES_DEFAULTS = {
  /** Pokud nevíme expense breakdown, ratio nutné výdaje / celkové. */
  necessaryRatio: 0.73,
  /** Fallback: výdaje = appropriate ratio z čistého příjmu. */
  fallbackExpensesRatio: 0.7,
} as const;

const FALLBACK_NET_INCOME_CZK = 35_000;
const FALLBACK_AGE = 38;

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------

function pickEmploymentType(facts: MeetingFacts | null): EmploymentType {
  return facts?.employment_type ?? "employee";
}

function inverseRatio(et: EmploymentType): number {
  return et === "employee" ? 0.72 : 0.80;
}

/** Z hrubého (nebo z čistého inverzí) doplníme co se dá; defaulty na zbytek. */
function resolveIncome(
  facts: MeetingFacts | null,
  netFromExtraction: number | null,
  employmentType: EmploymentType
): { gross: number; net: number } {
  if (facts?.gross_monthly_income_czk && facts.gross_monthly_income_czk > 0) {
    const gross = facts.gross_monthly_income_czk;
    const net = Math.round(gross * inverseRatio(employmentType));
    return { gross, net };
  }
  if (netFromExtraction && netFromExtraction > 0) {
    const net = netFromExtraction;
    const gross = Math.round(net / inverseRatio(employmentType));
    return { gross, net };
  }
  const net = FALLBACK_NET_INCOME_CZK;
  const gross = Math.round(net / inverseRatio(employmentType));
  return { gross, net };
}

function resolveAge(extraction: CustomerExtraction): number {
  return extraction.customer.age ?? FALLBACK_AGE;
}

function resolveHasPartner(
  extraction: CustomerExtraction,
  facts: MeetingFacts | null
): 0 | 1 {
  if (facts?.has_partner) return 1;
  const ms = extraction.customer.marital_status;
  return ms === "married" ? 1 : 0;
}

function resolveChildren(extraction: CustomerExtraction): number {
  return extraction.customer.children_count ?? 0;
}

function resolveExpenses(
  extraction: CustomerExtraction,
  netIncome: number
): { necessary: number; discretionary: number } {
  const explicit = extraction.finances.monthly_expenses_czk;
  const total =
    typeof explicit === "number" && explicit > 0
      ? explicit
      : Math.round(netIncome * EXPENSES_DEFAULTS.fallbackExpensesRatio);
  const necessary = Math.round(total * EXPENSES_DEFAULTS.necessaryRatio);
  const discretionary = Math.max(0, total - necessary);
  return { necessary, discretionary };
}

function resolveFamilyNetIncome(
  facts: MeetingFacts | null,
  partnerEmployment: EmploymentType
): number {
  const partnerGross = facts?.partner_gross_monthly_income_czk;
  if (partnerGross && partnerGross > 0) {
    return Math.round(partnerGross * inverseRatio(partnerEmployment));
  }
  return 0;
}

// ---------------------------------------------------------------------
// MeetingFacts → EfaInputs
// ---------------------------------------------------------------------

export function factsToEfaInputs(
  extraction: CustomerExtraction,
  facts: MeetingFacts | null
): EfaInputs {
  const employmentType = pickEmploymentType(facts);
  const partnerEmploymentType =
    facts?.partner_employment_type ?? "employee";

  const { gross, net } = resolveIncome(
    facts,
    extraction.finances.monthly_income_czk,
    employmentType
  );

  const benefits = deriveBenefitsFromIncome(gross, employmentType);

  const age = resolveAge(extraction);
  const hasPartner = resolveHasPartner(extraction, facts);
  const childrenCount = resolveChildren(extraction);
  const familyNetIncomeWithoutClient = hasPartner === 1
    ? resolveFamilyNetIncome(facts, partnerEmploymentType)
    : 0;

  const { necessary, discretionary } = resolveExpenses(extraction, net);

  const rentPassive = facts?.rent_passive_czk ?? 0;

  return {
    age,
    retirementAge:
      facts?.desired_retirement_age ?? EFA_DEFAULTS.retirementAge,
    employmentType,
    grossMonthlyIncome: gross,

    netIncomeActive: benefits.netIncomeActive,
    rentActive: 0,
    otherActive: 0,
    rentPassive,
    otherPassive: 0,

    disabilityIncomeDropI: EFA_DEFAULTS.disabilityIncomeDropI,
    disabilityIncomeDropII: EFA_DEFAULTS.disabilityIncomeDropII,
    disabilityIncomeDropIII: EFA_DEFAULTS.disabilityIncomeDropIII,

    statePensionDisabilityI: benefits.statePensionDisabilityI,
    statePensionDisabilityII: benefits.statePensionDisabilityII,
    statePensionDisabilityIII: benefits.statePensionDisabilityIII,
    stateSickPay: benefits.stateSickPay,
    widowPension: benefits.widowPension,
    orphanPension: benefits.orphanPension,

    childrenCount,
    hasPartner,
    familyNetIncomeWithoutClient,

    expensesNecessary: necessary,
    expensesDiscretionary: discretionary,

    expensesCorrectionDisabilityI: EFA_DEFAULTS.expensesCorrectionDisabilityI,
    expensesCorrectionDisabilityII: EFA_DEFAULTS.expensesCorrectionDisabilityII,
    expensesCorrectionDisabilityIII: EFA_DEFAULTS.expensesCorrectionDisabilityIII,
    expensesCorrectionDeath: EFA_DEFAULTS.expensesCorrectionDeath,

    yearsDeath: EFA_DEFAULTS.yearsDeath,
    yearsDisabilityI: EFA_DEFAULTS.yearsDisabilityI,
    yearsDisabilityII: EFA_DEFAULTS.yearsDisabilityII,
    yearsDisabilityIII: EFA_DEFAULTS.yearsDisabilityIII,

    returnDeath: EFA_DEFAULTS.returnDeath,
    returnDisabilityI: EFA_DEFAULTS.returnDisabilityI,
    returnDisabilityII: EFA_DEFAULTS.returnDisabilityII,
    returnDisabilityIII: EFA_DEFAULTS.returnDisabilityIII,
  };
}

// ---------------------------------------------------------------------
// Plný PlanData (cashflow + insurance + retirement + EFA)
// ---------------------------------------------------------------------

function buildClient(
  extraction: CustomerExtraction,
  efa: EfaInputs,
  customerNameFromDb: string | null
): Client {
  const name =
    customerNameFromDb ?? extraction.customer.full_name ?? "Zákazník";
  const childCount = efa.childrenCount;
  const family =
    efa.hasPartner === 1
      ? childCount > 0
        ? `Partner + ${childCount} ${childCount === 1 ? "dítě" : childCount < 5 ? "děti" : "dětí"}`
        : "Partner"
      : childCount > 0
        ? `${childCount} ${childCount === 1 ? "dítě" : childCount < 5 ? "děti" : "dětí"}`
        : "Bez rodiny";
  return { name, age: efa.age, family };
}

export function buildPlanData(
  extraction: CustomerExtraction,
  facts: MeetingFacts | null,
  customerNameFromDb: string | null = null
): PlanData {
  const efaInputs = factsToEfaInputs(extraction, facts);

  const { insurance, efa } = buildInsuranceFromEfa(efaInputs);

  const currentSavings =
    facts?.current_savings_czk ??
    extraction.finances.existing_savings_czk ??
    0;

  const targetIncome =
    facts?.desired_retirement_monthly_czk ??
    RETIREMENT_DEFAULTS.targetIncomeFallback;

  const retirementInfo: Retirement = {
    currentAge: efaInputs.age,
    retirementAge: efaInputs.retirementAge,
    expectedStatePension: RETIREMENT_DEFAULTS.expectedStatePension,
    targetIncome,
    gap: Math.max(0, targetIncome - RETIREMENT_DEFAULTS.expectedStatePension),
    recommendedMonthlySaving: 0, // doplníme níže z calculateRetirement
    currentSavings,
    annualReturnPct: RETIREMENT_DEFAULTS.annualReturnPct,
    annualInflationPct: RETIREMENT_DEFAULTS.annualInflationPct,
    yearsInRetirement: RETIREMENT_DEFAULTS.yearsInRetirement,
  };

  const retirementCalc =
    retirementInfo.retirementAge > retirementInfo.currentAge
      ? calculateRetirement({
          currentAge: retirementInfo.currentAge,
          retirementAge: retirementInfo.retirementAge,
          currentSavings: retirementInfo.currentSavings,
          annualReturn: retirementInfo.annualReturnPct,
          annualInflation: retirementInfo.annualInflationPct,
          targetRealMonthlyPension: retirementInfo.targetIncome,
          statePensionRealMonthly: retirementInfo.expectedStatePension,
          payoutYears: retirementInfo.yearsInRetirement,
        })
      : null;

  const recommendedRetirementSaving = retirementCalc
    ? Math.round(retirementCalc.requiredMonthlyContribution)
    : 0;

  retirementInfo.recommendedMonthlySaving = recommendedRetirementSaving;

  const totalExpenses = efaInputs.expensesNecessary + efaInputs.expensesDiscretionary;
  const surplus = efaInputs.netIncomeActive - totalExpenses;

  const cashflow: Cashflow = {
    income: efaInputs.netIncomeActive,
    expenses: totalExpenses,
    surplus,
    regularSurplus: surplus - recommendedRetirementSaving,
    recommendedRetirementSaving,
  };

  return {
    client: buildClient(extraction, efaInputs, customerNameFromDb),
    cashflow,
    insurance,
    efa,
    efaInputs,
    retirement: retirementInfo,
  };
}
