-- =============================================================================
-- Anna — demo seed.
--
-- Location: supabase/seed.sql (NOT supabase/migrations/) because
-- supabase/config.toml has [db.seed] sql_paths = ["./seed.sql"]; this file
-- runs automatically after migrations during `supabase db reset`. Putting it
-- in migrations/ would re-run it on every db push to a remote env, which we
-- don't want in production.
--
-- Contents:
--   * 1 tenant: 4FIN HOLDING
--   * 5 demo advisors (role=advisor, demo_login_enabled=true) + 1 super_admin
--   * Each backed by a real auth.users row with hashed password "demo1234"
--   * 32 customers spread across the 5 advisors
--   * 10 meetings:
--       3 in `ready` (full pipeline: transcript+extraction+calculation+offer)
--       2 in `extracted` (transcript+extraction)
--       1 in `transcribing` (live_text only)
--       4 in `idle`/`uploaded`
--   * 5 offers (3 from ready meetings + 2 standalone)
--
-- Deterministic UUIDs throughout so tests/rls/advisor-isolation.sql can
-- reference them directly.
-- =============================================================================

-- Idempotency: wipe and re-seed on every `supabase db reset`. Cascade FKs.
truncate table
  public.assistant_messages,
  public.assistant_threads,
  public.analytics_events,
  public.offers,
  public.calculations,
  public.extractions,
  public.transcripts,
  public.meetings,
  public.customers,
  public.advisors,
  public.tenants
restart identity cascade;

-- Wipe demo auth users we are about to re-create. (Real auth users from real
-- signups won't match these UUIDs.)
delete from auth.users where id in (
  '00000000-0000-0000-0000-aaaaaaaaaaaa',
  '00000000-0000-0000-0000-aaaaaaaaaaa1',
  '00000000-0000-0000-0000-aaaaaaaaaaa2',
  '00000000-0000-0000-0000-aaaaaaaaaaa3',
  '00000000-0000-0000-0000-aaaaaaaaaaa4',
  '00000000-0000-0000-0000-aaaaaaaaaaa5'
);

-- =============================================================================
-- 1. Tenant
-- =============================================================================

insert into public.tenants (id, name, slug, branding) values
  ('00000000-0000-0000-0000-00000000f1f1',
   '4FIN HOLDING',
   '4fin',
   jsonb_build_object(
     'logo_url', 'https://example.com/4fin-logo.svg',
     'primary_color', '#1F4F3F'
   ));

-- =============================================================================
-- 2. auth.users (demo login)
--    Password: demo1234 (bcrypt via pgcrypto). Email-confirmed so the magic
--    link / passwordless flow works without SMTP in dev.
-- =============================================================================

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous
)
values
  ('00000000-0000-0000-0000-aaaaaaaaaaaa',
   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'bartolomej@arbey.cz',
   crypt('demo1234', gen_salt('bf')),
   now(), now(), now(),
   jsonb_build_object('provider','email','providers',array['email']),
   jsonb_build_object('full_name','Bartoloměj Rota'),
   false, false),

  ('00000000-0000-0000-0000-aaaaaaaaaaa1',
   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'karel.novak@4fin.cz',
   crypt('demo1234', gen_salt('bf')),
   now(), now(), now(),
   jsonb_build_object('provider','email','providers',array['email']),
   jsonb_build_object('full_name','Karel Novák'),
   false, false),

  ('00000000-0000-0000-0000-aaaaaaaaaaa2',
   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'petra.svobodova@4fin.cz',
   crypt('demo1234', gen_salt('bf')),
   now(), now(), now(),
   jsonb_build_object('provider','email','providers',array['email']),
   jsonb_build_object('full_name','Petra Svobodová'),
   false, false),

  ('00000000-0000-0000-0000-aaaaaaaaaaa3',
   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'tomas.dvorak@4fin.cz',
   crypt('demo1234', gen_salt('bf')),
   now(), now(), now(),
   jsonb_build_object('provider','email','providers',array['email']),
   jsonb_build_object('full_name','Tomáš Dvořák'),
   false, false),

  ('00000000-0000-0000-0000-aaaaaaaaaaa4',
   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'eva.cerna@4fin.cz',
   crypt('demo1234', gen_salt('bf')),
   now(), now(), now(),
   jsonb_build_object('provider','email','providers',array['email']),
   jsonb_build_object('full_name','Eva Černá'),
   false, false),

  ('00000000-0000-0000-0000-aaaaaaaaaaa5',
   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'martin.prochazka@4fin.cz',
   crypt('demo1234', gen_salt('bf')),
   now(), now(), now(),
   jsonb_build_object('provider','email','providers',array['email']),
   jsonb_build_object('full_name','Martin Procházka'),
   false, false);

-- =============================================================================
-- 3. advisors
-- =============================================================================

insert into public.advisors
  (id, tenant_id, auth_user_id, email, full_name, role, demo_login_enabled)
values
  -- super-admin (Bartoloměj). Belongs to 4FIN for UI defaults but role overrides.
  ('00000000-0000-0000-0000-ad0000000099',
   '00000000-0000-0000-0000-00000000f1f1',
   '00000000-0000-0000-0000-aaaaaaaaaaaa',
   'bartolomej@arbey.cz', 'Bartoloměj Rota', 'super_admin', false),

  ('00000000-0000-0000-0000-ad0000000001',
   '00000000-0000-0000-0000-00000000f1f1',
   '00000000-0000-0000-0000-aaaaaaaaaaa1',
   'karel.novak@4fin.cz', 'Karel Novák', 'advisor', true),

  ('00000000-0000-0000-0000-ad0000000002',
   '00000000-0000-0000-0000-00000000f1f1',
   '00000000-0000-0000-0000-aaaaaaaaaaa2',
   'petra.svobodova@4fin.cz', 'Petra Svobodová', 'advisor', true),

  ('00000000-0000-0000-0000-ad0000000003',
   '00000000-0000-0000-0000-00000000f1f1',
   '00000000-0000-0000-0000-aaaaaaaaaaa3',
   'tomas.dvorak@4fin.cz', 'Tomáš Dvořák', 'advisor', true),

  ('00000000-0000-0000-0000-ad0000000004',
   '00000000-0000-0000-0000-00000000f1f1',
   '00000000-0000-0000-0000-aaaaaaaaaaa4',
   'eva.cerna@4fin.cz', 'Eva Černá', 'advisor', true),

  ('00000000-0000-0000-0000-ad0000000005',
   '00000000-0000-0000-0000-00000000f1f1',
   '00000000-0000-0000-0000-aaaaaaaaaaa5',
   'martin.prochazka@4fin.cz', 'Martin Procházka', 'advisor', true);

