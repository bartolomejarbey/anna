/**
 * Typy a definice pro fallback wizard formulář
 * (cesta bez bankovních výpisů — customer vyplní ručně).
 *
 * Field definice tady odpovídají 4FIN "Servisní list — VÝDAJE" formuláři.
 * Mapování na PlanData expense kategorie viz form-to-aggregate.ts.
 */

import { z } from "zod";

// ────────────────────────────────────────────────────────────────────────────
// Field value
// ────────────────────────────────────────────────────────────────────────────

export const formFieldValueSchema = z.object({
  amount: z.number().nullable(), // null = customer kliknul "Nevím" / neví částku
  necessary: z.boolean(), // "Jedná se o nezbytný výdaj?"
});

export type FormFieldValue = z.infer<typeof formFieldValueSchema>;

export const emptyFieldValue: FormFieldValue = {
  amount: null,
  necessary: false,
};

// ────────────────────────────────────────────────────────────────────────────
// Category container
// ────────────────────────────────────────────────────────────────────────────

export const formCategorySchema = z.object({
  fields: z.record(z.string(), formFieldValueSchema),
  skipped: z.boolean(), // "Tato kategorie pro mě neplatí"
});

export type FormCategory = z.infer<typeof formCategorySchema>;

// ────────────────────────────────────────────────────────────────────────────
// Debt
// ────────────────────────────────────────────────────────────────────────────

export const formDebtSchema = z.object({
  id: z.string(),
  name: z.string(), // např. "Hypotéka", "Úvěr na auto", "Spotřebitelský úvěr"
  monthlyPayment: z.number().nonnegative(),
  currentBalance: z.number().nonnegative(),
  necessary: z.boolean(), // hypotéka/výživné = nezbytné, leasing může být zbytné
});

export type FormDebt = z.infer<typeof formDebtSchema>;

// ────────────────────────────────────────────────────────────────────────────
// Income
// ────────────────────────────────────────────────────────────────────────────

export const formIncomeSchema = z.object({
  netMonthly: z.number().nullable(), // čistá měsíční mzda (employee) nebo čistý zisk (OSVČ)
  rental: z.number().nonnegative().default(0),
  otherPassive: z.number().nonnegative().default(0),
});

export type FormIncome = z.infer<typeof formIncomeSchema>;

// ────────────────────────────────────────────────────────────────────────────
// Top-level response data
// ────────────────────────────────────────────────────────────────────────────

export const expenseCategoryKeys = [
  "bydleni",
  "domacnost",
  "auto",
  "zdravi",
  "zivotniStyl",
  "deti",
  "investice",
  "pojisteni",
  "nefinancniInvestice",
] as const;

export type ExpenseCategoryKey = (typeof expenseCategoryKeys)[number];

export const formResponseDataSchema = z.object({
  income: formIncomeSchema,
  expenses: z.object({
    bydleni: formCategorySchema,
    domacnost: formCategorySchema,
    auto: formCategorySchema,
    zdravi: formCategorySchema,
    zivotniStyl: formCategorySchema,
    deti: formCategorySchema,
    investice: formCategorySchema,
    pojisteni: formCategorySchema,
    nefinancniInvestice: formCategorySchema,
  }),
  debts: z.array(formDebtSchema),
  hasChildren: z.boolean(),
});

export type FormResponseData = z.infer<typeof formResponseDataSchema>;

// ────────────────────────────────────────────────────────────────────────────
// Field definitions — co se zobrazí v UI, defaultní necessary, mapování
// ────────────────────────────────────────────────────────────────────────────

/**
 * Mapování na PlanData ExpenseBreakdownData kategorie:
 *   housing | food | transport | insurance | healthcare |
 *   savings | dining | subscriptions | discretionary | other
 */
export type PlanExpenseBucket =
  | "housing"
  | "food"
  | "transport"
  | "insurance"
  | "healthcare"
  | "savings"
  | "dining"
  | "subscriptions"
  | "discretionary"
  | "other";

export interface FieldDef {
  key: string;
  label: string;
  hint?: string;
  defaultNecessary: boolean; // nezbytný defaultně? (housing/food = ano, lifestyle = ne)
  planBucket: PlanExpenseBucket;
}

export interface CategoryDef {
  key: ExpenseCategoryKey;
  label: string;
  description?: string;
  fields: FieldDef[];
  conditional?: "hasChildren"; // step se zobrazí jen pokud hasChildren=true
}

