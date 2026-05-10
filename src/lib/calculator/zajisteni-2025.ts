// Port from ~/Downloads/Finplan 2 /src/lib/calculations.ts (Lukáš, 2026-05-07).
// Implementace přesně dle Excelu „Metodika výpočtu zajištění 2025.xlsx",
// sheet NEMAZATNEMĚNIT(!). Vstupy a výstupy jsou v Kč/měs (případně let).
//
// Při změnách logiky drž se Lukášova zdroje a Pythonu v `duchodova-kalkulacka/`.

import type {
  EfaCoverageRow,
  EfaCoverageVariant,
  EfaInputs,
  EfaInsurance,
  EmploymentType,
} from "./types";

// ---------------------------------------------------------------------
// Odvození státních dávek a čistého příjmu z hrubého příjmu.
//
// Aproximace pro 2026 ČR — vychází z metodiky EFA + běžných sazeb:
//
// ZAMĚSTNANEC (DPČ/DPP/HPP):
//   - Z hrubé mzdy: 11 % zaměstnanec (4.5 % ZP + 6.5 % SP), 25 % zaměstnavatel,
//     daň 15 % po slevě 30 840 Kč/rok
//   - Čistá ≈ 72 % hrubé
//   - Vyměřovací základ pro důchod ≈ hrubá mzda
//   - Invalidní důchod = základní výměra (4 040) + procentní z OVZ
//
// OSVČ (paušál 60 % výdajů):
//   - Daňový základ = 40 % hrubého obratu
//   - Soc. pojištění VZ = max(50 % daňového základu, min. 30 % průměrné mzdy)
//   - Čistá ≈ 80 % hrubé (méně odvodů, ale platí si pojištění sám)
//   - Vyměřovací základ pro důchod = 50 % daňového základu = 20 % hrubého
//     → invalidní/vdovský/sirotčí cca poloviční oproti zaměstnanci
//   - Nemocenská: 0 (typicky nehradí dobrovolné nemocenské)
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
  employmentType: EmploymentType
): DerivedBenefits {
  if (employmentType === "employee") {
    const net = Math.round(grossMonthlyIncome * 0.72);
    return {
      netIncomeActive: net,
      statePensionDisabilityI: Math.round(net * 0.30),
      statePensionDisabilityII: Math.round(net * 0.55),
      statePensionDisabilityIII: Math.round(net * 0.75),
      stateSickPay: Math.round(net * 0.55),
      widowPension: Math.round(net * 0.35),
      orphanPension: Math.round(net * 0.18),
    };
  }
  // OSVČ
  const net = Math.round(grossMonthlyIncome * 0.80);
  return {
    netIncomeActive: net,
    statePensionDisabilityI: Math.round(net * 0.18),
    statePensionDisabilityII: Math.round(net * 0.35),
    statePensionDisabilityIII: Math.round(net * 0.50),
    stateSickPay: 0,
    widowPension: Math.round(net * 0.22),
    orphanPension: Math.round(net * 0.12),
  };
}

// =====================================================================
// Finance helpery — port Python backendu z `duchodova-kalkulacka/`.
// API i hodnoty 1:1 odpovídají `app/calc.py:compute()`.
//
// Klíčové konvence:
// - Efektivní měsíční úrok i_m = (1+i_a)^(1/12) − 1  (NIKDY i_a/12).
// - Akumulace = ordinary annuity (vklad na konci měsíce).
// =====================================================================

export function effectiveMonthlyRate(annualRate: number): number {
  return Math.pow(1 + annualRate, 1 / 12) - 1;
}

export function fvAnnuity(
  pmt: number,
  im: number,
  nMonths: number,
  pv = 0
): number {
  if (nMonths <= 0) return pv;
  if (im === 0) return pv + pmt * nMonths;
  const growth = Math.pow(1 + im, nMonths);
  return pv * growth + (pmt * (growth - 1)) / im;
}

export function pvAnnuity(pmt: number, im: number, nMonths: number): number {
  if (nMonths <= 0) return 0;
  if (im === 0) return pmt * nMonths;
  return (pmt * (1 - Math.pow(1 + im, -nMonths))) / im;
}

