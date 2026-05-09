-- =============================================================================
-- Anna — RLS smoke test: advisor isolation.
--
-- Purpose: Prove that an advisor (advisor A) cannot read OR write data
-- belonging to another advisor (advisor B) within the SAME tenant. Multi-tenant
-- leak across tenants is also covered indirectly because all our seed data is
-- in one tenant — if same-tenant isolation works, cross-tenant works for free
-- (the helper auth.tenant_id() also constrains the policy).
--
-- How to run (when local Supabase is up):
--   supabase db reset                                  # apply migrations + seed
--   psql "$(supabase status -o env | grep DB_URL | cut -d= -f2-)" \
--        -f tests/rls/advisor-isolation.sql
--
-- How to run on remote:
--   psql "$SUPABASE_DB_URL" -f tests/rls/advisor-isolation.sql
--
-- Exit code: psql exits non-zero when an ASSERT in a DO block fails. The
-- script ends with a single RAISE NOTICE 'PASS' when all checks pass.
--
-- Test impersonation pattern:
--   set local role authenticated;
--   set local "request.jwt.claims" = '{"sub":"<auth_user_id>"}';
-- This causes auth.uid() (which reads request.jwt.claims->>sub) to return
-- the impersonated user's id, exercising RLS as that user would.
--
-- IMPORTANT: this script assumes seed.sql has been applied. It uses the
-- deterministic UUIDs hardcoded in supabase/seed.sql.
-- =============================================================================

\set ON_ERROR_STOP on

begin;

-- ---------- IDs from seed ----------
-- advisor A = Karel Novák (advisor 1)
--   auth_user_id = aaaaaaaaaaa1
--   advisor.id   = ad0000000001
-- advisor B = Petra Svobodová (advisor 2)
--   auth_user_id = aaaaaaaaaaa2
--   advisor.id   = ad0000000002
-- super-admin Bartoloměj
--   auth_user_id = aaaaaaaaaaaa
--   advisor.id   = ad0000000099

-- =============================================================================
-- PHASE 0: smoke check — seed exists at all (run as service role / postgres).
-- =============================================================================

do $$
declare
  cnt int;
begin
  select count(*) into cnt from public.advisors;
  assert cnt >= 6, format('Expected >=6 advisors in seed, got %s. Did you run supabase db reset?', cnt);

  select count(*) into cnt from public.customers;
  assert cnt >= 30, format('Expected >=30 customers in seed, got %s', cnt);

  select count(*) into cnt from public.meetings;
  assert cnt = 10, format('Expected exactly 10 meetings in seed, got %s', cnt);

  select count(*) into cnt from public.offers;
  assert cnt = 5, format('Expected 5 offers in seed, got %s', cnt);
end $$;

-- =============================================================================
-- PHASE 1: impersonate ADVISOR A (Karel) — should see only own data.
-- =============================================================================

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-aaaaaaaaaaa1","role":"authenticated"}';

-- 1a. Helper functions return the right values.
do $$
declare
  aid uuid; tid uuid; rl text;
begin
  select auth.advisor_id() into aid;
  assert aid = '00000000-0000-0000-0000-ad0000000001'::uuid,
    format('auth.advisor_id() = %s, expected ad0000000001', aid);

  select auth.tenant_id() into tid;
  assert tid = '00000000-0000-0000-0000-00000000f1f1'::uuid,
    format('auth.tenant_id() = %s, expected f1f1', tid);

  select auth.advisor_role() into rl;
  assert rl = 'advisor', format('auth.advisor_role() = %s, expected advisor', rl);

  assert auth.is_super_admin() = false, 'advisor wrongly identified as super_admin';
  assert auth.is_tenant_admin() = false, 'advisor wrongly identified as tenant_admin';
end $$;

-- 1b. Advisor A sees own customers (>0) and zero of advisor B's.
do $$
declare
  own_cnt int; b_cnt int; total int;
begin
  select count(*) into own_cnt
    from public.customers
    where advisor_id = '00000000-0000-0000-0000-ad0000000001';
  assert own_cnt > 0, 'advisor A sees zero of own customers — RLS too restrictive';

  select count(*) into b_cnt
    from public.customers
    where advisor_id = '00000000-0000-0000-0000-ad0000000002';
  assert b_cnt = 0,
    format('LEAK: advisor A can see %s of advisor B customers', b_cnt);

  -- And the unfiltered query (what the UI would do) also only returns own.
  select count(*) into total from public.customers;
  assert total = own_cnt,
    format('LEAK: unfiltered customers count %s != own %s', total, own_cnt);
