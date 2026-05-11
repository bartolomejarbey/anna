-- ====================================================================
-- 0009_finplan_debug.sql
--
-- Debug visibility do extrakce: ukládáme raw GPT-4o response, vstupní
-- text výpisu (excerpt) a oba prompty (system + user). Bez toho poradce
-- ani my nevidíme, proč extrakce vyplivla málo dat — debugging je
-- naslepo.
--
-- Privacy:
--   * `input_excerpt` může obsahovat útržky transakcí (jména protistran).
--     Drží se proto pod stejnou RLS policy jako finplan_extracted, tedy
--     poradce → deny, super_admin + service role → allow.
--   * Poradce v UI vidí tato data jen v advisor demo verzi přes
--     service-role (server action), nikdy ne přes klientskou RLS.
-- ====================================================================

alter table public.finplan_extracted
  add column if not exists raw_response  jsonb,
  add column if not exists input_excerpt text,
  add column if not exists system_prompt text,
  add column if not exists user_prompt   text;

comment on column public.finplan_extracted.raw_response is
  'Raw JSON odpověď z GPT-4o (parsed, před Zod validací). Pro debug a fine-tuning.';
comment on column public.finplan_extracted.input_excerpt is
  'První ~8000 znaků textu poslaného do GPT-4o (PDF text nebo image popis).';
comment on column public.finplan_extracted.system_prompt is
  'System prompt použitý pro tuto extrakci. Verzování přes textovou shodu.';
comment on column public.finplan_extracted.user_prompt is
  'User message poslaný do GPT-4o (název souboru + text výpisu).';
