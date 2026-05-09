-- =============================================================================
-- Anna — Row-Level Security policies (Phase 1)
--
-- Roles (per CLAUDE.md sec. 4):
--   1. super_admin   — Bartoloměj, Lukáš. See/do everything.
--   2. tenant_admin  — admin sítě (e.g. 4FIN admin). See/do everything within
--                       their own tenant.
--   3. advisor       — řadový poradce ("klient" v UI). See/do only their own
--                       customers/meetings/etc.
--   4. customer      — zákazník (koncový spotřebitel). NOT YET ENABLED.
--                       Zákaznická zóna ships in Q2 2026 — see CLAUDE.md sec. 9
--                       (placeholder modul #15). For now we deliberately add
--                       NO customer-role policies; default-deny applies.
--
-- Convention:
--   * Policies are split per command (select/insert/update/delete) when the
--     check differs; merged via `for all` only when they're truly identical.
--   * `restrictive` is NOT used — we rely on permissive OR semantics (Postgres
--     default). super_admin is granted via a separate permissive policy
--     instead of bypassing per-role checks.
--   * Tables without direct advisor_id (transcripts, extractions, calculations,
--     assistant_messages) authorize through their parent FK via EXISTS.
--   * NEW.tenant_id consistency on INSERT/UPDATE is enforced via WITH CHECK
--     against public.tenant_id() so an advisor can't post into another tenant.
-- =============================================================================

-- =============================================================================
-- Enable RLS on every table.
-- =============================================================================

alter table public.tenants             enable row level security;
alter table public.advisors            enable row level security;
alter table public.customers           enable row level security;
alter table public.meetings            enable row level security;
alter table public.transcripts         enable row level security;
alter table public.extractions         enable row level security;
alter table public.calculations        enable row level security;
alter table public.offers              enable row level security;
alter table public.analytics_events    enable row level security;
alter table public.assistant_threads   enable row level security;
alter table public.assistant_messages  enable row level security;

-- Force RLS even for table owner — defense-in-depth so a role with BYPASSRLS
-- (which advisor/anon don't have) can't accidentally leak via a future
-- function with privileges.
alter table public.tenants             force row level security;
alter table public.advisors            force row level security;
alter table public.customers           force row level security;
alter table public.meetings            force row level security;
alter table public.transcripts         force row level security;
alter table public.extractions         force row level security;
alter table public.calculations        force row level security;
alter table public.offers              force row level security;
alter table public.analytics_events    force row level security;
alter table public.assistant_threads   force row level security;
alter table public.assistant_messages  force row level security;

-- =============================================================================
-- 1. tenants
--    — super_admin: all
--    — tenant_admin: select + update own tenant (branding)
--    — advisor: select own tenant
-- =============================================================================

drop policy if exists "tenants_super_admin_all"        on public.tenants;
drop policy if exists "tenants_tenant_admin_select"    on public.tenants;
drop policy if exists "tenants_tenant_admin_update"    on public.tenants;
drop policy if exists "tenants_advisor_select_own"     on public.tenants;

create policy "tenants_super_admin_all"
  on public.tenants for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "tenants_tenant_admin_select"
  on public.tenants for select to authenticated
  using (public.is_tenant_admin() and id = public.tenant_id());

create policy "tenants_tenant_admin_update"
  on public.tenants for update to authenticated
  using (public.is_tenant_admin() and id = public.tenant_id())
  with check (public.is_tenant_admin() and id = public.tenant_id());

create policy "tenants_advisor_select_own"
  on public.tenants for select to authenticated
  using (id = public.tenant_id());

-- =============================================================================
-- 2. advisors
--    — super_admin: all
--    — tenant_admin: all within own tenant
--    — advisor: select own row only (read profile + colleagues are NOT visible
--      in Phase 1; if needed, add a "tenant_directory" policy later)
-- =============================================================================

drop policy if exists "advisors_super_admin_all"       on public.advisors;
drop policy if exists "advisors_tenant_admin_all"      on public.advisors;
drop policy if exists "advisors_self_select"           on public.advisors;
drop policy if exists "advisors_self_update"           on public.advisors;

create policy "advisors_super_admin_all"
  on public.advisors for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "advisors_tenant_admin_all"
  on public.advisors for all to authenticated
  using (public.is_tenant_admin() and tenant_id = public.tenant_id())
  with check (public.is_tenant_admin() and tenant_id = public.tenant_id());

create policy "advisors_self_select"
  on public.advisors for select to authenticated
  using (id = public.advisor_id());

create policy "advisors_self_update"
  on public.advisors for update to authenticated
  using (id = public.advisor_id())
  -- prevent advisor from escalating role or jumping tenant
  with check (
    id = public.advisor_id()
    and tenant_id = public.tenant_id()
    and role = public.advisor_role()::public.advisor_role
  );

-- =============================================================================
-- 3. customers
--    — super_admin: all
--    — tenant_admin: all within tenant
--    — advisor: all own
-- =============================================================================

drop policy if exists "customers_super_admin_all"   on public.customers;
drop policy if exists "customers_tenant_admin_all"  on public.customers;
drop policy if exists "customers_advisor_all"       on public.customers;

create policy "customers_super_admin_all"
  on public.customers for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "customers_tenant_admin_all"
  on public.customers for all to authenticated
  using (public.is_tenant_admin() and tenant_id = public.tenant_id())
  with check (public.is_tenant_admin() and tenant_id = public.tenant_id());

create policy "customers_advisor_all"
  on public.customers for all to authenticated
  using (advisor_id = public.advisor_id())
  with check (
    advisor_id = public.advisor_id()
    and tenant_id = public.tenant_id()
  );

-- =============================================================================
-- 4. meetings
-- =============================================================================

drop policy if exists "meetings_super_admin_all"   on public.meetings;
drop policy if exists "meetings_tenant_admin_all"  on public.meetings;
drop policy if exists "meetings_advisor_all"       on public.meetings;

create policy "meetings_super_admin_all"
  on public.meetings for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "meetings_tenant_admin_all"
  on public.meetings for all to authenticated
  using (public.is_tenant_admin() and tenant_id = public.tenant_id())
  with check (public.is_tenant_admin() and tenant_id = public.tenant_id());

create policy "meetings_advisor_all"
  on public.meetings for all to authenticated
  using (advisor_id = public.advisor_id())
  with check (
    advisor_id = public.advisor_id()
    and tenant_id = public.tenant_id()
  );

-- =============================================================================
-- 5. transcripts (no direct advisor_id — authorize via meetings)
-- =============================================================================

drop policy if exists "transcripts_super_admin_all"   on public.transcripts;
drop policy if exists "transcripts_tenant_admin_all"  on public.transcripts;
drop policy if exists "transcripts_advisor_all"       on public.transcripts;

create policy "transcripts_super_admin_all"
  on public.transcripts for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "transcripts_tenant_admin_all"
  on public.transcripts for all to authenticated
  using (
    public.is_tenant_admin() and exists (
      select 1 from public.meetings m
      where m.id = transcripts.meeting_id
        and m.tenant_id = public.tenant_id()
    )
  )
  with check (
    public.is_tenant_admin() and exists (
      select 1 from public.meetings m
      where m.id = transcripts.meeting_id
        and m.tenant_id = public.tenant_id()
    )
  );

create policy "transcripts_advisor_all"
  on public.transcripts for all to authenticated
  using (
    exists (
      select 1 from public.meetings m
      where m.id = transcripts.meeting_id
        and m.advisor_id = public.advisor_id()
    )
  )
  with check (
    exists (
      select 1 from public.meetings m
      where m.id = transcripts.meeting_id
        and m.advisor_id = public.advisor_id()
    )
  );

-- =============================================================================
-- 6. extractions (authorize via meetings)
-- =============================================================================

drop policy if exists "extractions_super_admin_all"   on public.extractions;
drop policy if exists "extractions_tenant_admin_all"  on public.extractions;
drop policy if exists "extractions_advisor_all"       on public.extractions;

create policy "extractions_super_admin_all"
  on public.extractions for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "extractions_tenant_admin_all"
  on public.extractions for all to authenticated
  using (
    public.is_tenant_admin() and exists (
      select 1 from public.meetings m
      where m.id = extractions.meeting_id
        and m.tenant_id = public.tenant_id()
    )
  )
  with check (
    public.is_tenant_admin() and exists (
      select 1 from public.meetings m
      where m.id = extractions.meeting_id
        and m.tenant_id = public.tenant_id()
    )
  );

create policy "extractions_advisor_all"
  on public.extractions for all to authenticated
  using (
    exists (
      select 1 from public.meetings m
      where m.id = extractions.meeting_id
        and m.advisor_id = public.advisor_id()
    )
  )
  with check (
    exists (
      select 1 from public.meetings m
      where m.id = extractions.meeting_id
        and m.advisor_id = public.advisor_id()
    )
  );

-- =============================================================================
-- 7. calculations (authorize via meetings)
-- =============================================================================

drop policy if exists "calculations_super_admin_all"   on public.calculations;
drop policy if exists "calculations_tenant_admin_all"  on public.calculations;
drop policy if exists "calculations_advisor_all"       on public.calculations;

create policy "calculations_super_admin_all"
  on public.calculations for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "calculations_tenant_admin_all"
  on public.calculations for all to authenticated
  using (
    public.is_tenant_admin() and exists (
      select 1 from public.meetings m
      where m.id = calculations.meeting_id
        and m.tenant_id = public.tenant_id()
    )
  )
  with check (
    public.is_tenant_admin() and exists (
      select 1 from public.meetings m
      where m.id = calculations.meeting_id
        and m.tenant_id = public.tenant_id()
    )
  );

create policy "calculations_advisor_all"
  on public.calculations for all to authenticated
  using (
    exists (
      select 1 from public.meetings m
      where m.id = calculations.meeting_id
        and m.advisor_id = public.advisor_id()
    )
  )
  with check (
    exists (
      select 1 from public.meetings m
      where m.id = calculations.meeting_id
        and m.advisor_id = public.advisor_id()
    )
  );

-- =============================================================================
-- 8. offers
-- =============================================================================

drop policy if exists "offers_super_admin_all"   on public.offers;
drop policy if exists "offers_tenant_admin_all"  on public.offers;
drop policy if exists "offers_advisor_all"       on public.offers;

create policy "offers_super_admin_all"
  on public.offers for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "offers_tenant_admin_all"
  on public.offers for all to authenticated
  using (public.is_tenant_admin() and tenant_id = public.tenant_id())
  with check (public.is_tenant_admin() and tenant_id = public.tenant_id());

create policy "offers_advisor_all"
  on public.offers for all to authenticated
  using (advisor_id = public.advisor_id())
  with check (
    advisor_id = public.advisor_id()
    and tenant_id = public.tenant_id()
  );

-- =============================================================================
-- 9. analytics_events
--    — super_admin: select all (this is the fine-tuning corpus + admin
--      dashboard data; only super-admins read it).
--    — advisor: insert own events only. NO select. NO update. NO delete.
--    — tenant_admin: deliberately not granted read access in Phase 1; the
--      admin panel sits behind super_admin. Revisit if/when a tenant-scoped
--      analytics view is added.
-- =============================================================================

drop policy if exists "analytics_events_super_admin_select"   on public.analytics_events;
drop policy if exists "analytics_events_super_admin_modify"   on public.analytics_events;
drop policy if exists "analytics_events_advisor_insert"       on public.analytics_events;

create policy "analytics_events_super_admin_select"
  on public.analytics_events for select to authenticated
  using (public.is_super_admin());

-- super_admin can also insert/update/delete (e.g. backfills, GDPR deletions)
create policy "analytics_events_super_admin_modify"
  on public.analytics_events for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "analytics_events_advisor_insert"
  on public.analytics_events for insert to authenticated
  with check (
    advisor_id = public.advisor_id()
    and (tenant_id is null or tenant_id = public.tenant_id())
  );

-- =============================================================================
-- 10. assistant_threads
--    — super_admin: all
--    — advisor: all own
--    — tenant_admin: deliberately NOT granted (private to advisor)
-- =============================================================================

drop policy if exists "assistant_threads_super_admin_all"  on public.assistant_threads;
drop policy if exists "assistant_threads_advisor_all"      on public.assistant_threads;

create policy "assistant_threads_super_admin_all"
  on public.assistant_threads for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "assistant_threads_advisor_all"
  on public.assistant_threads for all to authenticated
  using (advisor_id = public.advisor_id())
  with check (
    advisor_id = public.advisor_id()
    and tenant_id = public.tenant_id()
  );

-- =============================================================================
-- 11. assistant_messages (authorize via assistant_threads)
-- =============================================================================

drop policy if exists "assistant_messages_super_admin_all"  on public.assistant_messages;
drop policy if exists "assistant_messages_advisor_all"      on public.assistant_messages;

create policy "assistant_messages_super_admin_all"
  on public.assistant_messages for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "assistant_messages_advisor_all"
  on public.assistant_messages for all to authenticated
  using (
    exists (
      select 1 from public.assistant_threads t
      where t.id = assistant_messages.thread_id
        and t.advisor_id = public.advisor_id()
    )
  )
  with check (
    exists (
      select 1 from public.assistant_threads t
      where t.id = assistant_messages.thread_id
        and t.advisor_id = public.advisor_id()
    )
  );

-- =============================================================================
-- Customer-zone (zákazník) role: NOT IMPLEMENTED.
--   Default-deny applies to every table for any role/JWT we don't whitelist
--   above, including a future customer JWT. When zákaznická zóna ships:
--     1) decide identifier (auth.users row vs JWT custom claim)
--     2) add per-table customer policies (likely on offers, customers self-row,
--        and a yet-to-be-built customer_documents table)
-- =============================================================================
