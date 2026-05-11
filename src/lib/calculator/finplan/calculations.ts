/**
 * EFA výpočty — port z Finplanu 1.2.
 *
 * Metodika 1:1 dle Excelu „Metodika výpočtu zajištění 2025.xlsx", sheet
 * NEMAZATNEMĚNIT. Žádné změny logiky vs. Lukášova verze — math je správně.
 */

import type {
  EfaCoverageRow,
  EfaCoverageVariant,
  EfaInputs,
  EfaInsurance,
  EmploymentType,
} from "./types";

// ---------------------------------------------------------------------
// Odvození státních dávek z hrubého příjmu (zaměstnanec 72 %, OSVČ 80 %).
// ---------------------------------------------------------------------

export interface DerivedBenefits {
  netIncomeActive: number;
  statePensionDisabilityI: number;
  statePensionDisabilityII: number;
  statePensionDisabilityIII: number;
  stateSickPay: number;
  widowPension: number;
  orphanPension: number;
}

export function deriveBenefitsFromIncome(
  grossMonthlyIncome: number,
  employmentType: EmploymentType,
): DerivedBenefits {
  if (employmentType === "employee") {
    const net = Math.round(grossMonthlyIncome * 0.72);
    return {
      netIncomeActive: net,
      statePensionDisabilityI: Math.round(net * 0.3),
      statePensionDisabilityII: Math.round(net * 0.55),
      statePensionDisabilityIII: Math.round(net * 0.75),
      stateSickPay: Math.round(net * 0.55),
      widowPension: Math.round(net * 0.35),
      orphanPension: Math.round(net * 0.18),
    };
  }
  const net = Math.round(grossMonthlyIncome * 0.8);
  return {
    netIncomeActive: net,
    statePensionDisabilityI: Math.round(net * 0.18),
    statePensionDisabilityII: Math.round(net * 0.35),
    statePensionDisabilityIII: Math.round(net * 0.5),
    stateSickPay: 0,
    widowPension: Math.round(net * 0.22),
    orphanPension: Math.round(net * 0.12),
  };
}

// ---------------------------------------------------------------------
// Helpery — PV/FV anuita (1:1 z Python backendu duchodova-kalkulacka).
// ---------------------------------------------------------------------

function effectiveMonthlyRate(annualRate: number): number {
  return Math.pow(1 + annualRate, 1 / 12) - 1;
}

function fvAnnuity(pmt: number, im: number, nMonths: number, pv = 0): number {
  if (nMonths <= 0) return pv;
  if (im === 0) return pv + pmt * nMonths;
  const growth = Math.pow(1 + im, nMonths);
  return pv * growth + (pmt * (growth - 1)) / im;
}

function pvAnnuity(pmt: number, im: number, nMonths: number): number {
  if (nMonths <= 0) return 0;
  if (im === 0) return pmt * nMonths;
  return (pmt * (1 - Math.pow(1 + im, -nMonths))) / im;
}

function requiredPmt(
  targetFv: number,
  im: number,
  nMonths: number,
  pv = 0,
): number {
  if (nMonths <= 0) return 0;
  if (im === 0) return Math.max(0, (targetFv - pv) / nMonths);
  const growth = Math.pow(1 + im, nMonths);
  const pmt = ((targetFv - pv * growth) * im) / (growth - 1);
  return Math.max(0, pmt);
}

// ---------------------------------------------------------------------
// EFA — pojistná částka z měsíčního CF
// ---------------------------------------------------------------------

function efaSum(
  monthlyCashflow: number,
  years: number,
  annualReturn: number,
): number | null {
  if (monthlyCashflow >= 0) return null;
  const r = effectiveMonthlyRate(annualReturn);
  return pvAnnuity(-monthlyCashflow, r, years * 12);
}

function disabilityIncome(efa: EfaInputs, drop: number): number {
  const active = efa.netIncomeActive + efa.rentActive + efa.otherActive;
  const passive = efa.rentPassive + efa.otherPassive;
  const remaining = drop === 0 ? active : active * (1 - drop);
  return remaining + passive;
}

function correctExpenses(expenses: number, correction: number): number {
  return expenses * (1 + correction);
}

function buildVariant(
  income: number,
  expenses: number,
  years: number,
  annualReturn: number,
): EfaCoverageVariant {
  const cf = income - expenses;
  return {
    monthlyCashflow: cf,
    recommendedSum: efaSum(cf, years, annualReturn),
    yearsCovered: years,
  };
}

// ---------------------------------------------------------------------
// Smrt
// ---------------------------------------------------------------------

function deathFamilyIncome(efa: EfaInputs): number {
  const state =
    efa.widowPension * efa.hasPartner + efa.orphanPension * efa.childrenCount;
  const family =
    efa.familyNetIncomeWithoutClient + efa.rentPassive + efa.otherPassive;
  return state + family;
}