-- =============================================================================
-- 4. customers — 32 across 5 advisors (varied profiles)
--    UUID schema: 00000000-0000-0000-0000-ce<advisor_idx><seq>
--                 advisor_idx 1..5, seq 01..0X (zero-padded to 4 hex digits)
-- =============================================================================

-- Karel Novák (advisor 1) — 8 customers
insert into public.customers
  (id, tenant_id, advisor_id, full_name, email, phone, birth_date,
   monthly_income_czk, marital_status, has_children, notes)
values
  ('00000000-0000-0000-0000-ce0100000001',
   '00000000-0000-0000-0000-00000000f1f1',
   '00000000-0000-0000-0000-ad0000000001',
   'Jan Novotný', 'jan.novotny@example.cz', '+420 602 111 001',
   '1985-03-12', 65000, 'married', true,
   'Dvě děti (8, 11). Bydlí v hypotéce v Praze.'),
  ('00000000-0000-0000-0000-ce0100000002',
   '00000000-0000-0000-0000-00000000f1f1',
   '00000000-0000-0000-0000-ad0000000001',
   'Markéta Horáková', 'marketa.horakova@example.cz', '+420 602 111 002',
   '1998-07-22', 32000, 'single', false,
   'Junior developer, řeší první spoření a investice.'),
  ('00000000-0000-0000-0000-ce0100000003',
   '00000000-0000-0000-0000-00000000f1f1',
   '00000000-0000-0000-0000-ad0000000001',
   'Pavel Růžička', 'pavel.ruzicka@example.cz', '+420 602 111 003',
   '1980-11-04', 95000, 'divorced', true,
   'Jedno dítě (15) ve střídavé péči. Hledá ochranu příjmu.'),
  ('00000000-0000-0000-0000-ce0100000004',
   '00000000-0000-0000-0000-00000000f1f1',
   '00000000-0000-0000-0000-ad0000000001',
   'Lenka Veselá', 'lenka.vesela@example.cz', '+420 602 111 004',
   '1965-05-30', 48000, 'widowed', true,
   'Dospělé děti, blíží se důchod, zájem o zachování životní úrovně.'),
  ('00000000-0000-0000-0000-ce0100000005',
   '00000000-0000-0000-0000-00000000f1f1',
   '00000000-0000-0000-0000-ad0000000001',
   'David Kolář', 'david.kolar@example.cz', '+420 602 111 005',
   '1990-02-18', 58000, 'married', false,
   'Plánují první dítě, zajímá je rodičovské pojištění.'),
  ('00000000-0000-0000-0000-ce0100000006',
   '00000000-0000-0000-0000-00000000f1f1',
   '00000000-0000-0000-0000-ad0000000001',
   'Klára Šťastná', 'klara.stastna@example.cz', '+420 602 111 006',
   '1992-09-09', 42000, 'single', false,
   'OSVČ grafička, nepravidelný příjem, řeší rezervu.'),
  ('00000000-0000-0000-0000-ce0100000007',
   '00000000-0000-0000-0000-00000000f1f1',
   '00000000-0000-0000-0000-ad0000000001',
   'Roman Beneš', 'roman.benes@example.cz', '+420 602 111 007',
   '1978-12-01', 110000, 'married', true,
   'Tři děti, manažer ve firmě, řeší nadstandardní zdravotní pojištění.'),
  ('00000000-0000-0000-0000-ce0100000008',
   '00000000-0000-0000-0000-00000000f1f1',
   '00000000-0000-0000-0000-ad0000000001',
   'Ivana Marková', null, '+420 602 111 008',
   '2002-04-14', 28000, 'single', false,
   'Studentka VŠ, zájem jen o základní pojištění úrazu.'),

-- Petra Svobodová (advisor 2) — 7 customers
  ('00000000-0000-0000-0000-ce0200000001',
   '00000000-0000-0000-0000-00000000f1f1',
   '00000000-0000-0000-0000-ad0000000002',
   'Tomáš Procházka', 'tomas.prochazka@example.cz', '+420 602 222 001',
   '1987-06-25', 72000, 'married', true,
   'Dvě malé děti, hypotéka 4 mil. Kč.'),
  ('00000000-0000-0000-0000-ce0200000002',
   '00000000-0000-0000-0000-00000000f1f1',
   '00000000-0000-0000-0000-ad0000000002',
   'Anna Pospíšilová', 'anna.pospisilova@example.cz', '+420 602 222 002',
   '1995-01-15', 38000, 'single', false,
   'Junior účetní, pasivní investice — DIP, fondy.'),
  ('00000000-0000-0000-0000-ce0200000003',
   '00000000-0000-0000-0000-00000000f1f1',
   '00000000-0000-0000-0000-ad0000000002',
   'Petr Hájek', 'petr.hajek@example.cz', '+420 602 222 003',
   '1972-08-20', 86000, 'divorced', true,
   'Dvě dospělé děti, řeší přechod do předdůchodu.'),
  ('00000000-0000-0000-0000-ce0200000004',
   '00000000-0000-0000-0000-00000000f1f1',
   '00000000-0000-0000-0000-ad0000000002',
   'Veronika Králová', 'veronika.kralova@example.cz', '+420 602 222 004',
   '1989-11-11', 54000, 'married', true,
   'Jedno dítě, OSVČ designérka.'),
  ('00000000-0000-0000-0000-ce0200000005',
   '00000000-0000-0000-0000-00000000f1f1',
   '00000000-0000-0000-0000-ad0000000002',
   'Michal Šimek', 'michal.simek@example.cz', '+420 602 222 005',
   '1955-03-03', 35000, 'widowed', true,
   'Penzista, hledá rentové zajištění pro vnoučata.'),
  ('00000000-0000-0000-0000-ce0200000006',
   '00000000-0000-0000-0000-00000000f1f1',
   '00000000-0000-0000-0000-ad0000000002',
   'Jakub Doležal', 'jakub.dolezal@example.cz', '+420 602 222 006',
   '1996-10-19', 41000, 'single', false,
   'IT specialista, agresivní investor, ETF portfolio.'),
  ('00000000-0000-0000-0000-ce0200000007',
   '00000000-0000-0000-0000-00000000f1f1',
   '00000000-0000-0000-0000-ad0000000002',
   'Hana Bartošová', 'hana.bartosova@example.cz', '+420 602 222 007',
   '1968-04-08', 62000, 'married', true,
   'Manažerka v důchodu za 5 let, doplnění příjmu.'),

