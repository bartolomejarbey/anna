-- =============================================================================
-- Anna — helper functions in `public` schema for use in RLS policies.
--
-- Originally these lived in the `auth` schema, but Supabase reserves that
-- schema for built-ins and `db push` cannot create functions there. The
-- `public` schema works equivalently because:
--   * the functions are SECURITY DEFINER (run as their owner — typically
--     `postgres`, which has BYPASSRLS) so `force row level security` on
--     public.advisors does not block them;
--   * `set search_path = ''` plus fully-qualified references (public.advisors,
--     auth.uid()) prevents search_path injection regardless of schema.
--
-- Naming: NOT public.role() — `auth.role()` is the built-in JWT role claim
-- ('anon' / 'authenticated' / 'service_role'). We use public.advisor_role()
-- so there is no collision.
-- =============================================================================

-- ---------- public.advisor_id() ----------
-- public.advisors.id of the currently authenticated advisor (or NULL if the
-- caller is anon / has no matching advisor row).
create or replace function public.advisor_id()
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

-- ---------- public.tenant_id() ----------
-- tenant_id of the currently authenticated advisor (or NULL).
create or replace function public.tenant_id()
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

-- ---------- public.advisor_role() ----------
-- 'advisor' | 'tenant_admin' | 'super_admin' | NULL
-- Returned as text so it can be compared in policies without exposing the
-- enum type via PostgREST.
create or replace function public.advisor_role()
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

-- ---------- public.is_super_admin() ----------
create or replace function public.is_super_admin()
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

-- ---------- public.is_tenant_admin() ----------
-- Tenant admin within their own tenant. Note: this returns true ONLY for the
-- tenant_admin role; super_admins are checked separately. Each policy that
-- wants "admin or above" needs `is_tenant_admin() OR is_super_admin()`.
create or replace function public.is_tenant_admin()
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
grant execute on function public.advisor_id()       to anon, authenticated, service_role;
grant execute on function public.tenant_id()        to anon, authenticated, service_role;
grant execute on function public.advisor_role()     to anon, authenticated, service_role;
grant execute on function public.is_super_admin()   to anon, authenticated, service_role;
grant execute on function public.is_tenant_admin()  to anon, authenticated, service_role;