function buildDeathRow(efa: EfaInputs): EfaCoverageRow {
  const income = deathFamilyIncome(efa);
  const totalExp = efa.expensesNecessary + efa.expensesDiscretionary;

  const expTotal = correctExpenses(totalExp, efa.expensesCorrectionDeath);
  const expNecessary = correctExpenses(
    efa.expensesNecessary,
    efa.expensesCorrectionDeath,
  );

  const totalClientIncome =
    efa.netIncomeActive +
    efa.rentPassive +
    efa.otherPassive +
    efa.rentActive +
    efa.otherActive;
  const cfFamilyIncome =
    income - (totalClientIncome + efa.familyNetIncomeWithoutClient);

  return {
    forTotalExpenses: buildVariant(
      income,
      expTotal,
      efa.yearsDeath,
      efa.returnDeath,
    ),
    forNecessaryExpenses: buildVariant(
      income,
      expNecessary,
      efa.yearsDeath,
      efa.returnDeath,
    ),
    forFamilyIncome: {
      monthlyCashflow: cfFamilyIncome,
      recommendedSum: efaSum(cfFamilyIncome, efa.yearsDeath, efa.returnDeath),
      yearsCovered: efa.yearsDeath,
    },
  };
}

// ---------------------------------------------------------------------
// Invalidita I/II/III
// ---------------------------------------------------------------------

function buildDisabilityRow(
  efa: EfaInputs,
  drop: number,
  statePension: number,
  expCorrection: number,
  years: number,
  annualReturn: number,
): EfaCoverageRow {
  const clientIncome = disabilityIncome(efa, drop) + statePension;
  const householdIncome = clientIncome + efa.familyNetIncomeWithoutClient;
  const totalExp = efa.expensesNecessary + efa.expensesDiscretionary;

  const expTotal = correctExpenses(totalExp, expCorrection);
  const expNecessary = correctExpenses(efa.expensesNecessary, expCorrection);

  const fullClientIncome =
    efa.netIncomeActive +
    efa.rentPassive +
    efa.otherPassive +
    efa.rentActive +
    efa.otherActive;
  const fullHouseholdIncome =
    fullClientIncome + efa.familyNetIncomeWithoutClient;
  const cfFamilyIncome = householdIncome - fullHouseholdIncome;

  return {
    forTotalExpenses: buildVariant(
      householdIncome,
      expTotal,
      years,
      annualReturn,
    ),
    forNecessaryExpenses: buildVariant(
      householdIncome,
      expNecessary,
      years,
      annualReturn,
    ),
    forFamilyIncome: {
      monthlyCashflow: cfFamilyIncome,
      recommendedSum: efaSum(cfFamilyIncome, years, annualReturn),
      yearsCovered: years,
    },
  };
}

function permanentInjuryFromCoverage(disabilityIII: number | null): number {
  const FLOOR = 1_000_000;
  if (disabilityIII === null) return FLOOR;
  if (disabilityIII / 2 > FLOOR) return disabilityIII * 0.5;
  return FLOOR;
}

// ---------------------------------------------------------------------
// Hlavní EFA výpočet
// ---------------------------------------------------------------------

export function calculateEfaInsurance(efa: EfaInputs): EfaInsurance {
  const death = buildDeathRow(efa);
  const disabilityI = buildDisabilityRow(
    efa,
    efa.disabilityIncomeDropI,
    efa.statePensionDisabilityI,
    efa.expensesCorrectionDisabilityI,
    efa.yearsDisabilityI,
    efa.returnDisabilityI,
  );
  const disabilityII = buildDisabilityRow(
    efa,
    efa.disabilityIncomeDropII,
    efa.statePensionDisabilityII,
    efa.expensesCorrectionDisabilityII,
    efa.yearsDisabilityII,
    efa.returnDisabilityII,
  );
  const disabilityIII = buildDisabilityRow(
    efa,
    efa.disabilityIncomeDropIII,
    efa.statePensionDisabilityIII,
    efa.expensesCorrectionDisabilityIII,
    efa.yearsDisabilityIII,
    efa.returnDisabilityIII,
  );

  const permanentInjury = permanentInjuryFromCoverage(
    disabilityIII.forFamilyIncome.recommendedSum,
  );

  const seriousIllness = efa.netIncomeActive * 24;

  const stateMonthlyCover =
    efa.stateSickPay +
    efa.familyNetIncomeWithoutClient +
    efa.rentPassive +
    efa.otherPassive;
  const totalExpenses = efa.expensesNecessary + efa.expensesDiscretionary;

  const workIncapacityDailyAmount = Math.max(
    0,
    (totalExpenses - stateMonthlyCover) / 30,
  );
  const hospitalizationDailyAmount = workIncapacityDailyAmount;
  const injuryDailyAmount = workIncapacityDailyAmount;

  return {
    death,
    disabilityI,
    disabilityII,
    disabilityIII,
    permanentInjury,
    seriousIllness,
    workIncapacityDailyAmount,
    hospitalizationDailyAmount,
    injuryDailyAmount,
  };
}

export function buildInsuranceFromEfa(efa: EfaInputs) {
  const e = calculateEfaInsurance(efa);

  const death = e.death.forFamilyIncome.recommendedSum ?? 0;
  const disability = e.disabilityIII.forTotalExpenses.recommendedSum ?? 0;
  const illness = e.seriousIllness;
  const injury = e.permanentInjury;

  const recommended = death + disability + illness + injury;

  return {
    insurance: {
      recommended,
      breakdown: { death, disability, illness, injury },
      monthlyPremium: Math.round((recommended * 0.0006) / 12) * 12,
    },
    efa: e,
  };
}