-- Tomáš Dvořák (advisor 3) — 6 customers
  ('00000000-0000-0000-0000-ce0300000001',
   '00000000-0000-0000-0000-00000000f1f1',
   '00000000-0000-0000-0000-ad0000000003',
   'Lucie Krejčí', 'lucie.krejci@example.cz', '+420 602 333 001',
   '1991-05-17', 49000, 'single', false,
   'Marketing manager, plánuje koupi bytu do 2 let.'),
  ('00000000-0000-0000-0000-ce0300000002',
   '00000000-0000-0000-0000-00000000f1f1',
   '00000000-0000-0000-0000-ad0000000003',
   'Filip Sedláček', 'filip.sedlacek@example.cz', '+420 602 333 002',
   '1983-09-29', 78000, 'married', true,
   'Dvě děti, výjezd do zahraničí, trvalé pobytové pojištění.'),
  ('00000000-0000-0000-0000-ce0300000003',
   '00000000-0000-0000-0000-00000000f1f1',
   '00000000-0000-0000-0000-ad0000000003',
   'Magdaléna Dvořáková', 'magdalena.dvorakova@example.cz', '+420 602 333 003',
   '1976-12-22', 67000, 'divorced', true,
   'Jedno dítě (12), pracující matka, řeší ochranu příjmu.'),
  ('00000000-0000-0000-0000-ce0300000004',
   '00000000-0000-0000-0000-00000000f1f1',
   '00000000-0000-0000-0000-ad0000000003',
   'Ondřej Beneš', 'ondrej.benes@example.cz', '+420 602 333 004',
   '2000-07-14', 30000, 'single', false,
   'Čerstvý absolvent, první zaměstnání, junior.'),
  ('00000000-0000-0000-0000-ce0300000005',
   '00000000-0000-0000-0000-00000000f1f1',
   '00000000-0000-0000-0000-ad0000000003',
   'Jiří Černý', 'jiri.cerny@example.cz', '+420 602 333 005',
   '1958-01-24', 52000, 'married', true,
   'V důchodu za 2 roky, doplnění zdravotního pojištění.'),
  ('00000000-0000-0000-0000-ce0300000006',
   '00000000-0000-0000-0000-00000000f1f1',
   '00000000-0000-0000-0000-ad0000000003',
   'Tereza Vítková', 'tereza.vitkova@example.cz', '+420 602 333 006',
   '1986-03-30', 60000, 'married', false,
   'Páreček bez dětí, plánují cestování světem.'),

-- Eva Černá (advisor 4) — 6 customers
  ('00000000-0000-0000-0000-ce0400000001',
   '00000000-0000-0000-0000-00000000f1f1',
   '00000000-0000-0000-0000-ad0000000004',
   'Martin Tichý', 'martin.tichy@example.cz', '+420 602 444 001',
   '1979-08-08', 92000, 'married', true,
   'Tři děti, jednatel s.r.o., velmi solventní.'),
  ('00000000-0000-0000-0000-ce0400000002',
   '00000000-0000-0000-0000-00000000f1f1',
   '00000000-0000-0000-0000-ad0000000004',
   'Barbora Nováková', 'barbora.novakova@example.cz', '+420 602 444 002',
   '1993-04-11', 44000, 'single', false,
   'Lékařka po atestaci, řeší vlastní bydlení.'),
  ('00000000-0000-0000-0000-ce0400000003',
   '00000000-0000-0000-0000-00000000f1f1',
   '00000000-0000-0000-0000-ad0000000004',
   'Petr Krásný', 'petr.krasny@example.cz', '+420 602 444 003',
   '1962-10-02', 58000, 'widowed', true,
   'Dospělé děti, blížící se penze, hodnotová rezerva.'),
  ('00000000-0000-0000-0000-ce0400000004',
   '00000000-0000-0000-0000-00000000f1f1',
   '00000000-0000-0000-0000-ad0000000004',
   'Kateřina Janoušková', 'katerina.janouskova@example.cz', '+420 602 444 004',
   '1988-12-19', 51000, 'married', true,
   'Dvě malé děti, mateřská, návrat do práce za rok.'),
  ('00000000-0000-0000-0000-ce0400000005',
   '00000000-0000-0000-0000-00000000f1f1',
   '00000000-0000-0000-0000-ad0000000004',
   'Adam Pokorný', 'adam.pokorny@example.cz', '+420 602 444 005',
   '1994-06-06', 47000, 'single', false,
   'Učitel ZŠ, klidný profil, dlouhodobé spoření.'),
  ('00000000-0000-0000-0000-ce0400000006',
   '00000000-0000-0000-0000-00000000f1f1',
   '00000000-0000-0000-0000-ad0000000004',
   'Šárka Holubová', 'sarka.holubova@example.cz', '+420 602 444 006',
   '1971-02-28', 73000, 'divorced', true,
   'Jedno dítě (17), HR manažerka.'),

