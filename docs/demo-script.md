# Demo Anny — runbook pro Lukáše

> Cíl: za **8 minut** ukázat, že Anna umí přeměnit hlasovou schůzku na hotovou PDF nabídku.

## Před spuštěním (1 min)

1. Otevřete **Chrome** (ne Safari — Safari nemá podporu live přepisu).
2. Připojte mikrofon (notebook stačí).
3. Pusťte URL: **`<vyplníme po Vercel deployi>`** (nebo lokálně `http://localhost:3000`).
4. Když prohlížeč zeptá na mikrofon, povolte.

## Demo flow (7 min)

### 1. Login (10 s)

- Vidíte stránku **Anna** s pěti poradci.
- Klikněte **Karel Novák**.
- → otevře se **Dnes** dashboard.

### 2. Tour aplikace (40 s)

- Levý sidebar: **Dnes**, **Schůzky**, **Zákazníci**, **Nabídky**, **Profil**.
- Pravý sidebar: **AI asistent Anna** — chat funguje, můžete se zeptat (např. „Co se obvykle ptáš nového klienta?“).
- Sekce **Brzy**: Newsletter, Pojištění, Kalendář, CRM, Knowledge base — všechno s vlastním vývojovým horizontem (Q2 / Q3 / Q4 2026).

### 3. Nahrání schůzky (3 min — **hlavní moment**)

- **Schůzky** → **Nová schůzka**.
- Vyberte zákazníka (např. první v seznamu).
- Záložka **Nahrát teď ze schůzky** → klikněte **Začít nahrávat**.
- Mluvte cca 30–45 vteřin. Tip — vejde se do reálných dat:

  > „Máme tady pana Nováka, je mu třicet pět let, pracuje jako IT specialista,
  > vydělává čtyřicet tisíc měsíčně čistého. Je ženatý, dvě děti.
  > Hypotéku má, splátka osm tisíc. Spoří si na vzdělání dětí,
  > horizont deset let, raději vyvážený mix.“

- Pod tlačítkem se v reálném čase objevuje **live přepis** (Web Speech API, čeština).
- Klikněte **Zastavit**.
- Stav schůzky postupně přechází: **Nahráno → Přepisujeme → Slaďujeme přepis → Vytahujeme data → Vytváříme nabídku → Hotovo**.
- Trvá to 30–60 vteřin podle latence OpenAI.

### 4. Výsledek (2 min)

Otevře se detail schůzky:

- **Status pill**: Hotovo (zelený).
- **Audio přehrávač** s nahrávkou.
- **Finální přepis** (sjednocený z live + Whisper, vyčištěný).
- **Strukturovaná data** — přesně co potřebujete do excelu 4FIN: jméno, věk, povolání, příjem, hypotéka, cíl, horizont, risk profil. Každé pole zvlášť, žádný JSON, žádný surový text.
- **PDF nabídka** — embedded preview vpravo. Klikněte **Stáhnout PDF**.

PDF obsahuje: cover, info o zákazníkovi, finanční situaci, cíle, **AI-generovaný úvodní odstavec**, doporučené produkty s měsíčními částkami a zdůvodněním, signature line.

### 5. Co je „pod kapotou“ (1 min — pokud je čas)

- **Multi-tenant**: každý poradce vidí jen svoje zákazníky (RLS na úrovni Postgresu).
- **Sběr dat**: každá interakce se loguje do `analytics_events` — to je palivo na vlastní fine-tuning model do 6 měsíců.
- **Admin panel** (jen pro Bartoloměje a vás) — `/admin` URL — souhrnný dashboard.

## Pojistka — pokud něco selže

- **OpenAI nedostupné / pomalé**: v sidebaru Schůzky najdete **3 přednahrané schůzky se statusem Hotovo**. Klikněte na libovolnou — uvidíte plný výstup pipeline bez živého volání.
- **Mikrofon nezachytává**: přepněte na záložku **Nahrát soubor** a přetáhněte připravený `.m4a` z `tests/fixtures/demo-audio.m4a` (pokud ho připravíme).
- **Live přepis nefunguje**: na Safari Chrome je Web Speech omezený. UI pak ukáže notifikaci a pokračuje jen s Whisper transkripcí (post-recording, +20 s).

## Co teď chybí (transparentní)

- **Hardcoded kalkulátor** — vrací rozumná, ale fiktivní čísla. Reálná logika 4FIN přijde, jakmile dorazí Excel spec.
- **Email odesílání nabídek** — ne, jen PDF download. Resend integrace v Q2.
- **Branding upload** — primary color picker funguje, logo upload je v profilu vypnutý (Q2).
- **Mobile** — desktop-first; mobilní layout přijde po validaci.

## Otázky pro Lukáše po demu

1. Která pole v extrakci vám chybí? (přidáme je do schématu — ladíme)
2. Vidíte se v tom, že tohle nahradí váš Excel?
3. Které moduly z **Brzy** sekce mají nejvyšší prioritu pro 4FIN?
4. Můžeme dostat Excel kalkulátoru, abychom nahradili placeholder?