export function requiredPmt(
  targetFv: number,
  im: number,
  nMonths: number,
  pv = 0
): number {
  if (nMonths <= 0) return 0;
  if (im === 0) return Math.max(0, (targetFv - pv) / nMonths);
  const growth = Math.pow(1 + im, nMonths);
  const pmt = ((targetFv - pv * growth) * im) / (growth - 1);
  return Math.max(0, pmt);
}

// =====================================================================
// EFA — metodika výpočtu zajištění
// Implementace přesně dle Excelu „Metodika výpočtu zajištění 2025.xlsx",
// sheet NEMAZATNEMĚNIT(!).
// =====================================================================

/**
 * Pojistná částka EFA z měsíčního CF.
 * Pokud CF >= 0, není třeba zajistit (vrací null).
 */
function efaSum(
  monthlyCashflow: number,
  years: number,
  annualReturn: number
): number | null {
  if (monthlyCashflow >= 0) return null;
  const r = Math.pow(1 + annualReturn, 1 / 12) - 1;
  return pvAnnuity(-monthlyCashflow, r, years * 12);
}

/**
 * Příjem klienta při invaliditě (měs.) dle vzorce D8:
 *   IF(pokles=0, -(aktivní+pronájem_akt+ostatní_akt),
 *      ((aktivní+pronájem_akt+ostatní_akt)*(pokles-100%))) * -1
 *   + (podnikání + pasivní_pronájem + pasivní_ostatní)
 */
function disabilityIncome(efa: EfaInputs, drop: number): number {
  const active = efa.netIncomeActive + efa.rentActive + efa.otherActive;
  const passive = efa.rentPassive + efa.otherPassive; // B11 (podnikání) v Excelu = 0
  const remaining = drop === 0 ? active : active * (1 - drop);
  return remaining + passive;
}

/**
 * Aplikuje korekci výdajů: výdaje × (1 + korekce).
 * Vzorec H8/I8: IF(korekce<=0%, výdaje*(korekce+100%), ...) — efektivně totéž.
 */
function correctExpenses(expenses: number, correction: number): number {
  return expenses * (1 + correction);
}

function buildVariant(
  income: number,
  expenses: number,
  years: number,
  annualReturn: number
): EfaCoverageVariant {
  const cf = income - expenses;
  return {
    monthlyCashflow: cf,
    recommendedSum: efaSum(cf, years, annualReturn),
    yearsCovered: years,
  };
}

// ---------------------------------------------------------------------
// Smrt — pozůstalí
// ---------------------------------------------------------------------

function deathFamilyIncome(efa: EfaInputs): number {
  // E31: peníze od státu = vdovský × manžel + sirotčí × dětí
  const state = efa.widowPension * efa.hasPartner + efa.orphanPension * efa.childrenCount;
  // E32: příjem rodiny bez klienta + pasivní příjmy
  const family = efa.familyNetIncomeWithoutClient + efa.rentPassive + efa.otherPassive;
  return state + family;
}

function buildDeathRow(efa: EfaInputs): EfaCoverageRow {
  const income = deathFamilyIncome(efa);
  const totalExp = efa.expensesNecessary + efa.expensesDiscretionary;

  const expTotal = correctExpenses(totalExp, efa.expensesCorrectionDeath);
  const expNecessary = correctExpenses(efa.expensesNecessary, efa.expensesCorrectionDeath);

  // Krytí pro příjmy rodiny — vzorec E60
  const totalClientIncome =
    efa.netIncomeActive +
    efa.rentPassive +
    efa.otherPassive +
    efa.rentActive +
    efa.otherActive;
  const cfFamilyIncome =
    income - (totalClientIncome + efa.familyNetIncomeWithoutClient);

  return {
    forTotalExpenses: buildVariant(income, expTotal, efa.yearsDeath, efa.returnDeath),
    forNecessaryExpenses: buildVariant(
      income,
      expNecessary,
      efa.yearsDeath,
      efa.returnDeath
    ),
    forFamilyIncome: {
      monthlyCashflow: cfFamilyIncome,
      recommendedSum: efaSum(cfFamilyIncome, efa.yearsDeath, efa.returnDeath),
      yearsCovered: efa.yearsDeath,
    },
  };
}

// ---------------------------------------------------------------------
// Invalidita I / II / III
// ---------------------------------------------------------------------