-- Martin Procházka (advisor 5) — 5 customers
  ('00000000-0000-0000-0000-ce0500000001',
   '00000000-0000-0000-0000-00000000f1f1',
   '00000000-0000-0000-0000-ad0000000005',
   'Robert Kučera', 'robert.kucera@example.cz', '+420 602 555 001',
   '1984-07-07', 81000, 'married', true,
   'Dvě děti, bankéř, výborně zajištěný profil.'),
  ('00000000-0000-0000-0000-ce0500000002',
   '00000000-0000-0000-0000-00000000f1f1',
   '00000000-0000-0000-0000-ad0000000005',
   'Simona Brabcová', 'simona.brabcova@example.cz', '+420 602 555 002',
   '1997-11-23', 36000, 'single', false,
   'Studuje doktorát, příležitostné zaměstnání.'),
  ('00000000-0000-0000-0000-ce0500000003',
   '00000000-0000-0000-0000-00000000f1f1',
   '00000000-0000-0000-0000-ad0000000005',
   'Vladimír Mareš', 'vladimir.mares@example.cz', '+420 602 555 003',
   '1969-05-12', 64000, 'married', true,
   'Dvě dospělé děti, plánuje přechod do předdůchodu za 3 roky.'),
  ('00000000-0000-0000-0000-ce0500000004',
   '00000000-0000-0000-0000-00000000f1f1',
   '00000000-0000-0000-0000-ad0000000005',
   'Aneta Šimková', 'aneta.simkova@example.cz', '+420 602 555 004',
   '1990-09-03', 55000, 'married', false,
   'OSVČ kadeřnice, nepravidelný příjem, plánuje rodinu.'),
  ('00000000-0000-0000-0000-ce0500000005',
   '00000000-0000-0000-0000-00000000f1f1',
   '00000000-0000-0000-0000-ad0000000005',
   'Stanislav Ryba', null, '+420 602 555 005',
   '1953-03-15', 25000, 'widowed', true,
   'Senior, dospělé děti i vnoučata, malé úspory.');

-- =============================================================================
-- 5. meetings (10) — varied statuses for realistic dashboard
-- =============================================================================

insert into public.meetings
  (id, tenant_id, advisor_id, customer_id, status,
   audio_url, audio_duration_sec, capture_method,
   scheduled_at, recorded_at, created_at)
values
  -- READY (3) — full demo pre-cache. Click these if OpenAI fails on stage.
  ('00000000-0000-0000-0000-de0000000001',
   '00000000-0000-0000-0000-00000000f1f1',
   '00000000-0000-0000-0000-ad0000000001',
   '00000000-0000-0000-0000-ce0100000001',
   'ready',
   'https://example.com/audio/meeting-001.webm', 1820, 'browser_live',
   now() - interval '7 days', now() - interval '7 days', now() - interval '7 days'),

  ('00000000-0000-0000-0000-de0000000002',
   '00000000-0000-0000-0000-00000000f1f1',
   '00000000-0000-0000-0000-ad0000000002',
   '00000000-0000-0000-0000-ce0200000001',
   'ready',
   'https://example.com/audio/meeting-002.webm', 2350, 'file_upload',
   now() - interval '5 days', now() - interval '5 days', now() - interval '5 days'),

  ('00000000-0000-0000-0000-de0000000003',
   '00000000-0000-0000-0000-00000000f1f1',
   '00000000-0000-0000-0000-ad0000000004',
   '00000000-0000-0000-0000-ce0400000001',
   'ready',
   'https://example.com/audio/meeting-003.webm', 1980, 'browser_live',
   now() - interval '3 days', now() - interval '3 days', now() - interval '3 days'),

  -- EXTRACTED (2) — pipeline ran but advisor hasn't generated PDF yet
  ('00000000-0000-0000-0000-de0000000004',
   '00000000-0000-0000-0000-00000000f1f1',
   '00000000-0000-0000-0000-ad0000000003',
   '00000000-0000-0000-0000-ce0300000001',
   'extracted',
   'https://example.com/audio/meeting-004.webm', 1650, 'browser_live',
   now() - interval '2 days', now() - interval '2 days', now() - interval '2 days'),

  ('00000000-0000-0000-0000-de0000000005',
   '00000000-0000-0000-0000-00000000f1f1',
   '00000000-0000-0000-0000-ad0000000005',
   '00000000-0000-0000-0000-ce0500000001',
   'extracted',
   'https://example.com/audio/meeting-005.webm', 2100, 'file_upload',
   now() - interval '1 day', now() - interval '1 day', now() - interval '1 day'),

  -- TRANSCRIBING (1) — live captions running, Whisper still processing
  ('00000000-0000-0000-0000-de0000000006',
   '00000000-0000-0000-0000-00000000f1f1',
   '00000000-0000-0000-0000-ad0000000001',
   '00000000-0000-0000-0000-ce0100000002',
   'transcribing',
   null, null, 'browser_live',
   now() - interval '20 minutes', now() - interval '20 minutes', now() - interval '20 minutes'),

  -- IDLE (2) — created but recording hasn't started
  ('00000000-0000-0000-0000-de0000000007',
   '00000000-0000-0000-0000-00000000f1f1',
   '00000000-0000-0000-0000-ad0000000002',
   '00000000-0000-0000-0000-ce0200000004',
   'idle',
   null, null, null,
   now() + interval '2 days', null, now()),

  ('00000000-0000-0000-0000-de0000000008',
   '00000000-0000-0000-0000-00000000f1f1',
   '00000000-0000-0000-0000-ad0000000004',
   '00000000-0000-0000-0000-ce0400000004',
   'idle',
   null, null, null,
   now() + interval '5 days', null, now()),

  -- UPLOADED (2) — file uploaded, Whisper not yet started
  ('00000000-0000-0000-0000-de0000000009',
   '00000000-0000-0000-0000-00000000f1f1',
   '00000000-0000-0000-0000-ad0000000003',
   '00000000-0000-0000-0000-ce0300000003',
   'uploaded',
   'https://example.com/audio/meeting-009.webm', 1540, 'file_upload',
   now() - interval '1 hour', now() - interval '1 hour', now() - interval '1 hour'),

  ('00000000-0000-0000-0000-de0000000010',
   '00000000-0000-0000-0000-00000000f1f1',
   '00000000-0000-0000-0000-ad0000000005',
   '00000000-0000-0000-0000-ce0500000003',
   'uploaded',
   'https://example.com/audio/meeting-010.webm', 1900, 'file_upload',
   now() - interval '40 minutes', now() - interval '40 minutes', now() - interval '40 minutes');

