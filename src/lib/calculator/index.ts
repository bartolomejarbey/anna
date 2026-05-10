// Calculator entry — backward-compatible `calculate()` wrapping the new
// EFA-based math (`zajisteni-2025` + `adapter`).
//
// PDF + offer narrative still consume `CalculationResult`. The new EFA
// `PlanData` is emitted alongside as an extra field so new UI components
// can render full Insurance / Retirement / Cashflow sections.

import type { CustomerExtraction } from "@/lib/openai/schemas/customer-extraction";
import { buildPlanData } from "./adapter";
import type { MeetingFacts, PlanData } from "./types";

export type { MeetingFacts, PlanData } from "./types";
export { buildPlanData, factsToEfaInputs, EFA_DEFAULTS, RETIREMENT_DEFAULTS } from "./adapter";

// ---------------------------------------------------------------------
// Backwards-compat shape (consumed by PDF + narrative)
// ---------------------------------------------------------------------

export type ProductRecommendation = {
  product: string;
  monthly_amount_czk: number;
  rationale: string;
};

export type CalculationResult = {
  recommended_savings_czk_per_month: number;
  recommended_pension_czk_per_month: number;
  recommended_emergency_fund_czk: number;
  estimated_annual_growth_pct: number;
  product_recommendations: ProductRecommendation[];
  calculator_version: "zajisteni-2025-v1";
  /** Plný EFA / důchod / cashflow plán pro nové UI. */
  plan: PlanData;
};

function roundTo(value: number, step: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value / step) * step;
}

function formatCzkRound(n: number): string {
  return Math.round(n).toLocaleString("cs-CZ");
}

function buildProductRecommendations(plan: PlanData): ProductRecommendation[] {
  const recs: ProductRecommendation[] = [];
  const { insurance, retirement, cashflow, efa } = plan;

  // 1. Životní pojištění (rizikové) — vždy, dimenzované z EFA
  const lifeMonthly = roundTo(insurance.monthlyPremium, 100);
  if (insurance.recommended > 0 && lifeMonthly > 0) {
    recs.push({
      product: "Rizikové životní pojištění",
      monthly_amount_czk: lifeMonthly,
      rationale: `Krytí ${formatCzkRound(insurance.recommended)} Kč (smrt, invalidita, závažné onemocnění, trvalé následky úrazu) odpovídá výpočtu dle EFA metodiky.`,
    });
  }

  // 2. Penze — z requiredMonthlyContribution (Python-port)
  if (retirement.recommendedMonthlySaving > 0) {
    recs.push({
      product: "Penzijní spoření (DPS / DIP)",
      monthly_amount_czk: roundTo(retirement.recommendedMonthlySaving, 100),
      rationale: `Doporučená měsíční úložka, aby ${retirement.currentAge}letý klient v ${retirement.retirementAge} dosáhl cílovou rentu ${formatCzkRound(retirement.targetIncome)} Kč/měs.`,
    });
  }

  // 3. Pravidelné spoření — z regularSurplus po pokrytí životka + penze
  const remainingSurplus = Math.max(
    0,
    cashflow.regularSurplus - lifeMonthly
  );
  if (remainingSurplus > 0) {
    recs.push({
      product: "Investiční spoření",
      monthly_amount_czk: roundTo(remainingSurplus, 100),
      rationale: `Volný měsíční zůstatek po pokrytí pojistky a penze — vhodný pro tvorbu majetku.`,
    });
  }

  // 4. Denní dávky (pracovní neschopnost / hospitalizace) — pokud výpočet > 0
  if (efa.workIncapacityDailyAmount > 0) {
    recs.push({
      product: "Denní dávky (pracovní neschopnost)",
      monthly_amount_czk: 0,
      rationale: `Doporučená denní dávka ${formatCzkRound(efa.workIncapacityDailyAmount)} Kč/den pokrývá nutné výdaje rodiny v případě dlouhodobé nemoci.`,
    });
  }

  return recs;
}

// ---------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------

export function calculate(
  extraction: CustomerExtraction,
  options?: { customerNameFromDb?: string | null }
): CalculationResult {
  const facts: MeetingFacts | null = extraction.meeting_facts ?? null;

  const plan = buildPlanData(
    extraction,
    facts,
    options?.customerNameFromDb ?? null
  );

  const recommendedSavings = Math.max(0, plan.cashflow.regularSurplus);
  const recommendedPension = plan.retirement.recommendedMonthlySaving;
  const emergencyFund = plan.cashflow.expenses * 6;

  // Roční výnos: použijeme retirement annualReturnPct × 100; pokud advisor
  // později naváže risk profile, můžeme přepsat na 4/6/8 dle goals.risk_appetite.
  const growthPctFromRetirement = Math.round(plan.retirement.annualReturnPct * 100);
  const growthPct =
    extraction.goals.risk_appetite === "high"
      ? 8
      : extraction.goals.risk_appetite === "low"
        ? 4
        : growthPctFromRetirement || 6;

  return {
    recommended_savings_czk_per_month: roundTo(recommendedSavings, 100),
    recommended_pension_czk_per_month: roundTo(recommendedPension, 100),
    recommended_emergency_fund_czk: roundTo(emergencyFund, 1000),
    estimated_annual_growth_pct: growthPct,
    product_recommendations: buildProductRecommendations(plan),
    calculator_version: "zajisteni-2025-v1",
    plan,
  };
}
