#!/usr/bin/env node
/**
 * Parity test: výstup TS portu `calculations.ts` vs. cached hodnoty
 * v originálním Excelu „Metodika výpočtu zajištění 2025.xlsx".
 *
 * Vstupy klienta — přesně dle defaultu Excelu (sheet „Zadání hodnot klienta").
 * Pokud math sedí, všechny řádky tabulky níže musí mít status ✓ a delta < 1 Kč.
 *
 * Tenhle script reimplementuje logiku v .mjs (zrcadlí calculations.ts), abychom
 * vůbec mohli spustit bez TS toolchainu. Když se logika v calculations.ts
 * nezmění, test pomáhá hlídat regrese; když se změní, je třeba aktualizovat
 * mirror tady (pro CI buď přepneme na tsx).
 */

// ====================== Math helpers (1:1 z calculations.ts) ======================

function effectiveMonthlyRate(annualRate) {
  return Math.pow(1 + annualRate, 1 / 12) - 1;
}

function pvAnnuity(pmt, im, nMonths) {
  if (nMonths <= 0) return 0;
  if (im === 0) return pmt * nMonths;
  return (pmt * (1 - Math.pow(1 + im, -nMonths))) / im;
}

function efaSum(monthlyCashflow, years, annualReturn) {
  if (monthlyCashflow >= 0) return null;
  const r = effectiveMonthlyRate(annualReturn);
  return pvAnnuity(-monthlyCashflow, r, years * 12);
}

function disabilityIncome(efa, drop) {
  const active = efa.netIncomeActive + efa.rentActive + efa.otherActive;
  const passive = efa.rentPassive + efa.otherPassive;
  const remaining = drop === 0 ? active : active * (1 - drop);
  return remaining + passive;
}

function correctExpenses(expenses, correction) {
  return expenses * (1 + correction);
}

function buildVariant(income, expenses, years, annualReturn) {
  const cf = income - expenses;
  return {
    monthlyCashflow: cf,
    recommendedSum: efaSum(cf, years, annualReturn),
    yearsCovered: years,
  };
}

// ====== Smrt ======

function deathFamilyIncome(efa) {
  const state = efa.widowPension * efa.hasPartner + efa.orphanPension * efa.childrenCount;
  const family = efa.familyNetIncomeWithoutClient + efa.rentPassive + efa.otherPassive;
  return state + family;
}

function buildDeathRow(efa) {
  const income = deathFamilyIncome(efa);
  const totalExp = efa.expensesNecessary + efa.expensesDiscretionary;
  const expTotal = correctExpenses(totalExp, efa.expensesCorrectionDeath);
  const expNecessary = correctExpenses(efa.expensesNecessary, efa.expensesCorrectionDeath);

  const totalClientIncome =
    efa.netIncomeActive +
    efa.rentPassive +
    efa.otherPassive +
    efa.rentActive +
    efa.otherActive;
  const cfFamilyIncome = income - (totalClientIncome + efa.familyNetIncomeWithoutClient);

  return {
    forTotalExpenses: buildVariant(income, expTotal, efa.yearsDeath, efa.returnDeath),
    forNecessaryExpenses: buildVariant(income, expNecessary, efa.yearsDeath, efa.returnDeath),
    forFamilyIncome: {
      monthlyCashflow: cfFamilyIncome,
      recommendedSum: efaSum(cfFamilyIncome, efa.yearsDeath, efa.returnDeath),
      yearsCovered: efa.yearsDeath,
    },
  };
}

// ====== Invalidita ======

function buildDisabilityRow(efa, drop, statePension, expCorrection, years, annualReturn) {
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
    forNecessaryExpenses: buildVariant(householdIncome, expNecessary, years, annualReturn),
    forFamilyIncome: {
      monthlyCashflow: cfFamilyIncome,
      recommendedSum: efaSum(cfFamilyIncome, years, annualReturn),
      yearsCovered: years,
    },
  };
}

// ====================== Inputs (přesně dle Excelu) ======================