-- =============================================================================
-- 6. transcripts — for the 3 ready + 2 extracted + 1 transcribing meetings
-- =============================================================================

-- Ready #1 — Karel × Jan Novotný (rodina, hypotéka)
insert into public.transcripts
  (id, meeting_id, live_text, whisper_text, text, language,
   whisper_model, whisper_tokens, whisper_latency_ms,
   reconcile_model, reconcile_tokens, reconcile_latency_ms, prompt_version)
values
  ('00000000-0000-0000-0000-cb0000000001',
   '00000000-0000-0000-0000-de0000000001',
   -- live_text (Web Speech, syrový s chybami)
   'Dobrý den pane Novotný posaďte se prosím. Já jsem Karel Novák, finanční poradce. Děkuji že jste si na mě udělal čas. Mohli bychom začít tím co vás teď nejvíc trápí v rodinných financích? Trápí. No tak teď máme zrovna druhé dítě, je mu osm a Jirkovi jedenáct. Bydlíme v Praze, v hypotéce, splácíme dvacet sedm tisíc měsíčně. Manželka pracuje na pět set hodin po mateřské, vyděláváme dohromady sto deset tisíc.',
   -- whisper_text (čistý)
   'Dobrý den, pane Novotný, posaďte se prosím. Já jsem Karel Novák, finanční poradce. Děkuji, že jste si na mě udělal čas. Mohli bychom začít tím, co vás teď nejvíc trápí v rodinných financích? Tak teď máme zrovna druhé dítě, je mu osm let a Jirkovi jedenáct. Bydlíme v Praze, v hypotéce, splácíme dvacet sedm tisíc měsíčně. Manželka pracuje na pět set hodin po mateřské, vyděláváme dohromady sto deset tisíc.',
   -- final reconciled
   'Dobrý den, pane Novotný, posaďte se prosím. Já jsem Karel Novák, finanční poradce. Děkuji, že jste si na mě udělal čas. Mohli bychom začít tím, co vás teď nejvíc trápí v rodinných financích? Tak teď máme zrovna dvě děti, mladšímu je osm let a Jirkovi jedenáct. Bydlíme v Praze, v hypotéce, splácíme dvacet sedm tisíc měsíčně. Manželka pracuje na pět set hodin po mateřské, vyděláváme dohromady sto deset tisíc měsíčně. Hlavní obava je: kdyby se mi něco stalo, jak by manželka utáhla hypotéku a děti? Žádné životní pojištění zatím nemáme, jen povinné ručení a havarijku na auto. Spoříme dva tisíce měsíčně do podílového fondu, který nám zařídila banka, ale moc tomu nerozumíme. Plánujeme za pět let zvětšit byt nebo se přestěhovat za město.',
   'cs', 'whisper-1', 1822, 4180,
   'gpt-4o-mini', 980, 2210, 'reconcile-v1.0'),

  -- Ready #2 — Petra × Tomáš Procházka (mladá rodina, dvě malé děti)
  ('00000000-0000-0000-0000-cb0000000002',
   '00000000-0000-0000-0000-de0000000002',
   'Tak já jsem Tomáš a manželka Lenka. Máme dvě malé děti, čtyři a šest. Hypotéku máme čtyři miliony, splácíme dvacet tři tisíc. Já dělám projektového manažera, beru asi sedmdesát dva čistého. Lenka teď nepracuje, je doma s mladší. Před dvěma lety nám zemřel kamarád na rakovinu a od té doby nás to pronásleduje, jestli jsme zajištění.',
   'Tak já jsem Tomáš a manželka Lenka. Máme dvě malé děti, čtyři a šest. Hypotéku máme čtyři miliony, splácíme dvacet tři tisíc. Já dělám projektového manažera, beru asi sedmdesát dva čistého. Lenka teď nepracuje, je doma s mladší. Před dvěma lety nám zemřel kamarád na rakovinu a od té doby nás to pronásleduje, jestli jsme zajištění.',
   'Tak já jsem Tomáš a manželka Lenka. Máme dvě malé děti, čtyři a šest let. Hypotéku máme čtyři miliony, splácíme dvacet tři tisíc měsíčně. Já dělám projektového manažera, beru asi sedmdesát dva tisíc čistého. Lenka teď nepracuje, je doma s mladší dcerou. Před dvěma lety nám zemřel blízký kamarád na rakovinu a od té doby nás pronásleduje obava, jestli jsme rodinně zajištění. Nemám žádné životko, manželka taky ne. Stavební spoření má každý zvlášť, asi dohromady osmdesát tisíc na rezervě. Spoříme tři tisíce do indexových fondů přes ETF, to si dělám sám. Plán: do pěti let postavit chatu a dát děti do soukromé školy.',
   'cs', 'whisper-1', 2310, 5040,
   'gpt-4o-mini', 1140, 2480, 'reconcile-v1.0'),

  -- Ready #3 — Eva × Martin Tichý (jednatel s.r.o., 3 děti)
  ('00000000-0000-0000-0000-cb0000000003',
   '00000000-0000-0000-0000-de0000000003',
   'Já jsem Martin, mám eseróčko na strojírenství, dvanáct lidí. Vyděláváme s manželkou dohromady sto čtyřicet tisíc, ale firma závisí na mně. Tři děti, sedm, deset, čtrnáct. Mám teď životní pojistku ze tří let zpátky, ale kamarádka mi řekla že je špatně nastavená a že je tam asistence kterou nepotřebuju.',
   'Já jsem Martin, mám eseróčko na strojírenství, dvanáct lidí. Vyděláváme s manželkou dohromady sto čtyřicet tisíc, ale firma závisí na mně. Tři děti, sedm, deset, čtrnáct. Mám teď životní pojistku ze tří let zpátky, ale kamarádka mi řekla, že je špatně nastavená a že je tam asistence, kterou nepotřebuju.',
   'Já jsem Martin, mám eseróčko na strojírenství, dvanáct zaměstnanců. Vyděláváme s manželkou dohromady sto čtyřicet tisíc měsíčně, ale firma do velké míry závisí na mně. Máme tři děti — sedm, deset a čtrnáct let. Mám teď životní pojistku, sjednanou před třemi lety, ale kamarádka mi řekla, že je špatně nastavená a že je tam asistenční složka, kterou nepotřebuju. Hypotéku už nemáme, byt máme zaplacený. Investujeme přes Patrii do akcií, asi pět milionů. Riziko: vypadnutí mě jako jednatele = výpadek firmy. Manželka se chce vrátit do práce za rok. Zajímá mě komplexní přepočet pojistné ochrany a doplnění invalidní renty.',
   'cs', 'whisper-1', 1995, 4520,
   'gpt-4o-mini', 1080, 2330, 'reconcile-v1.0'),

  -- Extracted #1 — Tomáš Dvořák × Lucie Krejčí (mladá single)
  ('00000000-0000-0000-0000-cb0000000004',
   '00000000-0000-0000-0000-de0000000004',
   'Já jsem Lucie, je mi třiatřicet, nezadaná, žádné děti. Pracuju jako marketing manager, vydělávám čtyřicet devět čistého. Plánuju koupit byt do dvou let. Pojištění žádné nemám, jenom od zaměstnavatele povinné. Zajímalo by mě, jestli něco potřebuju a hlavně kolik bych si měla spořit, abych si mohla dovolit hypotéku.',
   'Já jsem Lucie, je mi třiatřicet, nezadaná, žádné děti. Pracuju jako marketing manager, vydělávám čtyřicet devět čistého. Plánuju koupit byt do dvou let. Pojištění žádné nemám, jenom od zaměstnavatele povinné. Zajímalo by mě, jestli něco potřebuju a hlavně kolik bych si měla spořit, abych si mohla dovolit hypotéku.',
   'Já jsem Lucie, je mi třiatřicet, nezadaná, žádné děti. Pracuju jako marketing manager, vydělávám čtyřicet devět tisíc čistého měsíčně. Plánuju koupit byt v Praze do dvou let, počítám s cenou kolem šesti milionů. Pojištění žádné nemám, jenom od zaměstnavatele povinné úrazové. Zajímalo by mě, jestli něco potřebuju a hlavně kolik bych si měla měsíčně odkládat, abych si mohla dovolit hypotéku za dva roky. Aktuálně mám na účtu sto padesát tisíc, žádné investice, žádné stavební spoření. Dovolená dvakrát ročně, jinak nemám velké výdaje.',
   'cs', 'whisper-1', 1660, 3690,
   'gpt-4o-mini', 870, 1980, 'reconcile-v1.0'),

  -- Extracted #2 — Martin Procházka × Robert Kučera (bankéř)
  ('00000000-0000-0000-0000-cb0000000005',
   '00000000-0000-0000-0000-de0000000005',
   'Robert Kučera, čtyřicet, ženatý, dvě děti šest a devět. Pracuju jako produktový bankéř, beru osmdesát jedna čistého. Manželka je zubařka, bere podobně. Hypotéku máme tři miliony, splácíme devatenáct. Z banky mám životko, doplňkové penzijko a investice — celkem mi z výplaty ukrojí asi devět tisíc měsíčně.',
   'Robert Kučera, čtyřicet, ženatý, dvě děti šest a devět. Pracuju jako produktový bankéř, beru osmdesát jedna čistého. Manželka je zubařka, bere podobně. Hypotéku máme tři miliony, splácíme devatenáct. Z banky mám životko, doplňkové penzijko a investice — celkem mi z výplaty ukrojí asi devět tisíc měsíčně.',
   'Robert Kučera, čtyřicet let, ženatý, dvě děti — šest a devět. Pracuju jako produktový bankéř, beru osmdesát jedna tisíc čistého měsíčně. Manželka je zubařka, vydělává podobně. Hypotéku máme tři miliony, splácíme devatenáct tisíc měsíčně. Z banky mám životní pojištění, doplňkové penzijní spoření a investiční portfolio — celkem mi z výplaty ukrojí asi devět tisíc měsíčně. Předpokládám, že to není ideální nastavení, ale jako bankéř mám nárok na zvýhodněné podmínky. Chci nezávislý pohled — jestli platím za servis nebo za skutečnou ochranu.',
   'cs', 'whisper-1', 2080, 4670,
   'gpt-4o-mini', 1020, 2240, 'reconcile-v1.0'),

  -- Transcribing #1 — Karel × Markéta Horáková (live only, partial)
  ('00000000-0000-0000-0000-cb0000000006',
   '00000000-0000-0000-0000-de0000000006',
   'Dobrý den, jsem Karel Novák. Můžeme začít tím že mi povíte něco o sobě? No tak já jsem Markéta, je mi sedmadvacet, dělám juniorku ve vývojářské firmě, tři měsíce po nástupu. Beru asi třicet dva tisíc čistého. Bydlím v podnájmu, platím dvanáct',
   null,
   null,
   'cs', null, null, null, null, null, null, null);

