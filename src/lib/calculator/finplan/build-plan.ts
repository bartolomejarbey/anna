/**
 * Postaví PlanData z agregovaných extrakcí.
 *
 * Vstup:
 *   - bankAggregates[]: bohatý breakdown per výpis (income/expense kategorie,
 *     necessary/discretionary, detected salary). Průměrujeme měsíční hodnoty
 *     napříč všemi výpisy (vážené periodou).
 *   - id: extrahované údaje z OP (jméno, datum narození, adresa).
 *   - employmentType: zaměstnanec/OSVČ (od zákazníka na landing page).
 *   - privacyMode: ovlivňuje, jaký breakdown vystavíme do plan_data (advisor view).
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
  ExpenseBreakdownData,
  FinplanPrivacyMode,
  IncomeBreakdownData,
  PlanData,
} from "./types";

export interface BankAggregate {
  /** Délka výpisu v měsících. */
  periodMonths: number;
  /** Banka — pro debug/audit. */
  bankName?: string | null;
  transactionCount?: number;
  /** Income breakdown za období výpisu (celé Kč, sumy per kategorie). */
  income: IncomeBreakdownData;
  /** Expense breakdown za období výpisu (sumy per kategorie). */
  expenses: ExpenseBreakdownData;
  /** Suma nutných výdajů (housing+food+transport+insurance+healthcare+savings). */
  necessaryTotal: number;
  /** Suma zbytných výdajů (dining+subscriptions+discretionary+other). */
  discretionaryTotal: number;
  /** AI-detekovaná pravidelná čistá mzda (po srážkách), pokud lze. */
  detectedSalary?: number | null;
  /** AI-detekovaný typ zaměstnání. */
  detectedEmploymentType?: "employee" | "selfemployed" | "unknown";
}

export interface IdInfo {
  fullName?: string | null;
  birthDate?: string | null;
  address?: string | null;
}