export const CATEGORIES: CategoryDef[] = [
  {
    key: "bydleni",
    label: "Bydlení",
    description: "Náklady na střechu nad hlavou.",
    fields: [
      { key: "najem", label: "Nájem", defaultNecessary: true, planBucket: "housing" },
      { key: "energie", label: "Energie", hint: "elektřina, plyn, voda", defaultNecessary: true, planBucket: "housing" },
      { key: "sluzby", label: "Služby", hint: "fond oprav, odpady, výtah", defaultNecessary: true, planBucket: "housing" },
      { key: "drobneOpravy", label: "Drobné opravy", defaultNecessary: true, planBucket: "housing" },
      { key: "fondOprav", label: "Fond oprav", defaultNecessary: true, planBucket: "housing" },
      { key: "ostatniBydleni", label: "Ostatní náklady spojené s bydlením", defaultNecessary: false, planBucket: "housing" },
    ],
  },
  {
    key: "domacnost",
    label: "Domácnost",
    description: "Co spotřebuješ doma každý měsíc.",
    fields: [
      { key: "provoznNaklady", label: "Provozní náklady", hint: "drogerie, čisticí prostředky", defaultNecessary: true, planBucket: "other" },
      { key: "jidlo", label: "Jídlo", hint: "potraviny, nákupy do domácnosti", defaultNecessary: true, planBucket: "food" },
      { key: "osaceniObuv", label: "Ošacení a obuv", defaultNecessary: false, planBucket: "discretionary" },
      { key: "osobniPece", label: "Osobní péče", hint: "kosmetika, kadeřník", defaultNecessary: false, planBucket: "discretionary" },
      { key: "verejnaDoprava", label: "Veřejná doprava", hint: "MHD, vlaky", defaultNecessary: true, planBucket: "transport" },
      { key: "telefon", label: "Poplatky za telefon", defaultNecessary: true, planBucket: "subscriptions" },
      { key: "media", label: "Média", hint: "Netflix, Spotify, internet, TV", defaultNecessary: false, planBucket: "subscriptions" },
      { key: "domaciZvirata", label: "Domácí zvířata", hint: "krmení, veterina", defaultNecessary: false, planBucket: "other" },
      { key: "ostatniDomacnost", label: "Ostatní náklady spojené s domácností", defaultNecessary: false, planBucket: "other" },
    ],
  },
  {
    key: "auto",
    label: "Auto, motocykl a podobně",
    description: "Pokud máš auto nebo jiné motorové vozidlo.",
    fields: [
      { key: "pohonneHmoty", label: "Pohonné hmoty", hint: "benzín, nafta, elektrika", defaultNecessary: true, planBucket: "transport" },
      { key: "servisUdrzba", label: "Servis, údržba, opravy, náhradní díly", defaultNecessary: false, planBucket: "transport" },
      { key: "ostatniAuto", label: "Ostatní náklady spojené s vozidlem", defaultNecessary: false, planBucket: "transport" },
    ],
  },
  {
    key: "zdravi",
    label: "Zdravotní péče",
    description: "Léky, lékaři, vitamíny.",
    fields: [
      { key: "leky", label: "Léky", defaultNecessary: true, planBucket: "healthcare" },
      { key: "zdravaVyziva", label: "Zdravá výživa", hint: "doplňky stravy, bio", defaultNecessary: false, planBucket: "healthcare" },
      { key: "terapeut", label: "Zdravotní péče", hint: "terapeut, fyzioterapeut, masáže", defaultNecessary: false, planBucket: "healthcare" },
      { key: "zdravotniPomucky", label: "Zdravotní pomůcky", hint: "brýle, ortopedie", defaultNecessary: false, planBucket: "healthcare" },
      { key: "ostatniZdravi", label: "Ostatní náklady spojené se zdravotní péčí", defaultNecessary: false, planBucket: "healthcare" },
    ],
  },
  {
    key: "zivotniStyl",
    label: "Životní styl",
    description: "Volný čas, koníčky, dovolená.",
    fields: [
      { key: "zajmy", label: "Zájmy a koníčky", defaultNecessary: false, planBucket: "discretionary" },
      { key: "kultura", label: "Kultura", hint: "kino, divadlo, koncerty, knihy", defaultNecessary: false, planBucket: "discretionary" },
      { key: "dovolena", label: "Dovolená a výlety", defaultNecessary: false, planBucket: "discretionary" },
      { key: "spolecenske", label: "Rodinné a společenské události", hint: "narozeniny, dárky, svatby", defaultNecessary: false, planBucket: "discretionary" },
      { key: "ostatniZivot", label: "Ostatní náklady spojené se životním stylem", defaultNecessary: false, planBucket: "discretionary" },
    ],
  },
  {
    key: "deti",
    label: "Děti",
    description: "Náklady spojené s dětmi.",
    conditional: "hasChildren",
    fields: [
      { key: "skola", label: "Škola", hint: "školné, obědy, kroužky", defaultNecessary: true, planBucket: "other" },
      { key: "zajmy", label: "Zájmy", hint: "kroužky, sport", defaultNecessary: false, planBucket: "other" },
      { key: "kapesne", label: "Kapesné", defaultNecessary: false, planBucket: "other" },
      { key: "ostatniDeti", label: "Ostatní náklady spojené s potřebami dětí", defaultNecessary: true, planBucket: "other" },
    ],
  },
  {
    key: "investice",
    label: "Investiční a spořicí produkty",
    description: "Kolik měsíčně odkládáš nebo investuješ.",
    fields: [
      { key: "bankovniDepozita", label: "Bankovní depozita", hint: "spořicí účet, termíňák", defaultNecessary: false, planBucket: "savings" },
      { key: "stavebniSporeni", label: "Stavební spoření", defaultNecessary: false, planBucket: "savings" },
      { key: "penzijniPripojisteni", label: "Penzijní připojištění / DPS", defaultNecessary: false, planBucket: "savings" },
      { key: "rezervotvornePojisteni", label: "Rezervotvorné pojištění", hint: "flexibilní, investiční", defaultNecessary: false, planBucket: "savings" },
      { key: "investicniNastroje", label: "Investiční nástroje", hint: "akcie, podílové fondy, ETF", defaultNecessary: false, planBucket: "savings" },
    ],
  },
  {
    key: "pojisteni",
    label: "Pojistné produkty",
    description: "Pojištění, která platíš.",
    fields: [
      { key: "zivotni", label: "Životní a úrazové pojištění", defaultNecessary: true, planBucket: "insurance" },
      { key: "nemovitosti", label: "Pojištění nemovitostí", defaultNecessary: true, planBucket: "insurance" },
      { key: "domacnosti", label: "Pojištění domácnosti a odpovědnosti", defaultNecessary: true, planBucket: "insurance" },
      { key: "povinneRuceni", label: "Povinné ručení", defaultNecessary: true, planBucket: "insurance" },
      { key: "havarijni", label: "Havarijní pojištění", defaultNecessary: false, planBucket: "insurance" },
      { key: "ostatniPojisteni", label: "Ostatní pojištění", defaultNecessary: false, planBucket: "insurance" },
    ],
  },
  {
    key: "nefinancniInvestice",
    label: "Nefinanční a ostatní investice",
    description: "Investice mimo finanční produkty.",
    fields: [
      { key: "nemovitostiInvest", label: "Investice do nemovitostí", hint: "hypotéka na investiční byt, úroky", defaultNecessary: false, planBucket: "other" },
      { key: "jine", label: "Jiné", hint: "umění, kryptoměny, sběratelství", defaultNecessary: false, planBucket: "other" },
    ],
  },
];