-- =============================================================================
-- 7. extractions — for ready (3) + extracted (2) meetings
-- =============================================================================

insert into public.extractions
  (id, meeting_id, transcript_id, structured_data,
   model, tokens_used, latency_ms, prompt_version)
values
  ('00000000-0000-0000-0000-ed0000000001',
   '00000000-0000-0000-0000-de0000000001',
   '00000000-0000-0000-0000-cb0000000001',
   jsonb_build_object(
     'full_name', 'Jan Novotný',
     'age', 41,
     'monthly_income_czk', 65000,
     'partner_monthly_income_czk', 45000,
     'household_monthly_income_czk', 110000,
     'marital_status', 'married',
     'has_children', true,
     'children', jsonb_build_array(
       jsonb_build_object('age', 8),
       jsonb_build_object('age', 11)
     ),
     'mortgage_remaining_czk', 3800000,
     'mortgage_payment_czk', 27000,
     'existing_insurance', jsonb_build_array('povinné ručení','havarijní'),
     'savings_monthly_czk', 2000,
     'savings_vehicle', 'podílový fond',
     'savings_goal_text', 'Větší byt nebo dům za městem za 5 let',
     'recommended_savings_czk', 8000,
     'main_concern', 'Splacení hypotéky a zajištění dětí v případě výpadku příjmu',
     'risk_appetite', 'conservative'
   ),
   'gpt-4o', 1840, 3320, 'extract-v1.0'),

  ('00000000-0000-0000-0000-ed0000000002',
   '00000000-0000-0000-0000-de0000000002',
   '00000000-0000-0000-0000-cb0000000002',
   jsonb_build_object(
     'full_name', 'Tomáš Procházka',
     'age', 38,
     'monthly_income_czk', 72000,
     'partner_monthly_income_czk', 0,
     'household_monthly_income_czk', 72000,
     'marital_status', 'married',
     'has_children', true,
     'children', jsonb_build_array(
       jsonb_build_object('age', 4),
       jsonb_build_object('age', 6)
     ),
     'mortgage_remaining_czk', 4000000,
     'mortgage_payment_czk', 23000,
     'existing_insurance', jsonb_build_array(),
     'savings_monthly_czk', 3000,
     'savings_vehicle', 'ETF',
     'savings_goal_text', 'Stavba chaty a soukromá škola pro děti během 5 let',
     'recommended_savings_czk', 9000,
     'main_concern', 'Smrt živitele rodiny',
     'risk_appetite', 'moderate'
   ),
   'gpt-4o', 2110, 3580, 'extract-v1.0'),

  ('00000000-0000-0000-0000-ed0000000003',
   '00000000-0000-0000-0000-de0000000003',
   '00000000-0000-0000-0000-cb0000000003',
   jsonb_build_object(
     'full_name', 'Martin Tichý',
     'age', 47,
     'monthly_income_czk', 92000,
     'partner_monthly_income_czk', 48000,
     'household_monthly_income_czk', 140000,
     'marital_status', 'married',
     'has_children', true,
     'children', jsonb_build_array(
       jsonb_build_object('age', 7),
       jsonb_build_object('age', 10),
       jsonb_build_object('age', 14)
     ),
     'mortgage_remaining_czk', 0,
     'mortgage_payment_czk', 0,
     'existing_insurance', jsonb_build_array('životní pojištění (3 roky)'),
     'savings_monthly_czk', 15000,
     'savings_vehicle', 'akcie přes Patrii',
     'investment_assets_czk', 5000000,
     'savings_goal_text', 'Doplnění ochrany a invalidní renty pro jednatele',
     'recommended_savings_czk', 18000,
     'main_concern', 'Výpadek jednatele = ohrožení firmy a rodiny',
     'risk_appetite', 'aggressive'
   ),
   'gpt-4o', 1980, 3450, 'extract-v1.0'),

  ('00000000-0000-0000-0000-ed0000000004',
   '00000000-0000-0000-0000-de0000000004',
   '00000000-0000-0000-0000-cb0000000004',
   jsonb_build_object(
     'full_name', 'Lucie Krejčí',
     'age', 33,
     'monthly_income_czk', 49000,
     'household_monthly_income_czk', 49000,
     'marital_status', 'single',
     'has_children', false,
     'children', jsonb_build_array(),
     'mortgage_remaining_czk', 0,
     'savings_balance_czk', 150000,
     'existing_insurance', jsonb_build_array('povinné úrazové od zaměstnavatele'),
     'savings_monthly_czk', 0,
     'savings_goal_text', 'Koupě bytu v Praze za cca 6M Kč do 2 let',
     'recommended_savings_czk', 12000,
     'main_concern', 'Schopnost utáhnout budoucí hypotéku',
     'risk_appetite', 'moderate'
   ),
   'gpt-4o', 1690, 2980, 'extract-v1.0'),

  ('00000000-0000-0000-0000-ed0000000005',
   '00000000-0000-0000-0000-de0000000005',
   '00000000-0000-0000-0000-cb0000000005',
   jsonb_build_object(
     'full_name', 'Robert Kučera',
     'age', 40,
     'monthly_income_czk', 81000,
     'partner_monthly_income_czk', 80000,
     'household_monthly_income_czk', 161000,
     'marital_status', 'married',
     'has_children', true,
     'children', jsonb_build_array(
       jsonb_build_object('age', 6),
       jsonb_build_object('age', 9)
     ),
     'mortgage_remaining_czk', 3000000,
     'mortgage_payment_czk', 19000,
     'existing_insurance', jsonb_build_array(
       'životní pojištění (banka)',
       'doplňkové penzijní spoření',
       'investiční portfolio (banka)'
     ),
     'existing_insurance_monthly_cost_czk', 9000,
     'savings_goal_text', 'Audit existujícího nastavení a optimalizace',
     'recommended_savings_czk', 9000,
     'main_concern', 'Předražený servis vs. reálná ochrana',
     'risk_appetite', 'moderate'
   ),
   'gpt-4o', 2050, 3610, 'extract-v1.0');

