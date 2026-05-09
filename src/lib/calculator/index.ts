// =============================================================================
// PLACEHOLDER kalkulátor — bude nahrazen, jakmile dorazí 4FIN excel spec.
//
// Tahle implementace produkuje vizuálně rozumné, ale fiktivní výstupy z
// `CustomerExtraction`. NEODRÁŽÍ skutečnou matematiku 4FIN produktů — ta žije
// v jejich Excel sheetu a bude přenesena v další fázi.
//
// Cíl: aby PDF nabídka v demu četla profesionálně, i když poradce klikne na
// libovolný extrahovaný profil. Žádné záporné hodnoty, žádné NaN, žádné
// extrémně nereálné částky.
// =============================================================================

import type { CustomerExtraction } from "@/lib/openai/schemas/customer-extraction";

export type ProductRecommendation = {
  /** Lidsky čitelný název produktu (česky), např. „Penzijní spoření". */
  product: string;
  /** Měsíční částka v Kč. Vždy >= 0, zaokrouhleno na 100 Kč. */
  monthly_amount_czk: number;
  /** Jednověté zdůvodnění pro poradce / klienta v češtině. */
  rationale: string;
};

export type CalculationResult = {
  /** Doporučená měsíční úložka do likvidních / jistých nástrojů. */
  recommended_savings_czk_per_month: number;
  /** Doporučená měsíční úložka na penzi (DPS / DIP). */
  recommended_pension_czk_per_month: number;
  /** Cílová výše rezervy v Kč (~6× měsíční výdaje). */
  recommended_emergency_fund_czk: number;
  /** Očekávaný roční výnos portfolia v procentech (4 / 6 / 8 dle rizika). */
  estimated_annual_growth_pct: number;
  /** Konkrétní produkty s měsíčními částkami a zdůvodněním. */
  product_recommendations: ProductRecommendation[];
  /** Verze placeholderu — pomáhá identifikovat data v `calculations.calculator_version`. */
  calculator_version: "placeholder-v1";
};

const FALLBACK_INCOME_CZK = 35000; // střízlivá fallback hodnota pro min. pravděpodobné medián v ČR
const FALLBACK_EXPENSES_RATIO = 0.7; // pokud nevíme výdaje, odhadneme ~70 % příjmu

function roundTo(value: number, step: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value / step) * step;
}

function clampNonNegative(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function pickIncomeCzk(extraction: CustomerExtraction): number {
  const v = extraction.finances.monthly_income_czk;
  if (typeof v === "number" && v > 0) return v;
  return FALLBACK_INCOME_CZK;
}

function pickExpensesCzk(
  extraction: CustomerExtraction,
  income: number,
): number {
  const v = extraction.finances.monthly_expenses_czk;
  if (typeof v === "number" && v > 0) return v;
  return Math.round(income * FALLBACK_EXPENSES_RATIO);
}

function pensionRatioForAge(age: number | null): number {
  // Default 5 % příjmu na penzi; mladší o málo méně (déle se kumuluje), starší
  // víc (dohánění). Hrubý placeholder — reálná logika dorazí s 4FIN excelem.
  if (age === null) return 0.05;
  if (age < 25) return 0.04;
  if (age < 45) return 0.05;
  if (age < 55) return 0.07;
  return 0.09;
}

function growthPctForRisk(
  risk: CustomerExtraction["goals"]["risk_appetite"],
): number {
  switch (risk) {
    case "low":
      return 4;
    case "high":
      return 8;
    case "medium":
    default:
      return 6;
  }
}

function buildProductRecommendations(
  extraction: CustomerExtraction,
  monthlySavings: number,
  monthlyPension: number,
): ProductRecommendation[] {
  const recs: ProductRecommendation[] = [];
  const { customer, finances, goals } = extraction;
  const age = customer.age;
  const hasKids = customer.has_children === true;
  const hasMortgage = finances.has_mortgage === true;

  // Penze — vždy.
  recs.push({
    product: "Penzijní spoření (DPS / DIP)",
    monthly_amount_czk: roundTo(monthlyPension, 100),
    rationale:
      age !== null && age >= 45
        ? "Doplnění příjmu v důchodu — zbývající horizont vyžaduje vyšší úložku."
        : "Dlouhodobá kumulace s daňovou výhodou a státním příspěvkem.",
  });

  // Pravidelné spoření / investice — vždy.
  const investmentMonthly = roundTo(monthlySavings, 100);
  recs.push({
    product:
      goals.risk_appetite === "high"
        ? "Investiční spoření do akciových ETF"
        : "Investiční spoření v podílových fondech",
    monthly_amount_czk: investmentMonthly,
    rationale:
      goals.primary_goal !== null
        ? `Naplnění cíle: ${goals.primary_goal}`
        : "Pravidelná tvorba majetku v souladu s rizikovým profilem.",
  });

  // Životní pojištění — pokud má hypotéku nebo děti.
  if (hasMortgage || hasKids) {
    const income = pickIncomeCzk(extraction);
    const lifePremium = roundTo(income * 0.025, 100);
    recs.push({
      product: "Rizikové životní pojištění",
      monthly_amount_czk: lifePremium,
      rationale: hasMortgage
        ? "Krytí splátky hypotéky a zajištění rodiny pro případ výpadku příjmu."
        : "Zajištění rodiny pro případ výpadku příjmu živitele.",
    });
  }

  // Hypotéka — pokud klient hledá bydlení (cíl obsahuje slova jako byt/dům).
  const goalText = (goals.primary_goal ?? "").toLowerCase();
  if (
    !hasMortgage &&
    (goalText.includes("byt") ||
      goalText.includes("dům") ||
      goalText.includes("bydlen"))
  ) {
    recs.push({
      product: "Hypotéka",
      monthly_amount_czk: 0,
      rationale:
        "Pomůžeme zajistit hypoteční financování v aktuálních podmínkách trhu.",
    });
  }

  return recs;
}

export function calculate(
  extraction: CustomerExtraction,
): CalculationResult {
  const income = pickIncomeCzk(extraction);
  const expenses = pickExpensesCzk(extraction, income);

  const recommendedSavings = clampNonNegative(income * 0.1);
  const pensionRatio = pensionRatioForAge(extraction.customer.age);
  const recommendedPension = clampNonNegative(income * pensionRatio);

  const emergencyFund = clampNonNegative(expenses * 6);

  const growthPct = growthPctForRisk(extraction.goals.risk_appetite);

  const productRecommendations = buildProductRecommendations(
    extraction,
    recommendedSavings,
    recommendedPension,
  );

  return {
    recommended_savings_czk_per_month: roundTo(recommendedSavings, 100),
    recommended_pension_czk_per_month: roundTo(recommendedPension, 100),
    recommended_emergency_fund_czk: roundTo(emergencyFund, 1000),
    estimated_annual_growth_pct: growthPct,
    product_recommendations: productRecommendations,
    calculator_version: "placeholder-v1",
  };
}
