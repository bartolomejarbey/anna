-- =============================================================================
-- 0010_finplan_privacy_breakdown.sql
--
-- 1) Zákazníkův výběr na landing page: co uvidí jeho poradce?
--    * full           — poradce vidí breakdown po kategoriích (bydlení 22k,
--                       potraviny 7k, spoření 17k, …) — bez konkrétních
--                       protistran (ty se nikdy neukládají)
--    * categorized    — DEFAULT — poradce vidí jen nutné vs. zbytné
--                       (53k / 42k) bez jednotlivých kategorií
--    * aggregate_only — poradce vidí jen celkový příjem a výdaj
--
-- 2) Bohatší extrakce z výpisu: AI vrací kategorizaci pro EFA výpočet
--    (nutné výdaje jsou základ pro krytí pojištění), ukládáme do JSONB
--    sloupců na finplan_extracted. Privacy policy beze změny — poradce
--    pořád nečte přímo finplan_extracted (RLS deny), data se k němu
--    dostávají jen přes finplan_analyses.plan_data podle privacy_mode.
-- =============================================================================

-- ====== ENUM: privacy_mode ======

do $$ begin
  create type public.finplan_privacy_mode as enum (
    'full',
    'categorized',
    'aggregate_only'
  );
exception when duplicate_object then null; end $$;

-- ====== Sloupec na finplan_sessions ======

alter table public.finplan_sessions
  add column if not exists privacy_mode public.finplan_privacy_mode
    not null default 'categorized';

comment on column public.finplan_sessions.privacy_mode is
  'Zákazníkův výběr: co uvidí poradce. full = kategorie, categorized = nutné/zbytné, aggregate_only = jen totály.';

-- ====== Bohatší breakdown na finplan_extracted ======

alter table public.finplan_extracted
  -- Income kategorie: {salary, self_employed, rental, passive, other}
  add column if not exists income_breakdown jsonb,
  -- Expense kategorie: {housing, food, transport, insurance, healthcare,
  --                     savings, dining, subscriptions, discretionary, other}
  add column if not exists expense_breakdown jsonb,
  -- Necessary/Discretionary souhrn (pre-vypočtený AI, pro EFA základ)
  add column if not exists necessary_total numeric(12,2),
  add column if not exists discretionary_total numeric(12,2),
  -- Detected base salary — pravidelný měsíční příchozí, bez bonusů.
  -- Klíčové: nahrazuje magic number `income / 0.72` v build-plan.
  add column if not exists detected_salary numeric(12,2),
  -- Detekovaný typ zaměstnání (může se lišit od customer-supplied)
  add column if not exists detected_employment_type text;

comment on column public.finplan_extracted.income_breakdown is
  'JSON: {salary, self_employed, rental, passive, other} v Kč za období výpisu.';
comment on column public.finplan_extracted.expense_breakdown is
  'JSON: {housing, food, transport, insurance, healthcare, savings, dining, subscriptions, discretionary, other} v Kč za období.';
comment on column public.finplan_extracted.necessary_total is
  'Suma nutných výdajů (bydlení+jídlo+doprava+pojištění+zdraví+spoření). Vstup do EFA.';
comment on column public.finplan_extracted.discretionary_total is
  'Suma zbytných výdajů (restaurace+předplatné+discretionary). Pro CF analýzu.';
comment on column public.finplan_extracted.detected_salary is
  'Detekovaná pravidelná hrubá/čistá mzda — nahrazuje aproximaci income/0.72 v build-plan.';
comment on column public.finplan_extracted.detected_employment_type is
  'AI-detekovaný typ příjmu (employee/selfemployed/mixed/unknown). Pro cross-check.';

-- Žádné nové RLS policies — existující "finplan_extracted_super_admin_all"
-- pokrývá všechny sloupce (RLS působí na řádek, ne sloupec).
