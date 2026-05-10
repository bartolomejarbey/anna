import { z } from "zod";

/**
 * Customer extraction schema — load-bearing.
 *
 * This schema is the contract between:
 *   1. extractFromTranscript() — what GPT-4o is constrained to produce.
 *   2. calculate()             — what the (placeholder) calculator reads from.
 *   3. PDF renderer            — what the offer template prints.
 *
 * All monetary amounts are CZK. All ages are full years. nullable() means
 * 'advisor never asked / customer never said' — never guess in extraction.
 *
 * Notes on JSON Schema generation:
 *   - We use Zod 4's native `z.toJSONSchema()` (NOT the `zod-to-json-schema`
 *     package, which is pinned to `zod/v3` types and rejects Zod 4 instances
 *     at compile time).
 *   - Default `z.toJSONSchema()` output is OpenAI Structured Outputs
 *     `strict: true` compatible: every key is in `required`, every object has
 *     `additionalProperties: false`, and `nullable()` is encoded as
 *     `anyOf: [{type: T}, {type: 'null'}]` (the supported nullable pattern).
 *   - We strip the top-level `$schema` declaration since OpenAI is conservative
 *     about extra root keywords.
 */

// ---------------------------------------------------------------------------
// Customer block — demographics. All nullable; advisor may not have asked.
// ---------------------------------------------------------------------------

const customerBlockSchema = z.object({
  full_name: z
    .string()
    .nullable()
    .describe(
      "Celé jméno zákazníka, jak ho poradce vyslovuje. null pokud nezmíněno.",
    ),
  age: z
    .number()
    .int()
    .min(0)
    .max(120)
    .nullable()
    .describe("Věk v celých letech. null pokud nezmíněn."),
  marital_status: z
    .enum(["single", "married", "divorced", "widowed"])
    .nullable()
    .describe(
      "Rodinný stav. NIKDY nedovozuj — pokud zákazník mluví jen o dětech nebo partnerovi bez explicitního stavu, vrať null.",
    ),
  has_children: z
    .boolean()
    .nullable()
    .describe(
      "true jen pokud je explicitně zmíněno, že děti jsou. false jen pokud explicitně řekne, že nemá děti. null pokud téma nezaznělo.",
    ),
  children_count: z
    .number()
    .int()
    .min(0)
    .max(20)
    .nullable()
    .describe("Počet dětí, pokud byl uveden konkrétní počet. null jinak."),
  occupation: z
    .string()
    .nullable()
    .describe(
      "Povolání nebo obor (např. 'IT specialista', 'učitelka ZŠ', 'OSVČ grafička'). Krátká fráze, ne věta. null pokud nezmíněno.",
    ),
});

// ---------------------------------------------------------------------------
// Finances block — peněženka. CZK, integer (haléře nás nezajímají).
// ---------------------------------------------------------------------------

const financesBlockSchema = z.object({
  monthly_income_czk: z
    .number()
    .int()
    .min(0)
    .nullable()
    .describe(
      "Čistý měsíční příjem zákazníka v Kč (po zdanění). Pokud zákazník uvádí jen příjem domácnosti, použij to číslo; pokud uvádí svůj i partnerův zvlášť, sem patří jeho. null pokud nezmíněno.",
    ),
  monthly_expenses_czk: z
    .number()
    .int()
    .min(0)
    .nullable()
    .describe(
      "Měsíční výdaje domácnosti v Kč, pokud byly explicitně uvedeny. null jinak.",
    ),
  existing_savings_czk: z
    .number()
    .int()
    .min(0)
    .nullable()
    .describe(
      "Stávající úspory / likvidní rezerva v Kč (na účtu, stavební spoření, jednorázové). Investiční portfolio sem nepatří. null pokud nezmíněno.",
    ),
  has_mortgage: z
    .boolean()
    .nullable()
    .describe(
      "true / false jen pokud bylo téma hypotéky výslovně zmíněno. null jinak.",
    ),
  monthly_mortgage_czk: z
    .number()
    .int()
    .min(0)
    .nullable()
    .describe("Měsíční splátka hypotéky v Kč, pokud byla uvedena. null jinak."),
});

// ---------------------------------------------------------------------------
// Goals block — co chce zákazník řešit.
// ---------------------------------------------------------------------------

const goalsBlockSchema = z.object({
  primary_goal: z
    .string()
    .nullable()
    .describe(
      "Hlavní finanční cíl, parafráze poradce vlastními slovy (ne doslovný citát). Krátká věta, např. 'Spoření na byt v Praze, horizont 5 let'. null pokud cíl nezazněl.",
    ),
  target_horizon_years: z
    .number()
    .int()
    .min(0)
    .max(60)
    .nullable()
    .describe(
      "Investiční / cílový horizont v letech, pokud zazněl konkrétně. null jinak.",
    ),
  risk_appetite: z
    .enum(["low", "medium", "high"])
    .nullable()
    .describe(
      "Rizikový profil. low = konzervativní (jistota, dluhopisy). medium = vyvážený (mix). high = dynamický (akcie, ETF). Odhadni jen z explicitních signálů; pokud zákazník nikam neukáže, vrať null.",
    ),
});