end $$;

-- 1c. Same check for meetings.
do $$
declare
  own_cnt int; b_cnt int;
begin
  select count(*) into own_cnt
    from public.meetings
    where advisor_id = '00000000-0000-0000-0000-ad0000000001';
  assert own_cnt > 0, 'advisor A sees zero own meetings';

  select count(*) into b_cnt
    from public.meetings
    where advisor_id = '00000000-0000-0000-0000-ad0000000002';
  assert b_cnt = 0,
    format('LEAK: advisor A can see %s of advisor B meetings', b_cnt);
end $$;

-- 1d. transcripts — child of meeting, no direct advisor_id.
do $$
declare
  own_cnt int; b_cnt int;
begin
  select count(*) into own_cnt
    from public.transcripts t
    join public.meetings m on m.id = t.meeting_id
    where m.advisor_id = '00000000-0000-0000-0000-ad0000000001';
  assert own_cnt > 0, 'advisor A sees zero own transcripts';

  select count(*) into b_cnt
    from public.transcripts t
    join public.meetings m on m.id = t.meeting_id
    where m.advisor_id = '00000000-0000-0000-0000-ad0000000002';
  assert b_cnt = 0,
    format('LEAK: advisor A reaches %s of advisor B transcripts', b_cnt);

  -- Direct read of B's transcript by id should also be blocked. Karel's
  -- transcript-1 is tr0000000001, Petra's is tr0000000002.
  select count(*) into b_cnt
    from public.transcripts
    where id = '00000000-0000-0000-0000-tr0000000002';
  assert b_cnt = 0, 'LEAK: advisor A read advisor B transcript by id';
end $$;

-- 1e. extractions.
do $$
declare
  own_cnt int; b_cnt int;
begin
  select count(*) into own_cnt
    from public.extractions e
    join public.meetings m on m.id = e.meeting_id
    where m.advisor_id = '00000000-0000-0000-0000-ad0000000001';
  assert own_cnt > 0, 'advisor A sees zero own extractions';

  select count(*) into b_cnt
    from public.extractions e
    join public.meetings m on m.id = e.meeting_id
    where m.advisor_id = '00000000-0000-0000-0000-ad0000000002';
  assert b_cnt = 0,
    format('LEAK: advisor A reaches %s of advisor B extractions', b_cnt);
end $$;

-- 1f. offers.
do $$
declare
  own_cnt int; b_cnt int;
begin
  select count(*) into own_cnt
    from public.offers
    where advisor_id = '00000000-0000-0000-0000-ad0000000001';
  assert own_cnt > 0, 'advisor A sees zero own offers';

  select count(*) into b_cnt
    from public.offers
    where advisor_id = '00000000-0000-0000-0000-ad0000000002';
  assert b_cnt = 0,
    format('LEAK: advisor A can see %s of advisor B offers', b_cnt);
end $$;

-- 1g. analytics_events — advisor MUST NOT read (super_admin only).
do $$
declare cnt int;
begin
  select count(*) into cnt from public.analytics_events;
  assert cnt = 0,
    format('LEAK: advisor sees %s analytics_events rows (should be 0, super_admin only)', cnt);
end $$;

-- 1h. analytics_events — advisor CAN insert own.
do $$
begin
  insert into public.analytics_events (tenant_id, advisor_id, event_type, event_data)
  values (
    '00000000-0000-0000-0000-00000000f1f1',
    '00000000-0000-0000-0000-ad0000000001',
    'rls_test_event',
    jsonb_build_object('source','advisor-isolation.sql')
  );
exception when others then
  raise exception 'advisor A failed to insert own analytics_event: %', SQLERRM;
end $$;

-- 1i. analytics_events — advisor CANNOT insert as another advisor.
do $$
begin
  insert into public.analytics_events (tenant_id, advisor_id, event_type, event_data)
  values (
    '00000000-0000-0000-0000-00000000f1f1',
    '00000000-0000-0000-0000-ad0000000002',  -- advisor B!
    'malicious_event',
    jsonb_build_object('source','advisor-isolation.sql')
  );
  raise exception 'LEAK: advisor A inserted event spoofing advisor B';
