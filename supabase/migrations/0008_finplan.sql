-- =============================================================================
-- 0008_finplan.sql
-- Finanční plán z dokumentů — privacy-first dokument-upload flow.
--
-- Tok:
--   1. Poradce vygeneruje link s tokenem → finplan_sessions row.
--   2. Zákazník otevře /plan/<token>, nahraje 12 výpisů + OP přední/zadní.
--   3. Server uloží soubory do bucketu finplan-docs (private, service-role only).
--   4. Server zavolá Claude (server-side, ne browser) → ukládá JEN agregáty
--      do finplan_extracted (total_income, total_expenses, ne transakce).
--   5. Server postaví PlanData JSON → finplan_analyses (jediná tabulka, kterou
--      poradce čte).
--
-- Privacy enforcement:
--   * Poradce NIKDY nečte finplan_uploads ani finplan_extracted (RLS deny).
--   * Poradce čte jen finplan_sessions.status a finplan_analyses (agregáty).
--   * Storage bucket finplan-docs je private, jen service_role má přístup.
-- =============================================================================

-- ====== ENUMS ======

do $$ begin
  create type public.finplan_session_status as enum (
    'created',
    'opened',
    'uploading',
    'uploaded',
    'extracting',
    'analyzed',
    'failed'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.finplan_doc_kind as enum (
    'bank_statement',
    'id_front',
    'id_back',
    'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.finplan_employment_type as enum ('employee', 'selfemployed');
exception when duplicate_object then null; end $$;

-- ====== TABLE: finplan_sessions ======

create table if not exists public.finplan_sessions (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants(id) on delete cascade,
  advisor_id      uuid not null references public.advisors(id) on delete cascade,
  customer_id     uuid not null references public.customers(id) on delete cascade,

  -- URL-safe token (32 bytes base64url ≈ 43 znaků)
  access_token    text not null unique,

  status          public.finplan_session_status not null default 'created',

  -- Customer-supplied at landing (employee/selfemployed)
  employment_type public.finplan_employment_type,

  -- Default 30 dní platnosti
  expires_at      timestamptz not null default (now() + interval '30 days'),

  opened_at       timestamptz,
  uploaded_at     timestamptz,
  analyzed_at     timestamptz,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists finplan_sessions_advisor_idx  on public.finplan_sessions (advisor_id);
create index if not exists finplan_sessions_customer_idx on public.finplan_sessions (customer_id);
create index if not exists finplan_sessions_tenant_idx   on public.finplan_sessions (tenant_id);
create index if not exists finplan_sessions_token_idx    on public.finplan_sessions (access_token);
create index if not exists finplan_sessions_status_idx   on public.finplan_sessions (status);
create index if not exists finplan_sessions_created_idx  on public.finplan_sessions (created_at desc);

drop trigger if exists finplan_sessions_set_updated_at on public.finplan_sessions;
create trigger finplan_sessions_set_updated_at
  before update on public.finplan_sessions
  for each row execute function public.set_updated_at();

-- ====== TABLE: finplan_uploads ======

create table if not exists public.finplan_uploads (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references public.finplan_sessions(id) on delete cascade,

  kind          public.finplan_doc_kind not null,
  file_path     text not null,
  file_name     text not null,
  file_size     integer not null,
  mime_type     text,

  extracted_at  timestamptz,
  extract_error text,

  created_at    timestamptz not null default now()
);

create index if not exists finplan_uploads_session_idx on public.finplan_uploads (session_id);
create index if not exists finplan_uploads_kind_idx    on public.finplan_uploads (kind);

-- ====== TABLE: finplan_extracted ======
-- POUZE AGREGÁTY. Žádné transakce. Žádný raw text.

create table if not exists public.finplan_extracted (
  id                uuid primary key default gen_random_uuid(),
  upload_id         uuid not null unique references public.finplan_uploads(id) on delete cascade,
  session_id        uuid not null references public.finplan_sessions(id) on delete cascade,

  -- Bank statement aggregates
  total_income      numeric(12,2),
  total_expenses    numeric(12,2),
  period_months     numeric(4,1),
  transaction_count integer,
  bank_name         text,

  -- ID card fields (PII potřebné pro plán)
  id_full_name      text,
  id_birth_date     date,
  id_address        text,

  model             text,
  tokens_used       integer,
  latency_ms        integer,

  created_at        timestamptz not null default now()
);

create index if not exists finplan_extracted_session_idx on public.finplan_extracted (session_id);
create index if not exists finplan_extracted_upload_idx  on public.finplan_extracted (upload_id);

-- ====== TABLE: finplan_analyses ======
-- Finální PlanData JSON. Co poradce vidí.

create table if not exists public.finplan_analyses (
  id                uuid primary key default gen_random_uuid(),
  session_id        uuid not null unique references public.finplan_sessions(id) on delete cascade,
  tenant_id         uuid not null references public.tenants(id) on delete cascade,
  advisor_id        uuid not null references public.advisors(id) on delete cascade,
  customer_id       uuid not null references public.customers(id) on delete cascade,

  monthly_income    numeric(12,2),
  monthly_expenses  numeric(12,2),

  -- Full PlanData JSON (client, cashflow, insurance, efa, efaInputs, retirement)
  plan_data         jsonb not null,

  notes             text,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists finplan_analyses_advisor_idx  on public.finplan_analyses (advisor_id);
create index if not exists finplan_analyses_customer_idx on public.finplan_analyses (customer_id);
create index if not exists finplan_analyses_tenant_idx   on public.finplan_analyses (tenant_id);
create index if not exists finplan_analyses_created_idx  on public.finplan_analyses (created_at desc);

drop trigger if exists finplan_analyses_set_updated_at on public.finplan_analyses;
create trigger finplan_analyses_set_updated_at
  before update on public.finplan_analyses
  for each row execute function public.set_updated_at();

-- ====== RLS ======

alter table public.finplan_sessions  enable row level security;
alter table public.finplan_uploads   enable row level security;
alter table public.finplan_extracted enable row level security;
alter table public.finplan_analyses  enable row level security;

alter table public.finplan_sessions  force row level security;
alter table public.finplan_uploads   force row level security;
alter table public.finplan_extracted force row level security;
alter table public.finplan_analyses  force row level security;

-- finplan_sessions: advisor vidí svoje (status + metadata)
drop policy if exists "finplan_sessions_super_admin_all"  on public.finplan_sessions;
drop policy if exists "finplan_sessions_tenant_admin_all" on public.finplan_sessions;
drop policy if exists "finplan_sessions_advisor_all"      on public.finplan_sessions;

create policy "finplan_sessions_super_admin_all"
  on public.finplan_sessions for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "finplan_sessions_tenant_admin_all"
  on public.finplan_sessions for all to authenticated
  using (public.is_tenant_admin() and tenant_id = public.tenant_id())
  with check (public.is_tenant_admin() and tenant_id = public.tenant_id());

create policy "finplan_sessions_advisor_all"
  on public.finplan_sessions for all to authenticated
  using (advisor_id = public.advisor_id())
  with check (
    advisor_id = public.advisor_id()
    and tenant_id = public.tenant_id()
  );

-- finplan_uploads: JEN super_admin (audit). Poradce ne. Zákazník přes service role.
drop policy if exists "finplan_uploads_super_admin_all" on public.finplan_uploads;

create policy "finplan_uploads_super_admin_all"
  on public.finplan_uploads for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- finplan_extracted: JEN super_admin. Poradce ne.
drop policy if exists "finplan_extracted_super_admin_all" on public.finplan_extracted;

create policy "finplan_extracted_super_admin_all"
  on public.finplan_extracted for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- finplan_analyses: poradce čte svoje, edituje jen notes
drop policy if exists "finplan_analyses_super_admin_all"  on public.finplan_analyses;
drop policy if exists "finplan_analyses_tenant_admin_all" on public.finplan_analyses;
drop policy if exists "finplan_analyses_advisor_read"     on public.finplan_analyses;
drop policy if exists "finplan_analyses_advisor_update"   on public.finplan_analyses;

create policy "finplan_analyses_super_admin_all"
  on public.finplan_analyses for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "finplan_analyses_tenant_admin_all"
  on public.finplan_analyses for all to authenticated
  using (public.is_tenant_admin() and tenant_id = public.tenant_id())
  with check (public.is_tenant_admin() and tenant_id = public.tenant_id());

create policy "finplan_analyses_advisor_read"
  on public.finplan_analyses for select to authenticated
  using (advisor_id = public.advisor_id());

create policy "finplan_analyses_advisor_update"
  on public.finplan_analyses for update to authenticated
  using (advisor_id = public.advisor_id())
  with check (
    advisor_id = public.advisor_id()
    and tenant_id = public.tenant_id()
  );

-- ====== Storage bucket: finplan-docs ======

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'finplan-docs',
  'finplan-docs',
  false,
  52428800, -- 50 MB per soubor
  array['application/pdf','image/jpeg','image/png','image/webp','image/heic','image/heif','text/plain']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "finplan-docs: service role full access" on storage.objects;

create policy "finplan-docs: service role full access"
  on storage.objects for all
  to service_role
  using (bucket_id = 'finplan-docs')
  with check (bucket_id = 'finplan-docs');

-- ====== Komentáře ======

comment on table public.finplan_sessions is
  'Sezení pro nahrání dokumentů zákazníkem. Token-based přístup přes /plan/<token>.';
comment on table public.finplan_uploads is
  'Metadata nahraných souborů. RLS: jen super_admin (audit). Poradce nikdy nečte.';
comment on table public.finplan_extracted is
  'Agregované extrakce z dokumentů. POUZE AGREGÁTY — žádné transakce. RLS: jen super_admin.';
comment on table public.finplan_analyses is
  'Finální PlanData JSON. Co poradce vidí. Žádné transakce, jen agregáty + výpočty.';