// ────────────────────────────────────────────────────────────────────────────
// Empty default (nový form)
// ────────────────────────────────────────────────────────────────────────────

function emptyCategory(def: CategoryDef): FormCategory {
  const fields: Record<string, FormFieldValue> = {};
  for (const f of def.fields) {
    fields[f.key] = { amount: null, necessary: f.defaultNecessary };
  }
  return { fields, skipped: false };
}

export function createEmptyFormResponse(): FormResponseData {
  const expenses = {} as FormResponseData["expenses"];
  for (const cat of CATEGORIES) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (expenses as any)[cat.key] = emptyCategory(cat);
  }
  return {
    income: { netMonthly: null, rental: 0, otherPassive: 0 },
    expenses,
    debts: [],
    hasChildren: false,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Step ordering — pro wizard (intro=0, income=1, ...10 categories, debts=11, summary=12)
// ────────────────────────────────────────────────────────────────────────────

export const STEP_INTRO = 0;
export const STEP_INCOME = 1;
export const STEP_CATEGORY_OFFSET = 2; // bydleni začíná na 2
export const STEP_DEBTS_FROM_CATEGORIES = CATEGORIES.length + STEP_CATEGORY_OFFSET;
export const STEP_SUMMARY = STEP_DEBTS_FROM_CATEGORIES + 1;
export const TOTAL_STEPS = STEP_SUMMARY + 1;

/**
 * Vrátí kategorii pro daný step, nebo null pokud step není kategorie-step.
 * Filtrování přes hasChildren řeší shouldSkipStep().
 */
export function categoryForStep(step: number): CategoryDef | null {
  if (step < STEP_CATEGORY_OFFSET) return null;
  if (step >= STEP_DEBTS_FROM_CATEGORIES) return null;
  const idx = step - STEP_CATEGORY_OFFSET;
  return CATEGORIES[idx] ?? null;
}

/**
 * Zjistí, jestli má být step skipnutý kvůli podmínce (např. Děti).
 */
export function shouldSkipStep(step: number, data: FormResponseData): boolean {
  const cat = categoryForStep(step);
  if (!cat) return false;
  if (cat.conditional === "hasChildren" && !data.hasChildren) return true;
  return false;
}