function buildDisabilityRow(
  efa: EfaInputs,
  drop: number,
  statePension: number,
  expCorrection: number,
  years: number,
  annualReturn: number
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
  const fullHouseholdIncome = fullClientIncome + efa.familyNetIncomeWithoutClient;
  const cfFamilyIncome = householdIncome - fullHouseholdIncome;

  return {
    forTotalExpenses: buildVariant(householdIncome, expTotal, years, annualReturn),
    forNecessaryExpenses: buildVariant(
      householdIncome,
      expNecessary,
      years,
      annualReturn
    ),
    forFamilyIncome: {
      monthlyCashflow: cfFamilyIncome,
      recommendedSum: efaSum(cfFamilyIncome, years, annualReturn),
      yearsCovered: years,
    },
  };
}

// ---------------------------------------------------------------------
// Trvalé následky úrazu — vzorec L66 / L42 / L54
//   IF(krytí="Není třeba zajistit", 1 000 000,
//      IF(krytí/2 > 1 000 000, krytí*50%, 1 000 000))
// ---------------------------------------------------------------------

function permanentInjuryFromCoverage(disabilityIII: number | null): number {
  const FLOOR = 1_000_000;
  if (disabilityIII === null) return FLOOR;
  if (disabilityIII / 2 > FLOOR) return disabilityIII * 0.5;
  return FLOOR;
}

// ---------------------------------------------------------------------
// Hlavní výpočet
// ---------------------------------------------------------------------

export function calculateEfaInsurance(efa: EfaInputs): EfaInsurance {
  const death = buildDeathRow(efa);
  const disabilityI = buildDisabilityRow(
    efa,
    efa.disabilityIncomeDropI,
    efa.statePensionDisabilityI,
    efa.expensesCorrectionDisabilityI,
    efa.yearsDisabilityI,
    efa.returnDisabilityI
  );
  const disabilityII = buildDisabilityRow(
    efa,
    efa.disabilityIncomeDropII,
    efa.statePensionDisabilityII,
    efa.expensesCorrectionDisabilityII,
    efa.yearsDisabilityII,
    efa.returnDisabilityII
  );
  const disabilityIII = buildDisabilityRow(
    efa,
    efa.disabilityIncomeDropIII,
    efa.statePensionDisabilityIII,
    efa.expensesCorrectionDisabilityIII,
    efa.yearsDisabilityIII,
    efa.returnDisabilityIII
  );

  // Trvalé následky vychází z modulu „Krytí pro příjmy rodiny" — invalidita III.
  const permanentInjury = permanentInjuryFromCoverage(
    disabilityIII.forFamilyIncome.recommendedSum
  );

  // Závažné onemocnění (L44/L56/L68) = aktivní netto × 24 měsíců
  const seriousIllness = efa.netIncomeActive * 24;

  // Denní dávky (L43/L45/L46) = (výdaje – stát_nemocenská – příjmy_rodiny – pasivní) / 30
  const stateMonthlyCover =
    efa.stateSickPay +
    efa.familyNetIncomeWithoutClient +
    efa.rentPassive +
    efa.otherPassive;
  const totalExpenses = efa.expensesNecessary + efa.expensesDiscretionary;

  const workIncapacityDailyAmount = Math.max(
    0,
    (totalExpenses - stateMonthlyCover) / 30
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

// ---------------------------------------------------------------------
// Mapování EFA → zjednodušený `Insurance` blok pro hlavní vizualizaci.
// Standardní volba EFA poradce:
//   - Smrt          → krytí pro PŘÍJMY RODINY
//   - Invalidita    → krytí pro CELKOVÉ VÝDAJE, vždy III. stupně
//   - Závažné nem.  → 24 × netto
//   - Trvalé násl.  → derivované z invalidity III.
// ---------------------------------------------------------------------

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
      // Mock: 0,06 % z pojistné částky / měs.
      monthlyPremium: Math.round((recommended * 0.0006) / 12) * 12,
    },
    efa: e,
  };
}

// =====================================================================
// Důchodová kalkulačka — port Python backendu z `duchodova-kalkulacka/`.
// =====================================================================

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

function formatStateCoverage(state: number, total: number): string {
  const fmt = (n: number) =>
    Math.round(n).toLocaleString("cs-CZ").replace(/ /g, " ");
  return `${fmt(state)} / ${fmt(total)} Kč`;
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
    inp.targetRealMonthlyPension - inp.statePensionRealMonthly
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
      inp.statePensionRealMonthly + gapReal
    ),
    projection,
  };
}
