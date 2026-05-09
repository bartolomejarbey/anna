-- =============================================================================
-- Anna — initial schema (Phase 1)
-- Multi-tenant SaaS pro finanční poradce.
--
-- Conventions:
--   * Tables: snake_case, plural English.
--   * Every domain table has tenant_id (and where applicable advisor_id) for RLS.
--   * Every table has created_at + updated_at; updated_at maintained by trigger.
--   * Enums use CREATE TYPE (not text + check) for type safety in generated TS.
--     CREATE TYPE is not idempotent — wrapped in DO blocks so migration is
--     safe to re-run after a partial failure.
--   * gen_random_uuid() requires pgcrypto.
-- =============================================================================

-- ---------- Extensions ----------
create extension if not exists "pgcrypto";        -- gen_random_uuid(), crypt(), gen_salt()
create extension if not exists "pg_trgm";         -- (future) fuzzy customer search

-- ---------- Shared trigger fn: updated_at ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =============================================================================
-- ENUMS
-- =============================================================================

do $$ begin
  create type public.advisor_role as enum ('advisor', 'tenant_admin', 'super_admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.marital_status as enum ('single', 'married', 'divorced', 'widowed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.meeting_status as enum (
    'idle',
    'recording',
    'uploaded',
    'transcribing',
    'reconciling',
    'extracting',
    'extracted',
    'generating',
    'ready',
    'failed'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.capture_method as enum ('browser_live', 'file_upload');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.offer_status as enum ('draft', 'sent', 'signed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.assistant_role as enum ('user', 'assistant');
exception when duplicate_object then null; end $$;

-- =============================================================================
-- 1. tenants — poradenské sítě (4FIN HOLDING, OVB, Partners, ...)
-- =============================================================================

create table if not exists public.tenants (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  branding    jsonb not null default '{}'::jsonb, -- { logo_url, primary_color }
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists tenants_slug_idx       on public.tenants (slug);
create index if not exists tenants_created_at_idx on public.tenants (created_at desc);

drop trigger if exists tenants_set_updated_at on public.tenants;
create trigger tenants_set_updated_at
  before update on public.tenants
  for each row execute function public.set_updated_at();

-- =============================================================================
-- 2. advisors — KLIENTI platformy = finanční poradci
--    (pozn. terminologie: "advisor" v DB ≡ "klient" v UI)
--    Spec: advisor_id ≠ auth.users.id; auth_user_id is a separate FK so we can
--    create an advisor row before the auth user accepts an invite.
-- =============================================================================

create table if not exists public.advisors (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references public.tenants(id) on delete cascade,
  auth_user_id        uuid unique references auth.users(id) on delete set null,
  email               text not null unique,
  full_name           text not null,
  avatar_url          text,
  role                public.advisor_role not null default 'advisor',
  branding            jsonb not null default '{}'::jsonb, -- per-advisor override of tenant.branding
  demo_login_enabled  boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists advisors_tenant_idx       on public.advisors (tenant_id);
create index if not exists advisors_auth_user_idx    on public.advisors (auth_user_id);
create index if not exists advisors_role_idx         on public.advisors (role);
create index if not exists advisors_email_idx        on public.advisors (email);
create index if not exists advisors_created_at_idx   on public.advisors (created_at desc);

drop trigger if exists advisors_set_updated_at on public.advisors;
create trigger advisors_set_updated_at
  before update on public.advisors
  for each row execute function public.set_updated_at();

-- =============================================================================
-- 3. customers — ZÁKAZNÍCI poradců (koncoví spotřebitelé)
-- =============================================================================

create table if not exists public.customers (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references public.tenants(id) on delete cascade,
  advisor_id          uuid not null references public.advisors(id) on delete cascade,
  full_name           text not null,
  email               text,
  phone               text,
  birth_date          date,
  monthly_income_czk  integer,
  marital_status      public.marital_status,
  has_children        boolean,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists customers_tenant_idx     on public.customers (tenant_id);
create index if not exists customers_advisor_idx    on public.customers (advisor_id);
create index if not exists customers_created_at_idx on public.customers (created_at desc);
create index if not exists customers_full_name_trgm_idx
  on public.customers using gin (full_name gin_trgm_ops);

drop trigger if exists customers_set_updated_at on public.customers;
create trigger customers_set_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

-- =============================================================================
-- 4. meetings — schůzky (s naslouchačem)
-- =============================================================================

create table if not exists public.meetings (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references public.tenants(id) on delete cascade,
  advisor_id          uuid not null references public.advisors(id) on delete cascade,
  customer_id         uuid not null references public.customers(id) on delete cascade,
  status              public.meeting_status not null default 'idle',
  audio_url           text,
  audio_duration_sec  integer,
  capture_method      public.capture_method,
  scheduled_at        timestamptz,
  recorded_at         timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists meetings_tenant_idx          on public.meetings (tenant_id);
create index if not exists meetings_advisor_idx         on public.meetings (advisor_id);
create index if not exists meetings_customer_idx        on public.meetings (customer_id);
create index if not exists meetings_status_idx          on public.meetings (status);
create index if not exists meetings_advisor_status_idx  on public.meetings (advisor_id, status);
create index if not exists meetings_created_at_idx      on public.meetings (created_at desc);

drop trigger if exists meetings_set_updated_at on public.meetings;
create trigger meetings_set_updated_at
  before update on public.meetings
  for each row execute function public.set_updated_at();

-- =============================================================================
-- 5. transcripts — výstupy transkripce
--    3 text columns:
--      live_text     — Web Speech API live captions
--      whisper_text  — Whisper-1 ground truth
--      text          — final reconciled output, used for extraction
-- =============================================================================

create table if not exists public.transcripts (
  id                      uuid primary key default gen_random_uuid(),
  meeting_id              uuid not null unique references public.meetings(id) on delete cascade,
  live_text               text,
  whisper_text            text,
  text                    text,
  language                text not null default 'cs',
  whisper_model           text,
  whisper_tokens          integer,
  whisper_latency_ms      integer,
  reconcile_model         text,
  reconcile_tokens        integer,
  reconcile_latency_ms    integer,
  prompt_version          text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists transcripts_meeting_idx     on public.transcripts (meeting_id);
create index if not exists transcripts_created_at_idx  on public.transcripts (created_at desc);

drop trigger if exists transcripts_set_updated_at on public.transcripts;
create trigger transcripts_set_updated_at
  before update on public.transcripts
  for each row execute function public.set_updated_at();

-- =============================================================================
-- 6. extractions — strukturovaná data z GPT-4o
-- =============================================================================

create table if not exists public.extractions (
  id                        uuid primary key default gen_random_uuid(),
  meeting_id                uuid not null references public.meetings(id) on delete cascade,
  transcript_id             uuid not null references public.transcripts(id) on delete cascade,
  structured_data           jsonb not null,
  model                     text,
  tokens_used               integer,
  latency_ms                integer,
  prompt_version            text,
  advisor_feedback_score    smallint,                 -- 1..5; null = nehodnoceno
  advisor_feedback_text     text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index if not exists extractions_meeting_idx       on public.extractions (meeting_id);
create index if not exists extractions_transcript_idx    on public.extractions (transcript_id);
create index if not exists extractions_created_at_idx    on public.extractions (created_at desc);
create index if not exists extractions_feedback_idx      on public.extractions (advisor_feedback_score);

drop trigger if exists extractions_set_updated_at on public.extractions;
create trigger extractions_set_updated_at
  before update on public.extractions
  for each row execute function public.set_updated_at();

-- =============================================================================
-- 7. calculations — výsledky kalkulátoru (plnění/krytí)
-- =============================================================================

create table if not exists public.calculations (
  id                  uuid primary key default gen_random_uuid(),
  meeting_id          uuid not null references public.meetings(id) on delete cascade,
  extraction_id       uuid not null references public.extractions(id) on delete cascade,
  results             jsonb not null,
  calculator_version  text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists calculations_meeting_idx     on public.calculations (meeting_id);
create index if not exists calculations_extraction_idx  on public.calculations (extraction_id);
create index if not exists calculations_created_at_idx  on public.calculations (created_at desc);

drop trigger if exists calculations_set_updated_at on public.calculations;
create trigger calculations_set_updated_at
  before update on public.calculations
  for each row execute function public.set_updated_at();

-- =============================================================================
-- 8. offers — PDF nabídky pro zákazníky
--    meeting_id nullable: lze vystavit nabídku i bez schůzky.
-- =============================================================================

create table if not exists public.offers (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants(id) on delete cascade,
  advisor_id      uuid not null references public.advisors(id) on delete cascade,
  customer_id     uuid not null references public.customers(id) on delete cascade,
  meeting_id      uuid references public.meetings(id) on delete set null,
  pdf_url         text,
  generated_text  text,
  model           text,
  status          public.offer_status not null default 'draft',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists offers_tenant_idx      on public.offers (tenant_id);
create index if not exists offers_advisor_idx     on public.offers (advisor_id);
create index if not exists offers_customer_idx    on public.offers (customer_id);
create index if not exists offers_meeting_idx     on public.offers (meeting_id);
create index if not exists offers_status_idx      on public.offers (status);
create index if not exists offers_created_at_idx  on public.offers (created_at desc);

drop trigger if exists offers_set_updated_at on public.offers;
create trigger offers_set_updated_at
  before update on public.offers
  for each row execute function public.set_updated_at();

-- =============================================================================
-- 9. analytics_events — fine-tuning corpus + product metrics
--    advisor_id / tenant_id nullable: server-side jobs můžou logovat anonymně.
-- =============================================================================

create table if not exists public.analytics_events (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid references public.tenants(id) on delete set null,
  advisor_id    uuid references public.advisors(id) on delete set null,
  event_type    text not null,
  event_data    jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists analytics_events_tenant_idx       on public.analytics_events (tenant_id);
create index if not exists analytics_events_advisor_idx      on public.analytics_events (advisor_id);
create index if not exists analytics_events_event_type_idx   on public.analytics_events (event_type);
create index if not exists analytics_events_created_at_idx   on public.analytics_events (created_at desc);

-- (intentionally no updated_at — events jsou immutable.)

-- =============================================================================
-- 10. assistant_threads — sidebar AI chat: konverzace
-- =============================================================================

create table if not exists public.assistant_threads (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants(id) on delete cascade,
  advisor_id   uuid not null references public.advisors(id) on delete cascade,
  title        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists assistant_threads_tenant_idx     on public.assistant_threads (tenant_id);
create index if not exists assistant_threads_advisor_idx    on public.assistant_threads (advisor_id);
create index if not exists assistant_threads_created_at_idx on public.assistant_threads (created_at desc);

drop trigger if exists assistant_threads_set_updated_at on public.assistant_threads;
create trigger assistant_threads_set_updated_at
  before update on public.assistant_threads
  for each row execute function public.set_updated_at();

-- =============================================================================
-- 11. assistant_messages — sidebar AI chat: zprávy
-- =============================================================================

create table if not exists public.assistant_messages (
  id           uuid primary key default gen_random_uuid(),
  thread_id    uuid not null references public.assistant_threads(id) on delete cascade,
  role         public.assistant_role not null,
  content      text not null,
  model        text,
  tokens_used  integer,
  created_at   timestamptz not null default now()
);

create index if not exists assistant_messages_thread_idx      on public.assistant_messages (thread_id);
create index if not exists assistant_messages_created_at_idx  on public.assistant_messages (created_at desc);

-- (immutable — no updated_at)

-- =============================================================================
-- Done. RLS is enabled in 0003 — until then these tables are inaccessible
-- via anon/authenticated keys (default Supabase posture: deny).
-- =============================================================================