const efa = {
  age: 59,
  retirementAge: 67,
  employmentType: "employee",
  grossMonthlyIncome: 241998,
  netIncomeActive: 175970,
  rentActive: 0,
  otherActive: 0,
  rentPassive: 0,
  otherPassive: 0,
  disabilityIncomeDropI: 0.5,
  disabilityIncomeDropII: 0.7,
  disabilityIncomeDropIII: 1.0,
  statePensionDisabilityI: 19601,
  statePensionDisabilityII: 27071,
  statePensionDisabilityIII: 49483,
  stateSickPay: 42600,
  widowPension: 27071,
  orphanPension: 0,
  childrenCount: 1,
  hasPartner: 1,
  familyNetIncomeWithoutClient: 0,
  expensesNecessary: 50000,
  expensesDiscretionary: 25000,
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

// ====================== Run ======================

const death = buildDeathRow(efa);
const dI = buildDisabilityRow(efa, 0.5, 19601, 0.05, 12, 0.02);
const dII = buildDisabilityRow(efa, 0.7, 27071, -0.05, 12, 0.02);
const dIII = buildDisabilityRow(efa, 1.0, 49483, 0.25, 12, 0.02);

// ====================== Expected hodnoty z Excelu ======================

const expected = {
  // Krytí pro celkové výdaje (řádek 37 v Excelu)
  totalExp_smrt: 3736756.78122996,
  totalExp_invI: null, // "Není třeba zajistit"
  totalExp_invII: null,
  totalExp_invIII: 5668974.68846454,

  // Krytí pro nutné výdaje (řádek 49)
  necExp_smrt: 1335571.35170661,
  necExp_invI: null,
  necExp_invII: null,
  necExp_invIII: 1666998.97259229,

  // CF řádky (mezivýpočet) — z buildDeathRow / buildDisabilityRow.forFamilyIncome
  cf_familyIncome_smrt: -148899,
  cf_familyIncome_invI: -68384,
  cf_familyIncome_invII: -96108,
  cf_familyIncome_invIII: -126487,

  // CF pro celkové výdaje (řádek 36)
  cf_totalExp_smrt: -29179, // E36 = 27071 - 56250
  cf_totalExp_invI: 28836, // D36 = 107586 - 78750
  cf_totalExp_invII: 8612, // C36 = 79862 - 71250
  cf_totalExp_invIII: -44267, // B36 = 49483 - 93750

  // CF pro nutné výdaje (řádek 48)
  cf_necExp_smrt: -10429, // 27071 - 37500
  cf_necExp_invI: 55086, // 107586 - 52500
  cf_necExp_invII: 32362, // 79862 - 47500
  cf_necExp_invIII: -13017, // 49483 - 62500
};

// ====================== Compare ======================

function fmtKc(n) {
  if (n === null) return "Není třeba";
  return Math.round(n).toLocaleString("cs-CZ") + " Kč";
}

function compareRow(label, actual, expected, tolerance = 1.0) {
  let status;
  if (expected === null) {
    status = actual === null ? "✓" : "✗ (excel: Není třeba, kód: " + fmtKc(actual) + ")";
  } else if (actual === null) {
    status = "✗ (excel: " + fmtKc(expected) + ", kód: Není třeba)";
  } else {
    const delta = Math.abs(actual - expected);
    status = delta <= tolerance ? "✓" : `✗ Δ=${delta.toFixed(2)}`;
  }
  console.log(
    `  ${label.padEnd(40)} excel=${String(fmtKc(expected)).padStart(20)} | kód=${String(fmtKc(actual)).padStart(20)} | ${status}`,
  );
  return status === "✓";
}

console.log("\n=== PARITY: TS port calculations.ts vs. Excel ===\n");

let ok = 0, total = 0;

console.log("Krytí pro celkové výdaje:");
total++; if (compareRow("Smrt", death.forTotalExpenses.recommendedSum, expected.totalExp_smrt)) ok++;
total++; if (compareRow("Invalidita I.", dI.forTotalExpenses.recommendedSum, expected.totalExp_invI)) ok++;
total++; if (compareRow("Invalidita II.", dII.forTotalExpenses.recommendedSum, expected.totalExp_invII)) ok++;
total++; if (compareRow("Invalidita III.", dIII.forTotalExpenses.recommendedSum, expected.totalExp_invIII)) ok++;

console.log("\nKrytí pro nutné výdaje:");
total++; if (compareRow("Smrt", death.forNecessaryExpenses.recommendedSum, expected.necExp_smrt)) ok++;
total++; if (compareRow("Invalidita I.", dI.forNecessaryExpenses.recommendedSum, expected.necExp_invI)) ok++;
total++; if (compareRow("Invalidita II.", dII.forNecessaryExpenses.recommendedSum, expected.necExp_invII)) ok++;
total++; if (compareRow("Invalidita III.", dIII.forNecessaryExpenses.recommendedSum, expected.necExp_invIII)) ok++;

console.log("\nCF pro celkové výdaje (mezivýpočet):");
total++; if (compareRow("Smrt", death.forTotalExpenses.monthlyCashflow, expected.cf_totalExp_smrt)) ok++;
total++; if (compareRow("Invalidita I.", dI.forTotalExpenses.monthlyCashflow, expected.cf_totalExp_invI)) ok++;
total++; if (compareRow("Invalidita II.", dII.forTotalExpenses.monthlyCashflow, expected.cf_totalExp_invII)) ok++;
total++; if (compareRow("Invalidita III.", dIII.forTotalExpenses.monthlyCashflow, expected.cf_totalExp_invIII)) ok++;

console.log("\nCF pro nutné výdaje (mezivýpočet):");
total++; if (compareRow("Smrt", death.forNecessaryExpenses.monthlyCashflow, expected.cf_necExp_smrt)) ok++;
total++; if (compareRow("Invalidita I.", dI.forNecessaryExpenses.monthlyCashflow, expected.cf_necExp_invI)) ok++;
total++; if (compareRow("Invalidita II.", dII.forNecessaryExpenses.monthlyCashflow, expected.cf_necExp_invII)) ok++;
total++; if (compareRow("Invalidita III.", dIII.forNecessaryExpenses.monthlyCashflow, expected.cf_necExp_invIII)) ok++;

console.log("\nCF pro příjmy rodiny (krytí pro výpadek příjmu klienta):");
total++; if (compareRow("Smrt", death.forFamilyIncome.monthlyCashflow, expected.cf_familyIncome_smrt)) ok++;
total++; if (compareRow("Invalidita I.", dI.forFamilyIncome.monthlyCashflow, expected.cf_familyIncome_invI)) ok++;
total++; if (compareRow("Invalidita II.", dII.forFamilyIncome.monthlyCashflow, expected.cf_familyIncome_invII)) ok++;
total++; if (compareRow("Invalidita III.", dIII.forFamilyIncome.monthlyCashflow, expected.cf_familyIncome_invIII)) ok++;

console.log(`\n=== ${ok}/${total} testů PROŠLO ===`);

if (ok !== total) {
  console.log(`\n⚠ TS port se liší od Excelu na ${total - ok} hodnotách.`);
  process.exit(1);
} else {
  console.log("\n✓ TS port je 1:1 s Excelem na všech testovaných hodnotách.");
}
