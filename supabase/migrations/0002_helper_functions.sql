-- =============================================================================
-- Anna — helper functions in `auth` schema for use in RLS policies.
--
-- All functions:
--   * LANGUAGE sql           — single SELECT, planner-friendly
--   * STABLE                 — same input → same output within a tx
--   * SECURITY DEFINER       — execute with owner privileges so they can read
--                              public.advisors even when the calling role can't
--   * SET search_path = ''   — schema-qualify every reference; prevents
--                              search_path injection (Supabase advisor: 0011)
--   * GRANT EXECUTE TO authenticated, anon, service_role
--
-- Naming: NOT auth.role() — Supabase already ships an auth.role() that returns
-- the JWT role claim ('anon', 'authenticated', 'service_role'). Name collision
-- = mystery bug. We use auth.advisor_role() instead.
-- =============================================================================

-- ---------- auth.advisor_id() ----------
-- public.advisors.id of the currently authenticated advisor (or NULL if the
-- caller is anon / has no matching advisor row).
create or replace function auth.advisor_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select a.id
  from public.advisors a
  where a.auth_user_id = auth.uid()
  limit 1
$$;

-- ---------- auth.tenant_id() ----------
-- tenant_id of the currently authenticated advisor (or NULL).
create or replace function auth.tenant_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select a.tenant_id
  from public.advisors a
  where a.auth_user_id = auth.uid()
  limit 1
$$;

-- ---------- auth.advisor_role() ----------
-- 'advisor' | 'tenant_admin' | 'super_admin' | NULL
-- Returned as text so it can be compared in policies without exposing the
-- enum type via PostgREST.
create or replace function auth.advisor_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select a.role::text
  from public.advisors a
  where a.auth_user_id = auth.uid()
  limit 1
$$;

-- ---------- auth.is_super_admin() ----------
create or replace function auth.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select a.role = 'super_admin'
       from public.advisors a
       where a.auth_user_id = auth.uid()
       limit 1),
    false
  )
$$;

-- ---------- auth.is_tenant_admin() ----------
-- Tenant admin within their own tenant. Note: this returns true ONLY for the
-- tenant_admin role; super_admins are checked separately. Each policy that
-- wants "admin or above" needs `is_tenant_admin() OR is_super_admin()`.
create or replace function auth.is_tenant_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select a.role = 'tenant_admin'
       from public.advisors a
       where a.auth_user_id = auth.uid()
       limit 1),
    false
  )
$$;

-- ---------- Grants ----------
-- Helper fns must be callable by the auth roles that hit RLS.
grant execute on function auth.advisor_id()       to anon, authenticated, service_role;
grant execute on function auth.tenant_id()        to anon, authenticated, service_role;
grant execute on function auth.advisor_role()     to anon, authenticated, service_role;
grant execute on function auth.is_super_admin()   to anon, authenticated, service_role;
grant execute on function auth.is_tenant_admin()  to anon, authenticated, service_role;