export interface BuildPlanInput {
  bankAggregates: BankAggregate[];
  id?: IdInfo | null;
  employmentType: EmploymentType;
  privacyMode: FinplanPrivacyMode;
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

interface MonthlyAggregate {
  income: IncomeBreakdownData;
  expenses: ExpenseBreakdownData;
  necessary: number;
  discretionary: number;
  incomeTotal: number;
  expenseTotal: number;
  totalMonths: number;
}

const EMPTY_INCOME: IncomeBreakdownData = {
  salary: 0,
  selfEmployed: 0,
  rental: 0,
  passive: 0,
  other: 0,
};

const EMPTY_EXPENSE: ExpenseBreakdownData = {
  housing: 0,
  food: 0,
  transport: 0,
  insurance: 0,
  healthcare: 0,
  savings: 0,
  dining: 0,
  subscriptions: 0,
  discretionary: 0,
  other: 0,
};

/**
 * Spočítá průměrné měsíční hodnoty napříč všemi výpisy.
 * Každý výpis přispívá vahou svého periodMonths (statement za 2 měsíce má 2× vliv).
 */
function averageMonthly(aggregates: BankAggregate[]): MonthlyAggregate {
  if (aggregates.length === 0) {
    return {
      income: { ...EMPTY_INCOME },
      expenses: { ...EMPTY_EXPENSE },
      necessary: 0,
      discretionary: 0,
      incomeTotal: 0,
      expenseTotal: 0,
      totalMonths: 0,
    };
  }

  let totalMonths = 0;
  const incomeSum: IncomeBreakdownData = { ...EMPTY_INCOME };
  const expenseSum: ExpenseBreakdownData = { ...EMPTY_EXPENSE };
  let necessarySum = 0;
  let discretionarySum = 0;

  for (const a of aggregates) {
    const months = Math.max(a.periodMonths, 0.5);
    totalMonths += months;

    incomeSum.salary += a.income.salary;
    incomeSum.selfEmployed += a.income.selfEmployed;
    incomeSum.rental += a.income.rental;
    incomeSum.passive += a.income.passive;
    incomeSum.other += a.income.other;

    expenseSum.housing += a.expenses.housing;
    expenseSum.food += a.expenses.food;
    expenseSum.transport += a.expenses.transport;
    expenseSum.insurance += a.expenses.insurance;
    expenseSum.healthcare += a.expenses.healthcare;
    expenseSum.savings += a.expenses.savings;
    expenseSum.dining += a.expenses.dining;
    expenseSum.subscriptions += a.expenses.subscriptions;
    expenseSum.discretionary += a.expenses.discretionary;
    expenseSum.other += a.expenses.other;

    necessarySum += a.necessaryTotal;
    discretionarySum += a.discretionaryTotal;
  }

  if (totalMonths === 0) {
    return {
      income: { ...EMPTY_INCOME },
      expenses: { ...EMPTY_EXPENSE },
      necessary: 0,
      discretionary: 0,
      incomeTotal: 0,
      expenseTotal: 0,
      totalMonths: 0,
    };
  }

  const norm = (n: number) => Math.round(n / totalMonths);

  const income: IncomeBreakdownData = {
    salary: norm(incomeSum.salary),
    selfEmployed: norm(incomeSum.selfEmployed),
    rental: norm(incomeSum.rental),
    passive: norm(incomeSum.passive),
    other: norm(incomeSum.other),
  };
  const expenses: ExpenseBreakdownData = {
    housing: norm(expenseSum.housing),
    food: norm(expenseSum.food),
    transport: norm(expenseSum.transport),
    insurance: norm(expenseSum.insurance),
    healthcare: norm(expenseSum.healthcare),
    savings: norm(expenseSum.savings),
    dining: norm(expenseSum.dining),
    subscriptions: norm(expenseSum.subscriptions),
    discretionary: norm(expenseSum.discretionary),
    other: norm(expenseSum.other),
  };

  const incomeTotal =
    income.salary + income.selfEmployed + income.rental + income.passive + income.other;
  const expenseTotal =
    expenses.housing +
    expenses.food +
    expenses.transport +
    expenses.insurance +
    expenses.healthcare +
    expenses.savings +
    expenses.dining +
    expenses.subscriptions +
    expenses.discretionary +
    expenses.other;

  return {
    income,
    expenses,
    necessary: norm(necessarySum),
    discretionary: norm(discretionarySum),
    incomeTotal,
    expenseTotal,
    totalMonths,
  };
}

/**
 * Konsolidované odvození pravidelné hrubé měsíční mzdy.
 *
 * 1) Pokud AI detekovala stálou mzdu napříč výpisy (`detectedSalary`) a je
 *    konzistentní (mediánová hodnota > 0), použijeme ji jako čistou částku
 *    pro odvození hrubé.
 * 2) Jinak fallback: čistá ~ income.salary (vážený průměr za měsíc) → gross.
 * 3) Konverze net→gross: employee = 0.72, OSVČ = 0.80 (1:1 z Excelu).
 */
function inferGrossMonthlyIncome(
  aggregates: BankAggregate[],
  monthly: MonthlyAggregate,
  employmentType: EmploymentType,
): number {
  const inverseRatio = employmentType === "employee" ? 0.72 : 0.8;

  const detected = aggregates
    .map((a) => a.detectedSalary)
    .filter((v): v is number => v != null && v > 0)
    .sort((a, b) => a - b);

  if (detected.length > 0) {
    const mid = Math.floor(detected.length / 2);
    const median =
      detected.length % 2 === 0 && detected[mid - 1] !== undefined
        ? (detected[mid - 1]! + detected[mid]!) / 2
        : detected[mid]!;
    return Math.round(median / inverseRatio);
  }

  const netFromBreakdown =
    employmentType === "selfemployed"
      ? monthly.income.selfEmployed || monthly.incomeTotal
      : monthly.income.salary || monthly.incomeTotal;

  if (netFromBreakdown <= 0) return 0;
  return Math.round(netFromBreakdown / inverseRatio);
}

export function buildPlanFromAggregates(input: BuildPlanInput): PlanData {
  const {
    bankAggregates,
    id,
    employmentType,
    privacyMode,
    childrenCount = 0,
    hasPartner = 0,
    familyNetIncomeWithoutClient = 0,
  } = input;

  const monthly = averageMonthly(bankAggregates);
  const inferredAge = id?.birthDate ? ageFromBirthDate(id.birthDate) : null;
  const inferredGross = inferGrossMonthlyIncome(
    bankAggregates,
    monthly,
    employmentType,
  );
  const benefits = deriveBenefitsFromIncome(inferredGross, employmentType);

  const monthlyIncomeForCashflow = monthly.incomeTotal;
  const expensesNecessary = monthly.necessary;
  const expensesDiscretionary = monthly.discretionary;
  const expensesTotal = monthly.expenseTotal;

  const age = inferredAge ?? 38;
  const retirementAge = 65;

  const efa: EfaInputs = {
    age,
    retirementAge,
    employmentType,
    grossMonthlyIncome: inferredGross,

    netIncomeActive: benefits.netIncomeActive,
    rentActive: 0,
    otherActive: monthly.income.passive + monthly.income.other,
    rentPassive: monthly.income.rental,
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

  const retirementInput = {
    currentAge: age,
    retirementAge,
    currentSavings: 0,
    annualReturn: 0.04,
    annualInflation: 0.025,
    targetRealMonthlyPension: Math.max(monthlyIncomeForCashflow * 0.75, 35000),
    statePensionRealMonthly: 18500,
    payoutYears: 20,
  };
  const retirementCalc = calculateRetirement(retirementInput);
  const recommendedRetirementSaving = Math.round(
    retirementCalc.requiredMonthlyContribution,
  );

  const surplus = monthlyIncomeForCashflow - expensesTotal;

  // Detekovaný employment_type — beru první neunknown (typicky konzistentní napříč výpisy).
  const detectedEmploymentType = bankAggregates
    .map((a) => a.detectedEmploymentType)
    .find((t): t is "employee" | "selfemployed" => t === "employee" || t === "selfemployed");

  const detectedSalaryMedian = (() => {
    const arr = bankAggregates
      .map((a) => a.detectedSalary)
      .filter((v): v is number => v != null && v > 0)
      .sort((a, b) => a - b);
    if (arr.length === 0) return null;
    const mid = Math.floor(arr.length / 2);
    return arr.length % 2 === 0 && arr[mid - 1] !== undefined
      ? Math.round((arr[mid - 1]! + arr[mid]!) / 2)
      : arr[mid]!;
  })();

  const plan: PlanData = {
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
      income: monthlyIncomeForCashflow,
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
    privacyMode,
    detectedSalary: detectedSalaryMedian,
    detectedEmploymentType: detectedEmploymentType ?? "unknown",
  };

  // Privacy gating: co vystavit do plan_data
  if (privacyMode === "full") {
    plan.incomeBreakdown = monthly.income;
    plan.expenseBreakdown = monthly.expenses;
    plan.categorySummary = {
      necessary: expensesNecessary,
      discretionary: expensesDiscretionary,
    };
  } else if (privacyMode === "categorized") {
    plan.categorySummary = {
      necessary: expensesNecessary,
      discretionary: expensesDiscretionary,
    };
  }
  // aggregate_only: nic víc nepřidáváme (jen totály v cashflow)

  return plan;
}