-- =============================================================================
-- 8. calculations — only for the 3 ready meetings (offer pipeline)
-- =============================================================================

insert into public.calculations
  (id, meeting_id, extraction_id, results, calculator_version)
values
  ('00000000-0000-0000-0000-ca0000000001',
   '00000000-0000-0000-0000-de0000000001',
   '00000000-0000-0000-0000-ed0000000001',
   jsonb_build_object(
     'coverage_recommended_czk', 4500000,
     'coverage_existing_czk', 0,
     'coverage_gap_czk', 4500000,
     'monthly_premium_czk', 1850,
     'monthly_savings_recommended_czk', 8000,
     'monthly_savings_existing_czk', 2000,
     'monthly_savings_gap_czk', 6000,
     'pillars', jsonb_build_object(
       'protection', 1850,
       'savings', 6000,
       'investment', 2000
     )
   ),
   'calc-v1.0'),

  ('00000000-0000-0000-0000-ca0000000002',
   '00000000-0000-0000-0000-de0000000002',
   '00000000-0000-0000-0000-ed0000000002',
   jsonb_build_object(
     'coverage_recommended_czk', 5000000,
     'coverage_existing_czk', 0,
     'coverage_gap_czk', 5000000,
     'monthly_premium_czk', 2200,
     'monthly_savings_recommended_czk', 9000,
     'monthly_savings_existing_czk', 3000,
     'monthly_savings_gap_czk', 6000,
     'pillars', jsonb_build_object(
       'protection', 2200,
       'savings', 6000,
       'investment', 3000
     )
   ),
   'calc-v1.0'),

  ('00000000-0000-0000-0000-ca0000000003',
   '00000000-0000-0000-0000-de0000000003',
   '00000000-0000-0000-0000-ed0000000003',
   jsonb_build_object(
     'coverage_recommended_czk', 8000000,
     'coverage_existing_czk', 3000000,
     'coverage_gap_czk', 5000000,
     'monthly_premium_czk', 3400,
     'monthly_savings_recommended_czk', 18000,
     'monthly_savings_existing_czk', 15000,
     'monthly_savings_gap_czk', 3000,
     'pillars', jsonb_build_object(
       'protection', 3400,
       'invalidity_pension', 1500,
       'savings', 3000,
       'investment', 15000
     )
   ),
   'calc-v1.0');

