/**
 * Adapter: FormResponseData → BankAggregate
 *
 * Mapuje ručně vyplněný formulář na stejný shape, jaký produkuje AI extrakce
 * z bank statements. Tím zbytek pipeline (buildPlanFromAggregates →
 * EFA pojištění → penzijní výpočet) funguje beze změny.
 *
 * Klíčové rozdíly oproti bank statement:
 *   - periodMonths = 1 (form data jsou už měsíční průměry, ne sumy za období)
 *   - detectedSalary = form.income.netMonthly (pomáhá inferGrossMonthlyIncome)
 *   - Skipnuté kategorie přispívají 0
 *   - "Nevím" (amount=null) se počítá jako 0 pro výpočet, ale flagne se v debugu
 */

import type { BankAggregate } from "@/lib/calculator/finplan/build-plan";
import type {
  ExpenseBreakdownData,
  IncomeBreakdownData,
} from "@/lib/calculator/finplan/types";
import {
  CATEGORIES,
  type FormResponseData,
  type PlanExpenseBucket,
} from "./form-types";

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

function addToBucket(
  exp: ExpenseBreakdownData,
  bucket: PlanExpenseBucket,
  amount: number,
): void {
  exp[bucket] = (exp[bucket] ?? 0) + amount;
}

const NECESSARY_BUCKETS = new Set<PlanExpenseBucket>([
  "housing",
  "food",
  "transport",
  "insurance",
  "healthcare",
  "savings",
]);

/**
 * Build BankAggregate z form response.
 * employmentType určuje, jestli netMonthly jde do .salary nebo .selfEmployed.
 */
export function formToBankAggregate(
  form: FormResponseData,
  employmentType: "employee" | "selfemployed",
): BankAggregate {
  const income: IncomeBreakdownData = { ...EMPTY_INCOME };
  const expenses: ExpenseBreakdownData = { ...EMPTY_EXPENSE };

  // ── Income ─────────────────────────────────────────────────────
  const netMonthly = form.income.netMonthly ?? 0;
  if (employmentType === "selfemployed") {
    income.selfEmployed = netMonthly;
  } else {
    income.salary = netMonthly;
  }
  income.rental = form.income.rental ?? 0;
  income.passive = form.income.otherPassive ?? 0;

  // ── Expenses (per category) ────────────────────────────────────
  let necessaryTotal = 0;
  let discretionaryTotal = 0;

  for (const cat of CATEGORIES) {
    const catData = form.expenses[cat.key];
    if (!catData || catData.skipped) continue;

    for (const fieldDef of cat.fields) {
      const fv = catData.fields[fieldDef.key];
      if (!fv) continue;
      const amount = fv.amount ?? 0;
      if (amount <= 0) continue;

      addToBucket(expenses, fieldDef.planBucket, amount);

      if (fv.necessary) {
        necessaryTotal += amount;
      } else {
        discretionaryTotal += amount;
      }
    }
  }

  // ── Debts (monthly payments) → expenses.other ──────────────────
  // Suma splátek půjde do `other` kategorie + necessary/discretionary podle
  // user-flagu (typicky hypotéka=nezbytná, leasing=zbytný).
  for (const debt of form.debts) {
    const payment = debt.monthlyPayment ?? 0;
    if (payment <= 0) continue;
    addToBucket(expenses, "other", payment);
    if (debt.necessary) {
      necessaryTotal += payment;
    } else {
      discretionaryTotal += payment;
    }
  }

  // Nezbytné/zbytné — kontrola konzistence: pokud user nemarknul žádné, použijeme
  // default heuristiku (necessary buckets = housing/food/transport/insurance/healthcare/savings).
  if (necessaryTotal === 0 && discretionaryTotal === 0) {
    for (const [bucket, amount] of Object.entries(expenses) as [
      PlanExpenseBucket,
      number,
    ][]) {
      if (NECESSARY_BUCKETS.has(bucket)) necessaryTotal += amount;
      else discretionaryTotal += amount;
    }
  }

  return {
    periodMonths: 1, // form data jsou už měsíční
    bankName: "form-fallback",
    transactionCount: 0,
    income,
    expenses,
    necessaryTotal,
    discretionaryTotal,
    detectedSalary: netMonthly > 0 ? netMonthly : null,
    detectedEmploymentType: employmentType,
  };
}
