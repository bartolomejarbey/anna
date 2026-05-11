/**
 * Postaví PlanData z agregovaných extrakcí.
 *
 * Vstup:
 *   - bankAggregates[]: pole agregátů z výpisů (jeden záznam per výpis).
 *     Průměrujeme měsíční income/expenses napříč všemi výpisy.
 *   - id: extrahované údaje z OP (jméno, datum narození, adresa).
 *   - employmentType: zaměstnanec/OSVČ → ovlivňuje státní dávky.
 *
 * Výstup: PlanData JSON, který se uloží do finplan_analyses.plan_data.
 */

import {
  buildInsuranceFromEfa,
  calculateRetirement,
  deriveBenefitsFromIncome,
} from "./calculations";
import type {
  EfaInputs,
  EmploymentType,
  PlanData,
} from "./types";

export interface BankAggregate {
  totalIncome: number;
  totalExpenses: number;
  periodMonths: number;
  transactionCount: number;
  bankName?: string | null;
}

export interface IdInfo {
  fullName?: string | null;
  birthDate?: string | null; // ISO YYYY-MM-DD
  address?: string | null;
}

export interface BuildPlanInput {
  bankAggregates: BankAggregate[];
  id?: IdInfo | null;
  employmentType: EmploymentType;
  /** Volitelné údaje, které poradce/zákazník doplní mimo dokumenty. */
  childrenCount?: number;
  hasPartner?: 0 | 1;
  familyNetIncomeWithoutClient?: number;
}

function ageFromBirthDate(iso: string): number | null {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m || !m[1] || !m[2] || !m[3]) return null;
  const year = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  const day = parseInt(m[3], 10);
  const today = new Date();
  let age = today.getFullYear() - year;
  const beforeBirthday =
    today.getMonth() + 1 < month ||
    (today.getMonth() + 1 === month && today.getDate() < day);
  if (beforeBirthday) age -= 1;
  return age;
}

/**
 * Průměrné měsíční hodnoty napříč všemi výpisy.
 * Každý výpis přispívá vahou svého periodMonths.
 */
function averageMonthly(aggregates: BankAggregate[]): {
  income: number;
  expenses: number;
} {
  if (aggregates.length === 0) return { income: 0, expenses: 0 };

  let weightedIncome = 0;
  let weightedExpenses = 0;
  let totalWeight = 0;

  for (const a of aggregates) {
    const months = Math.max(a.periodMonths, 0.5);
    if (a.totalIncome > 0) {
      weightedIncome += a.totalIncome;
      totalWeight += months;
    }
    if (a.totalExpenses > 0) {
      weightedExpenses += a.totalExpenses;
    }
  }

  if (totalWeight === 0) return { income: 0, expenses: 0 };

  return {
    income: Math.round(weightedIncome / totalWeight),
    expenses: Math.round(weightedExpenses / totalWeight),
  };
}

export function buildPlanFromAggregates(input: BuildPlanInput): PlanData {
  const {
    bankAggregates,
    id,
    employmentType,
    childrenCount = 0,
    hasPartner = 0,
    familyNetIncomeWithoutClient = 0,
  } = input;

  const monthly = averageMonthly(bankAggregates);
  const inferredAge = id?.birthDate ? ageFromBirthDate(id.birthDate) : null;

  const inverseRatio = employmentType === "employee" ? 0.72 : 0.8;
  const inferredGross = Math.round(monthly.income / inverseRatio) || 0;
  const benefits = deriveBenefitsFromIncome(inferredGross, employmentType);

  // Rozdělení výdajů: 73 % nutné, 27 % zbytné (default poměr z Finplanu).
  const expensesTotal = monthly.expenses;
  const necessaryRatio = 0.73;
  const expensesNecessary = Math.round(expensesTotal * necessaryRatio);
  const expensesDiscretionary = expensesTotal - expensesNecessary;

  const age = inferredAge ?? 38;
  const retirementAge = 65;

  const efa: EfaInputs = {
    age,
    retirementAge,
    employmentType,
    grossMonthlyIncome: inferredGross,

    netIncomeActive: benefits.netIncomeActive,
    rentActive: 0,
    otherActive: 0,
    rentPassive: 0,
    otherPassive: 0,

    disabilityIncomeDropI: 0.5,
    disabilityIncomeDropII: 0.7,
    disabilityIncomeDropIII: 1.0,

    statePensionDisabilityI: benefits.statePensionDisabilityI,
    statePensionDisabilityII: benefits.statePensionDisabilityII,
    statePensionDisabilityIII: benefits.statePensionDisabilityIII,
    stateSickPay: benefits.stateSickPay,
    widowPension: benefits.widowPension,
    orphanPension: benefits.orphanPension,

    childrenCount,
    hasPartner,
    familyNetIncomeWithoutClient,

    expensesNecessary,
    expensesDiscretionary,

    expensesCorrectionDisabilityI: 0.05,
    expensesCorrectionDisabilityII: -0.05,
    expensesCorrectionDisabilityIII: 0.25,
    expensesCorrectionDeath: -0.25,

    yearsDeath: 12,
    yearsDisabilityI: 12,
    yearsDisabilityII: 12,
    yearsDisabilityIII: 12,

    returnDeath: 0.02,
    returnDisabilityI: 0.02,
    returnDisabilityII: 0.02,
    returnDisabilityIII: 0.02,
  };

  const { insurance, efa: efaResult } = buildInsuranceFromEfa(efa);

  // Důchodový plán — defaultní cíle (poradce doupraví v UI).
  const retirementInput = {
    currentAge: age,
    retirementAge,
    currentSavings: 0,
    annualReturn: 0.04,
    annualInflation: 0.025,
    targetRealMonthlyPension: Math.max(monthly.income * 0.75, 35000),
    statePensionRealMonthly: 18500,
    payoutYears: 20,
  };
  const retirementCalc = calculateRetirement(retirementInput);
  const recommendedRetirementSaving = Math.round(
    retirementCalc.requiredMonthlyContribution,
  );

  const surplus = monthly.income - expensesTotal;

  return {
    client: {
      name: id?.fullName ?? "Zákazník",
      age,
      family:
        hasPartner === 1 && childrenCount > 0
          ? `Partner + ${childrenCount} ${childrenCount === 1 ? "dítě" : childrenCount < 5 ? "děti" : "dětí"}`
          : hasPartner === 1
            ? "Partner"
            : childrenCount > 0
              ? `${childrenCount} ${childrenCount === 1 ? "dítě" : childrenCount < 5 ? "děti" : "dětí"}`
              : "Bez závazků",
      address: id?.address ?? undefined,
    },
    cashflow: {
      income: monthly.income,
      expenses: expensesTotal,
      surplus,
      regularSurplus: surplus - recommendedRetirementSaving,
      recommendedRetirementSaving,
    },
    insurance,
    efa: efaResult,
    efaInputs: efa,
    retirement: {
      currentAge: age,
      retirementAge,
      expectedStatePension: 18500,
      targetIncome: retirementInput.targetRealMonthlyPension,
      gap: retirementInput.targetRealMonthlyPension - 18500,
      recommendedMonthlySaving: recommendedRetirementSaving,
      currentSavings: 0,
      annualReturnPct: 0.04,
      annualInflationPct: 0.025,
      yearsInRetirement: 20,
    },
  };
}
