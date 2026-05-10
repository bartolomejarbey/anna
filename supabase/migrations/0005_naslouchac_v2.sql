-- =============================================================================
-- 0005_naslouchac_v2.sql
-- Naslouchač pipeline v2: cleanup AI step + per-step server actions.
--
-- Adds 'cleaning' and 'cleaned' to meeting_status enum (před 'extracting'),
-- a doplňuje sloupce na transcripts pro cleanup output (cleaned_text + diff
-- corrections + model meta).
-- =============================================================================

-- 1. Enum hodnoty pro status pipeline
do $$
begin
  if not exists (
    select 1 from pg_enum
    where enumtypid = 'public.meeting_status'::regtype
      and enumlabel = 'cleaning'
  ) then
    alter type public.meeting_status add value 'cleaning' before 'extracting';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_enum
    where enumtypid = 'public.meeting_status'::regtype
      and enumlabel = 'cleaned'
  ) then
    alter type public.meeting_status add value 'cleaned' before 'extracting';
  end if;
end $$;

-- 2. Sloupce pro cleanup output na transcripts
alter table public.transcripts
  add column if not exists cleaned_text         text;

alter table public.transcripts
  add column if not exists cleanup_corrections  jsonb;

alter table public.transcripts
  add column if not exists cleanup_model        text;

alter table public.transcripts
  add column if not exists cleanup_tokens       integer;

alter table public.transcripts
  add column if not exists cleanup_latency_ms   integer;

-- 3. Komentáře (doc na sloupcích — pomáhá při supabase gen types a v admin UI)
comment on column public.transcripts.cleaned_text is
  'Český přepis po AI cleanup (gpt-4o-mini). Použít přednostně před `text` pro extrakci.';

comment on column public.transcripts.cleanup_corrections is
  'JSON pole {from, to, reason} oprav, které cleanup model provedl. Pro UI diff viewer.';