// ---------------------------------------------------------------------
// Důchodová projekce
// ---------------------------------------------------------------------

function formatStateCoverage(state: number, total: number): string {
  const fmt = (n: number) =>
    Math.round(n).toLocaleString("cs-CZ").replace(/ /g, " ");
  return `${fmt(state)} / ${fmt(total)} Kč`;
}

export interface RetirementInput {
  currentAge: number;
  retirementAge: number;
  currentSavings: number;
  annualReturn: number;
  annualInflation: number;
  targetRealMonthlyPension: number;
  statePensionRealMonthly: number;
  payoutYears: number;
  monthlyContribution?: number;
}

export interface RetirementProjectionPoint {
  yearOffset: number;
  age: number;
  contributed: number;
  portfolioValueNominal: number;
  portfolioValueReal: number;
}

export interface RetirementResult {
  currentAge: number;
  retirementAge: number;
  yearsToRetirement: number;
  monthsToRetirement: number;
  payoutYears: number;
  payoutMonths: number;

  monthlyReturnEff: number;
  monthlyInflationEff: number;

  gapRealMonthly: number;
  gapNominalFirstMonthly: number;
  targetRealMonthlyPension: number;
  statePensionRealMonthly: number;
  targetCapitalNominalAtRetirement: number;
  targetCapitalRealAtRetirement: number;

  requiredMonthlyContribution: number;
  appliedMonthlyContribution: number;
  coveragePct: number;
  totalOwnContributions: number;
  portfolioValueAtRetirementNominal: number;
  portfolioValueAtRetirementReal: number;
  stateCoverageText: string;

  projection: RetirementProjectionPoint[];
}

export function calculateRetirement(inp: RetirementInput): RetirementResult {
  if (inp.retirementAge <= inp.currentAge) {
    throw new Error("retirementAge must be > currentAge");
  }

  const years = inp.retirementAge - inp.currentAge;
  const months = years * 12;
  const payoutMonths = inp.payoutYears * 12;

  const im = effectiveMonthlyRate(inp.annualReturn);
  const gm = effectiveMonthlyRate(inp.annualInflation);

  const gapReal = Math.max(
    0,
    inp.targetRealMonthlyPension - inp.statePensionRealMonthly,
  );

  const pmtNominal = gapReal * Math.pow(1 + inp.annualInflation, years);
  const targetNominal = pvAnnuity(pmtNominal, im, payoutMonths);
  const targetRealInToday =
    targetNominal / Math.pow(1 + inp.annualInflation, years);

  const pmtRequired = requiredPmt(targetNominal, im, months, inp.currentSavings);
  const pmtUsed =
    typeof inp.monthlyContribution === "number" && inp.monthlyContribution >= 0
      ? inp.monthlyContribution
      : pmtRequired;

  const fvActual = fvAnnuity(pmtUsed, im, months, inp.currentSavings);
  const coveragePct = targetNominal > 0 ? (fvActual / targetNominal) * 100 : 100;
  const totalOwn = pmtUsed * months + inp.currentSavings;

  const projection: RetirementProjectionPoint[] = [];
  let portfolio = inp.currentSavings;
  let contributed = inp.currentSavings;
  for (let y = 0; y <= years; y++) {
    const realFactor = Math.pow(1 + inp.annualInflation, y);
    projection.push({
      yearOffset: y,
      age: inp.currentAge + y,
      contributed,
      portfolioValueNominal: portfolio,
      portfolioValueReal: portfolio / realFactor,
    });
    if (y < years) {
      for (let m = 0; m < 12; m++) {
        portfolio = portfolio * (1 + im) + pmtUsed;
        contributed += pmtUsed;
      }
    }
  }

  return {
    currentAge: inp.currentAge,
    retirementAge: inp.retirementAge,
    yearsToRetirement: years,
    monthsToRetirement: months,
    payoutYears: inp.payoutYears,
    payoutMonths,
    monthlyReturnEff: im,
    monthlyInflationEff: gm,
    gapRealMonthly: gapReal,
    gapNominalFirstMonthly: pmtNominal,
    targetRealMonthlyPension: inp.targetRealMonthlyPension,
    statePensionRealMonthly: inp.statePensionRealMonthly,
    targetCapitalNominalAtRetirement: targetNominal,
    targetCapitalRealAtRetirement: targetRealInToday,
    requiredMonthlyContribution: pmtRequired,
    appliedMonthlyContribution: pmtUsed,
    coveragePct,
    totalOwnContributions: totalOwn,
    portfolioValueAtRetirementNominal: fvActual,
    portfolioValueAtRetirementReal:
      fvActual / Math.pow(1 + inp.annualInflation, years),
    stateCoverageText: formatStateCoverage(
      inp.statePensionRealMonthly,
      inp.statePensionRealMonthly + gapReal,
    ),
    projection,
  };
}