-- =============================================================================
-- 9. offers — 3 from ready meetings + 2 standalone (for variety on Nabídky list)
-- =============================================================================

insert into public.offers
  (id, tenant_id, advisor_id, customer_id, meeting_id,
   pdf_url, generated_text, model, status, created_at)
values
  ('00000000-0000-0000-0000-bf0000000001',
   '00000000-0000-0000-0000-00000000f1f1',
   '00000000-0000-0000-0000-ad0000000001',
   '00000000-0000-0000-0000-ce0100000001',
   '00000000-0000-0000-0000-de0000000001',
   'https://example.com/placeholder.pdf',
   'Vážený pane Novotný, na základě naší schůzky doporučujeme zajistit hypotéku rizikovým životním pojištěním ve výši 4 500 000 Kč a navýšit pravidelné spoření na 8 000 Kč měsíčně...',
   'gpt-4o', 'sent',
   now() - interval '6 days'),

  ('00000000-0000-0000-0000-bf0000000002',
   '00000000-0000-0000-0000-00000000f1f1',
   '00000000-0000-0000-0000-ad0000000002',
   '00000000-0000-0000-0000-ce0200000001',
   '00000000-0000-0000-0000-de0000000002',
   'https://example.com/placeholder.pdf',
   'Vážený pane Procházko, vzhledem k tomu, že žijete pouze z jednoho příjmu a máte hypotéku 4 mil. Kč a dvě malé děti, doporučujeme prioritně řešit pojistnou ochranu živitele...',
   'gpt-4o', 'signed',
   now() - interval '4 days'),

  ('00000000-0000-0000-0000-bf0000000003',
   '00000000-0000-0000-0000-00000000f1f1',
   '00000000-0000-0000-0000-ad0000000004',
   '00000000-0000-0000-0000-ce0400000001',
   '00000000-0000-0000-0000-de0000000003',
   'https://example.com/placeholder.pdf',
   'Vážený pane Tichý, váš případ jednatele s.r.o. vyžaduje komplexní revizi. Doporučujeme: životní pojištění s krytím 8 mil. Kč, invalidní rentu 25 000 Kč/měsíc a optimalizaci stávajícího portfolia...',
   'gpt-4o', 'draft',
   now() - interval '2 days'),

  -- Standalone offer #1 — Petra × Veronika Králová (no meeting, advisor wrote on demand)
  ('00000000-0000-0000-0000-bf0000000004',
   '00000000-0000-0000-0000-00000000f1f1',
   '00000000-0000-0000-0000-ad0000000002',
   '00000000-0000-0000-0000-ce0200000004',
   null,
   'https://example.com/placeholder.pdf',
   'Vážená paní Králová, dle dohody zasíláme nabídku optimalizace investičního portfolia OSVČ...',
   'gpt-4o', 'draft',
   now() - interval '10 days'),

  -- Standalone offer #2 — Eva × Šárka Holubová
  ('00000000-0000-0000-0000-bf0000000005',
   '00000000-0000-0000-0000-00000000f1f1',
   '00000000-0000-0000-0000-ad0000000004',
   '00000000-0000-0000-0000-ce0400000006',
   null,
   'https://example.com/placeholder.pdf',
   'Vážená paní Holubová, posíláme upravenou nabídku s navýšením rizikové části na 3 mil. Kč...',
   'gpt-4o', 'sent',
   now() - interval '14 days');

-- =============================================================================
-- 10. analytics_events — pár ukázkových událostí pro super-admin dashboard
-- =============================================================================

insert into public.analytics_events
  (tenant_id, advisor_id, event_type, event_data)
values
  ('00000000-0000-0000-0000-00000000f1f1',
   '00000000-0000-0000-0000-ad0000000001',
   'meeting_started',
   jsonb_build_object('meeting_id','00000000-0000-0000-0000-de0000000001','capture_method','browser_live')),
  ('00000000-0000-0000-0000-00000000f1f1',
   '00000000-0000-0000-0000-ad0000000001',
   'extraction_completed',
   jsonb_build_object('meeting_id','00000000-0000-0000-0000-de0000000001','tokens_used',1840,'latency_ms',3320)),
  ('00000000-0000-0000-0000-00000000f1f1',
   '00000000-0000-0000-0000-ad0000000002',
   'offer_signed',
   jsonb_build_object('offer_id','00000000-0000-0000-0000-bf0000000002')),
  ('00000000-0000-0000-0000-00000000f1f1',
   '00000000-0000-0000-0000-ad0000000004',
   'pdf_generated',
   jsonb_build_object('offer_id','00000000-0000-0000-0000-bf0000000003','pages',3));

-- =============================================================================
-- Done.
-- Demo login credentials (all advisors): password = "demo1234"
--   bartolomej@arbey.cz       (super_admin)
--   karel.novak@4fin.cz       (advisor 1, has 8 customers + 3 meetings)
--   petra.svobodova@4fin.cz   (advisor 2, has 7 customers + 2 meetings)
--   tomas.dvorak@4fin.cz      (advisor 3)
--   eva.cerna@4fin.cz         (advisor 4)
--   martin.prochazka@4fin.cz  (advisor 5)
-- =============================================================================