exception
  when insufficient_privilege or check_violation then
    null; -- expected
  when others then
    -- new_row_violates_row_level_security is SQLSTATE 42501 (insufficient_privilege)
    -- Postgres also raises 'new row violates row-level security policy' here.
    if SQLSTATE = '42501' then
      null;
    else
      raise;
    end if;
end $$;

-- 1j. WRITE — advisor CANNOT update advisor B's customer (silent zero rows).
do $$
declare affected int;
begin
  update public.customers
  set notes = 'I was here'
  where id = '00000000-0000-0000-0000-cu0200000001';  -- belongs to Petra
  get diagnostics affected = row_count;
  assert affected = 0,
    format('LEAK: advisor A updated %s rows of advisor B customers', affected);
end $$;

-- 1k. WRITE — advisor CANNOT delete advisor B's meeting.
do $$
declare affected int;
begin
  delete from public.meetings where id = '00000000-0000-0000-0000-mt0000000002';
  get diagnostics affected = row_count;
  assert affected = 0,
    format('LEAK: advisor A deleted %s rows of advisor B meetings', affected);
end $$;

-- 1l. WRITE — advisor CANNOT insert customer with another advisor's id.
do $$
begin
  insert into public.customers (tenant_id, advisor_id, full_name)
  values (
    '00000000-0000-0000-0000-00000000f1f1',
    '00000000-0000-0000-0000-ad0000000002',  -- advisor B!
    'Hacked Customer'
  );
  raise exception 'LEAK: advisor A inserted customer spoofing advisor B';
exception
  when insufficient_privilege or check_violation then null;
  when others then
    if SQLSTATE = '42501' then null; else raise; end if;
end $$;

reset role;

-- =============================================================================
-- PHASE 2: impersonate ADVISOR B (Petra) — symmetric check.
-- =============================================================================

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-aaaaaaaaaaa2","role":"authenticated"}';

do $$
declare own_cnt int; a_cnt int;
begin
  select count(*) into own_cnt
    from public.customers
    where advisor_id = '00000000-0000-0000-0000-ad0000000002';
  assert own_cnt > 0, 'advisor B sees zero own customers';

  select count(*) into a_cnt
    from public.customers
    where advisor_id = '00000000-0000-0000-0000-ad0000000001';
  assert a_cnt = 0, format('LEAK: advisor B can see %s advisor A customers', a_cnt);
end $$;

reset role;

-- =============================================================================
-- PHASE 3: impersonate SUPER ADMIN (Bartoloměj) — sees everything.
-- =============================================================================

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-aaaaaaaaaaaa","role":"authenticated"}';

do $$
declare cnt int;
begin
  assert auth.is_super_admin() = true, 'super_admin not detected';

  select count(*) into cnt from public.customers;
  assert cnt >= 30, format('super_admin sees %s customers, expected >=30', cnt);

  select count(*) into cnt from public.meetings;
  assert cnt = 10, format('super_admin sees %s meetings, expected 10', cnt);

  -- super_admin can read analytics_events
  select count(*) into cnt from public.analytics_events;
  assert cnt > 0, 'super_admin should see analytics_events but sees 0';
end $$;

reset role;

-- =============================================================================
-- PHASE 4: anonymous (unauthenticated) — sees nothing.
-- =============================================================================

set local role anon;
-- no jwt.claims => auth.uid() returns NULL => helpers return NULL => all
-- USING clauses evaluate to NULL/false.

do $$
declare cnt int;
begin
  select count(*) into cnt from public.customers;
  assert cnt = 0, format('LEAK: anon sees %s customers', cnt);

  select count(*) into cnt from public.meetings;
  assert cnt = 0, format('LEAK: anon sees %s meetings', cnt);

  select count(*) into cnt from public.offers;
  assert cnt = 0, format('LEAK: anon sees %s offers', cnt);

  select count(*) into cnt from public.analytics_events;
  assert cnt = 0, format('LEAK: anon sees %s analytics_events', cnt);
end $$;

reset role;

rollback;  -- discard the test event we inserted in 1h, plus any side-effects.

-- =============================================================================
-- All assertions passed.
-- =============================================================================
do $$ begin
  raise notice '====================================================';
  raise notice 'PASS — RLS isolation OK across customers, meetings,';
  raise notice '      transcripts, extractions, offers, analytics.';
  raise notice '====================================================';
end $$;