// ---------------------------------------------------------------------------
// Meeting facts block — fakta která zákazník/poradce skutečně řekli a která
// kalkulátor zajištění (EFA) potřebuje. Policy-level konstanty (korekce, roky,
// výnosy) doplňuje adapter z `EFA_DEFAULTS` — sem patří jen co zaznělo.
//
// `employment_type` se musí zarovnat s `EmploymentType` v
// `src/lib/calculator/types.ts` ("employee" | "selfemployed").
// ---------------------------------------------------------------------------

const meetingFactsBlockSchema = z.object({
  employment_type: z
    .enum(["employee", "selfemployed"])
    .nullable()
    .describe(
      "Typ příjmu klienta. 'employee' = zaměstnanec (mzda, HPP, DPP). 'selfemployed' = OSVČ / podnikatel. null pokud nezaznělo.",
    ),
  gross_monthly_income_czk: z
    .number()
    .int()
    .min(0)
    .nullable()
    .describe(
      "Hrubý měsíční příjem klienta v Kč (před zdaněním / před odečtením odvodů). null pokud zákazník zmínil jen čistý příjem nebo nezmínil vůbec.",
    ),
  has_partner: z
    .boolean()
    .describe(
      "true pokud zákazník žije s partnerem/manželem (sdílená domácnost), false jinak. Vždy bool, nikdy null — pokud chybí signál, vrať false.",
    ),
  partner_employment_type: z
    .enum(["employee", "selfemployed"])
    .nullable()
    .describe(
      "Typ příjmu partnera. null pokud has_partner=false nebo partner nepracuje (např. mateřská) nebo nezaznělo.",
    ),
  partner_gross_monthly_income_czk: z
    .number()
    .int()
    .min(0)
    .nullable()
    .describe(
      "Hrubý měsíční příjem partnera v Kč. null pokud has_partner=false, partner nepracuje, nebo nezaznělo.",
    ),
  current_savings_czk: z
    .number()
    .int()
    .min(0)
    .nullable()
    .describe(
      "Aktuální úspory na důchod / dlouhodobé spoření v Kč (penzijko, DIP, investiční portfolio). Likvidní rezerva NA ÚČTU patří do finances.existing_savings_czk, ne sem. null pokud nezaznělo.",
    ),
  rent_passive_czk: z
    .number()
    .int()
    .min(0)
    .nullable()
    .describe(
      "Měsíční pasivní příjem z pronájmu nemovitostí v Kč (nájem, ne aktivní podnikání). null pokud klient nemá pronájem nebo nezaznělo.",
    ),
  monthly_mortgage_czk: z
    .number()
    .int()
    .min(0)
    .nullable()
    .describe(
      "Měsíční splátka hypotéky v Kč. Duplikuje finances.monthly_mortgage_czk pro adapter — vyplň stejnou hodnotu pokud zaznělo, jinak null.",
    ),
  desired_retirement_age: z
    .number()
    .int()
    .min(50)
    .max(80)
    .nullable()
    .describe(
      "Věk, ve kterém chce klient odejít do důchodu (např. 'chci skončit v šedesáti'). null pokud nezaznělo.",
    ),
  desired_retirement_monthly_czk: z
    .number()
    .int()
    .min(0)
    .nullable()
    .describe(
      "Cílová měsíční renta v důchodu v Kč (např. 'chtěl bych mít čtyřicet tisíc'). null pokud nezaznělo.",
    ),
});

// ---------------------------------------------------------------------------
// Top-level extraction schema.
// ---------------------------------------------------------------------------

export const customerExtractionSchema = z.object({
  customer: customerBlockSchema,
  finances: financesBlockSchema,
  goals: goalsBlockSchema,
  meeting_facts: meetingFactsBlockSchema,
  notes: z
    .string()
    .describe(
      "Stručná česká poznámka (1–2 věty) pro poradce shrnující kontext, který nezapadl do struktury výše: život, ad-hoc požadavky, nálada zákazníka. Vždy alespoň prázdný řetězec, nikdy null.",
    ),
});

export type CustomerExtraction = z.infer<typeof customerExtractionSchema>;

// ---------------------------------------------------------------------------
// JSON Schema for OpenAI Structured Outputs (strict: true).
// ---------------------------------------------------------------------------

/**
 * JSON Schema derived from `customerExtractionSchema`. Compatible with
 * OpenAI Chat Completions
 * `response_format: { type: 'json_schema', json_schema: { strict: true, ... } }`.
 *
 * Why we don't use `zod-to-json-schema`: that package's `zodToJsonSchema()`
 * accepts only `ZodSchema<any>` from `zod/v3`. Zod 4 schemas are not
 * structurally assignable, so it errors at compile time. Zod 4 ships its own
 * generator (`z.toJSONSchema`) that already produces strict-compatible output.
 */
function buildJsonSchema(): Record<string, unknown> {
  const raw = z.toJSONSchema(customerExtractionSchema, {
    target: "draft-2020-12",
  }) as Record<string, unknown>;
  // OpenAI is conservative about unknown root keywords; drop $schema.
  const { $schema: _drop, ...rest } = raw;
  void _drop;
  return rest;
}

export const customerExtractionJsonSchema: Record<string, unknown> =
  buildJsonSchema();
