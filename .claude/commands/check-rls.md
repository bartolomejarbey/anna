---
description: Audit RLS coverage napříč public schématem (tabulky bez RLS, počty policies, role coverage).
---

Spusť přes Supabase MCP (`supabase` server, read-only) následující introspekci a vrať report v této podobě:

```
## RLS audit — <timestamp>

### Tabulky bez RLS (kritické)
- `public.X` — RLS DISABLED

### Tabulky s nedostatečným pokrytím rolí (cíl: 4 role z CLAUDE.md sekce 4)
- `public.Y` — chybí policy pro `super_admin`

### Plné pokrytí
- `public.Z` — 4 policies (advisor, tenant_admin, super_admin, customer)
```

Postup:

1. `SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;` — najdi tabulky s `rowsecurity = false`.
2. `SELECT schemaname, tablename, policyname, cmd, roles FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname;` — vypiš všechny policies.
3. Pro každou tabulku spočítej (a) zda má RLS zapnuto a (b) zda existuje policy pokrývající role: `super_admin`, `tenant_admin`, `advisor`, `customer` (typicky přes helper funkce `auth.is_super_admin()`, `auth.tenant_id()`, `auth.advisor_id()`).
4. Reportuj:
   - **Kritické** — tabulky s `rowsecurity = false`
   - **Nedostatečné** — RLS zapnuto ale role coverage neúplné
   - **OK** — plné pokrytí

Pokud Supabase MCP není dostupné (chybí `SUPABASE_PROJECT_REF` v env), místo toho navrhni: „Spusť `npx supabase status` a `npx supabase db execute --local --command \"SELECT ...\"` lokálně."

Read-only, žádné DDL.
