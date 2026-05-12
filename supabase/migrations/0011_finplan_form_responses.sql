-- =============================================================================
-- 0011_finplan_form_responses.sql
-- Fallback cesta: customer vyplní výdaje ručně přes wizard formulář
-- (alternativa k nahrání bankovních výpisů).
--
-- Tok:
--   1. Customer otevře /plan/<token>, klikne "Nechci posílat výpisy".
--   2. UI mu pokládá kategorie postupně (onboarding wizard).
--   3. Po každém kroku se progress ukládá do finplan_form_responses.data.
--   4. Po finálním odeslání se pipeline větví: místo AI extrakce z výpisů
--      použije adaptér form → BankAggregate a postaví stejný plán.
-- =============================================================================

-- ====== ENUM: rozšířit doc_kind o 'form_response' (volitelné, používáme separátní tabulku) ======
-- Necháme bez změny enumu — form responses žijí v separátní tabulce, ne v uploads.

-- ====== TABLE: finplan_form_responses ======

create table if not exists public.finplan_form_responses (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null unique references public.finplan_sessions(id) on delete cascade,

  -- Celý form state v JSONB — flexibilní, validace v TS přes Zod
  -- Shape: viz src/lib/finplan/form-types.ts → FormResponseData
  data            jsonb not null default '{}'::jsonb,

  -- Progress tracking
  current_step    integer not null default 0,
  total_steps     integer not null default 11,

  -- Submission marker (null dokud customer nestiskne "Odeslat")
  submitted_at    timestamptz,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists finplan_form_responses_session_idx
  on public.finplan_form_responses (session_id);

create index if not exists finplan_form_responses_submitted_idx
  on public.finplan_form_responses (submitted_at)
  where submitted_at is not null;

drop trigger if exists finplan_form_responses_set_updated_at
  on public.finplan_form_responses;
create trigger finplan_form_responses_set_updated_at
  before update on public.finplan_form_responses
  for each row execute function public.set_updated_at();

-- ====== RLS ======
-- Customer-facing zápis i čtení jede přes service_role (server actions).
-- Poradce nesmí číst raw form data (privacy) — vidí jen finplan_analyses agregát.

alter table public.finplan_form_responses enable row level security;
alter table public.finplan_form_responses force row level security;

-- Žádné policies → default deny pro authenticated.
-- service_role bypassuje RLS, takže server actions fungují.
