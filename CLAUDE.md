@AGENTS.md

# Anna — Project Context

> Tento soubor je hlavním referenčním zdrojem pro všechny budoucí Claude Code sessions na tomto projektu. Před jakoukoliv prací si pročti relevantní sekci.

---

## 1. PROJECT OVERVIEW

**Anna** je multi-tenant SaaS platforma pro finanční poradce.

**První tenant:** 4FIN HOLDING (1 400 poradců, 25 mld AUM v ČR).

**Cíl:** automatizovat celý workflow finančního poradce — od akviziční schůzky přes zpracování dat až po PDF nabídku pro klienta.

### První spuštěný modul: AI naslouchač schůzek

```
Audio (live nebo upload)
  → Whisper transkripce
  → GPT-4o extrakce (struktura 4FIN excelu)
  → Hardcoded kalkulátor (plnění/krytí)
  → AI generuje text
  → PDF nabídka pro klienta
```

---

## 2. TERMINOLOGIE

> **DŮLEŽITÉ — NIKDY neměnit. Tohle je jazyková smlouva s uživateli.**

| Pojem | Význam |
|-------|--------|
| **Tenant** | poradenská síť (4FIN, OVB později, Partners později) |
| **Klient** | poradce v rámci sítě (uživatel platformy, ten, kdo platí předplatné) |
| **Zákazník** | klient poradce (koncový spotřebitel finančních produktů) |
| **Super-admin** | Bartoloměj Rota a Lukáš Gašník (zakladatelé) |

**Pravidla:**

- NIKDY neměň „klient" za „user" nebo „advisor" v UI ani v user-facing kódu
- V databázi mohou být anglické názvy (`advisors`, `customers`)
- UI je vždy v češtině s touto terminologií

---

## 3. TECH STACK

| Vrstva | Technologie |
|--------|-------------|
| Framework | **Next.js 16** (App Router, TypeScript strict) |
| Backend | **Supabase** (PostgreSQL + Auth + Storage + Realtime) |
| AI — transkripce | **OpenAI Whisper-1** |
| AI — extrakce | **OpenAI GPT-4o** |
| AI — lehké tasky | **OpenAI GPT-4o-mini** |
| Styling | **Tailwind CSS** + **shadcn/ui** (customizované, ne defaulty) |
| Hosting | **Vercel**, EU region |
| Email | **Resend** (později) |
| Forms | **React Hook Form** + **Zod** |
| Ikony | **Lucide-react** |
| Animace | **Framer Motion** (mikro-animace) |
| PDF | **pdf-lib** nebo **react-pdf** |

> Next.js 16 má breaking changes oproti tréninkovým datům — vždy si přečti relevantní guide v `node_modules/next/dist/docs/` před psaním kódu. (Viz `AGENTS.md`.)

---

## 4. ARCHITEKTURA — MULTI-TENANT

### 3-úrovňová struktura

| Úroveň | Entita | Příklad |
|:---:|--------|---------|
| 1 | **Tenant** (poradenská síť) | 4FIN, OVB, Partners |
| 2 | **Klient** (poradce) | Karel Novák v 4FIN |
| 3 | **Zákazník** (klient poradce) | Pan Novotný u Karla |

### Dva nezávislé auth systémy

1. **Auth pro klienty (poradce)**
   - Login bez hesla pro demo
   - Magic link pro produkci
2. **Auth pro zákazníky**
   - Separátní zákaznická zóna
   - Vstupují s pozvánkou od svého poradce

### Row-Level Security (RLS) — povinné

VŠECHNY tabulky v DB MUSÍ mít RLS policies:

- **Klient** → vidí jen své zákazníky
- **Admin sítě** → vidí všechny klienty v síti
- **Super-admin** → vidí vše
- **Zákazník** → vidí jen svá data

---

## 5. DESIGN SYSTEM

Anna není dashboard. Není CRM. Není SaaS template. Anna je AI nástroj pro práci finančního poradce s vlastním vizuálním jazykem.

Inspirace: Granola.ai (invisible AI, function-first), Linear (custom design language), Stripe Dashboard (editorial typography), Apple Notes (žádné ikonky u textu, hierarchie přes typografii).

Anti-inspirace: shadcn dashboard templates, Vercel v0 outputs, generic SaaS apps.

### 5.1 BANNED PATTERNS (porušení = re-do)

ABSOLUTNĚ ZAKÁZÁNO:

**Typografie:**
- ❌ font Inter
- ❌ font Geist (overused v AI workflow 2025-2026)
- ❌ system-sans (vágnost)
- ❌ font-weight 400 pro nadpisy (musí být 500+)
- ❌ tracking default (vždy explicitní `tracking-tight` nebo `tracking-tighter` na display textu)

**Barvy:**
- ❌ purple-to-blue gradients (`#6366f1` → `#8b5cf6`)
- ❌ shadcn defaults (slate-*, zinc-*, neutral-*)
- ❌ blue-500 jako primary action
- ❌ neon barvy
- ❌ gradient backgrounds anywhere
- ❌ dva accent colors najednou

**Layout:**
- ❌ centered hero sections
- ❌ bento grids
- ❌ 3-sloupcový layout (sidebar | main | rail) jako default
- ❌ cards s shadow-sm/md/lg
- ❌ symmetric padding všude (8/8/8/8)
- ❌ p-8 jako default

**Ikony:**
- ❌ Lucide-react v menu položkách
- ❌ Heroicons
- ❌ Ikony u každého nadpisu
- ❌ Ikony u každého sidebar item
- ❌ stroke-width 1.5 (default Lucide look)

**Komponenty:**
- ❌ shadcn Card s default props
- ❌ shadcn Button s default variants
- ❌ kulaté avatary s iniciálami v top-right
- ❌ rounded-xl/2xl všude bez rozmyslu

**Interakce:**
- ❌ spinners pro loading states (skeletons only)
- ❌ "No items yet" empty states
- ❌ toast notifications pro errors (inline only)
- ❌ "Get started by..." copy

**Copy:**
- ❌ "AI-powered" cokoliv
- ❌ helpful subtitle pod každým nadpisem
- ❌ suggested prompts u AI inputu
- ❌ ChatGPT-style prose ("Anna automaticky...", "Vyberte X a...")
- ❌ "[Bot name] — [bot description]" empty state pattern

### 5.2 TYPOGRAFIE (explicitní)

**Font family:**
```css
/* General Sans od Fontshare — anti-slop, free, character */
@import url('https://api.fontshare.com/v2/css?f[]=general-sans@200,300,400,500,600,700&display=swap');

font-family: 'General Sans', -apple-system, sans-serif;
```

**Type scale:**
```
Display (page hero):    52px / line-height 1.05 / font-weight 500 / tracking -0.02em
H1 (section):           36px / line-height 1.1  / font-weight 500 / tracking -0.015em
H2 (subsection):        24px / line-height 1.2  / font-weight 500 / tracking -0.01em
H3 (card title):        18px / line-height 1.3  / font-weight 500 / tracking 0
Body large:             17px / line-height 1.5  / font-weight 400 / tracking 0
Body:                   15px / line-height 1.5  / font-weight 400 / tracking 0
Body small:             13px / line-height 1.4  / font-weight 400 / tracking 0
Caption:                12px / line-height 1.3  / font-weight 500 / tracking 0.02em / uppercase
Mono:                   14px / 'JetBrains Mono' (jen pro code, transcripts, metrics)
```

**Pravidla:**
- Display text MÁ tracking-tighter (-0.02em). Nikdy default.
- Caption text MÁ tracking-wide (0.02em) + uppercase + font-weight 500. Použít sparingly — sekce labels, status pills.
- Body NIKDY uppercase.
- max-width pro reading copy: 65ch.
- font-weight 600+ jen pro vizuální důraz, ne pro nadpisy. Hero = 500, nikdy 700.

### 5.3 BARVY (explicitní hex, žádné popisy)

```css
/* Background — vrstvená cream */
--bg-canvas:        #FAF6F0;  /* hlavní pozadí, warm cream */
--bg-surface:       #FFFFFF;  /* cards, modals — pure white pro kontrast */
--bg-subtle:        #F2EBE0;  /* hover states, secondary surfaces */
--bg-inset:         #E8DFCF;  /* nested surfaces, code blocks */

/* Borders */
--border-subtle:    #E5DCC9;  /* default border */
--border-default:   #C9BCA1;  /* normal border */
--border-strong:    #1A1A1A;  /* emphasized border (focus, active) */

/* Text */
--text-primary:     #1A1A1A;
--text-secondary:   #5A5045;
--text-tertiary:    #8C8276;
--text-disabled:    #B5AB99;

/* Accent — wine, jediný akcent v UI */
--accent:           #6B1F2E;
--accent-hover:     #561620;
--accent-muted:     rgba(107,31,46,0.10);  /* featured tool cards, badge backgrounds */
--accent-text:      #FAF6F0;

/* Functional */
--success:          #2F5237;
--warning:          #8C6914;
--error:            #6B1F2E;  /* sdílí wine s accent — finanční serioznost, ne agresivní červená */

/* Functional backgrounds (10% alpha) */
--success-bg:       rgba(47,82,55,0.10);
--warning-bg:       rgba(140,105,20,0.10);
--error-bg:         rgba(107,31,46,0.10);
```

**Pravidla:**
- Wine `--accent` je JEDINÝ akcent v UI. Žádný druhý.
- `--accent-muted` jen pro: featured tool-card pozadí, "Q* 2026" badge backgrounds. Ne hover (hover = border darkening).
- Background hierarchie přes 4 vrstvy cream (canvas → surface → subtle → inset). To je hierarchie, ne shadow.
- ŽÁDNÉ shadows. Hierarchie přes background contrast a border, ne stíny.

### 5.4 LAYOUT — LAUNCHPAD ARCHITEKTURA

**Anti-pattern:** sidebar | main | rail dashboard. Nikdy.

**Pattern:** topbar (slim) + main (full-width, scrollable). Žádný sidebar. Navigace přes home launchpad + ⌘K command palette.

```
┌──────────────────────────────────────────────────────────┐
│ Anna  /  Schůzky                          ⌘K  Karel ▾    │ ← 64px topbar, border-b
├──────────────────────────────────────────────────────────┤
│                                                            │
│         <main, max-width 1280px, scrollable>              │
│                                                            │
└──────────────────────────────────────────────────────────┘

⌘K          → Command palette modal (640px, centered)
Asistent    → Modal (640×640, centered) — NE rail
```

**Grid systém:**
- Base unit: 4px
- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128
- ŽÁDNÉ vlastní pixel hodnoty mimo scale.
- Vertical rhythm mezi sekcemi na home: 96px.

**Topbar (64px height):**
- Bg-canvas (splývá s mainem, jen border-b odděluje)
- Vlevo: "Anna" text logo (h3 size, font-medium, link na `/dashboard`) + breadcrumb (jen mimo home — `/` separator + page title v text-secondary)
- Vpravo: ⌘K trigger ("Hledat" + kbd) → otvírá **palette** (NE asistenta) + advisor dropdown (text + caret, žádný kruh s iniciálami)

**Home launchpad (`/dashboard`):**
- 4 sekce, vertical rhythm 96px:
  1. **Hero greeting** — display 56px tracking-tight, time-based ("Dobré ráno, Karle")
  2. **Tvoje aktivita** — 3 stat cards (poslední schůzka, týden, posl. nabídka)
  3. **Tvoje nástroje** — launchpad grid 3 sloupce (Naslouchač featured, pak ostatní)
  4. **Brzy dostupné** — launchpad grid 3 sloupce, disabled + Q* badge

**Tool card (launchpad):**
- Full-grid sloupec (~360px), výška ~200px
- Padding 28px, border-radius 16px, border 1px subtle
- Hover: border accent + translate-y(-1px), 180ms ease-out-quart
- **Custom SVG ikona 48px** wine accent, vlevo nahoře (NE Lucide, NE Heroicons, NE Phosphor v tool-card pozici)
- Title 20px (h3) font-medium tracking-tight
- Description 14px (body-sm) text-secondary, 2 lines max
- **Featured** varianta: bg-accent-muted (wine wash, ne hover state)
- **Disabled** varianta: opacity 0.5, ikona text-tertiary, badge "Q* 2026" top-right (bg-accent-muted, text-accent, 11px tracking-wide)

**Activity card (stat):**
- bg-surface, border-subtle, padding 24px, radius 12px
- Title 12px caption uppercase tracking-wide text-tertiary
- Value `.text-stat` (32px font-medium tracking-tight) NEBO h3 (20px) pro jméno
- Subtitle pod value: 13px text-secondary
- Hover border-default (jen pokud clickable)

**Command palette (⌘K):**
- Otvírá ⌘K. Toggle (druhý ⌘K zavírá).
- Max-width 640px, vertically centered, overlay bg-black/15
- bg-surface, radius 16px, border-default, fade-scale-in 180ms
- Search input 56px, padding 0 24px, font-size 18px, placeholder "Co hledáš?", border-b subtle
- Results 480px max-height, scrollable
- Result item 44px, padding 0 24px, hover bg-subtle
- Sekce (cmdk groups): Nástroje, Zákazníci, Schůzky, AI Asistent
- "Zeptej se Anny" item: zavře palette + otevře asistenta s prefilled query

**Asistent modal:**
- Otvírá: home tool card "Asistent" NEBO "Zeptej se Anny" v palette
- NIKDY ⌘K (⌘K je palette)
- Centered, 640×640, bg-surface, radius 16px, border-default
- ESC nebo close ikona zavírá
- Wraps existující `AiAsistentChat` komponentu

**Cards (obecné):**
- Border 1px `--border-subtle`, ne shadow
- Padding 24px (default) / 28px (tool card)
- Border-radius 12px (default) / 16px (tool card, modal, palette)
- Background `--bg-surface` (white) na canvas (cream)
- Hover state: `--border-default`

**Buttons:**
- Primary: bg `--accent` (wine), text `--accent-text`, height 40px, radius 8px, padding 0 16px, font-weight 500
- Secondary: border 1px `--border-default`, bg transparent, text `--text-primary`
- Ghost: text only, bg transparent, hover bg-subtle
- Žádné rounded-full, ne rounded-xl
- Active state: scale-[0.98]

**Inputs:**
- Border 1px `--border-default`, bg `--bg-surface`
- Height 40px, padding 0 12px
- Border-radius 8px
- Focus: border `--accent` (wine, 2px subtle ring)

### 5.5 IKONY

**Žádné Lucide v sidebar menu.**

Tam, kde ikony POUŽIJEME:
- Statusy v meeting list (mikrofon = recording, hodiny = processing, atd.)
- Action buttons s textem (toolbar v meeting detail)
- Empty state ilustrace (1 hero ikona, NE ozdobně)

Když potřebujeme ikony, použít **Phosphor Icons** v `regular` weight (ne `bold`, ne `fill`):

```bash
npm install @phosphor-icons/react
```

```jsx
import { Microphone, Clock, FileText } from '@phosphor-icons/react';
<Microphone size={18} weight="regular" />
```

**Pravidla:**
- Velikost 16-20px max
- Color: `--text-secondary`, ne primary
- Stroke 1.5 default Phosphor (anti-Lucide)

### 5.6 INTERAKCE

**Loading states:**
- Skeletons matching real layout (ne spinners)
- Skeleton bg: `--bg-subtle` s subtle pulse animation (1.5s ease-in-out)

**Empty states:**
- Composed: 1 řádek nadpisu + 1 řádek instrukce + 1 action button
- Žádné "No items yet" — místo toho akční formulace ("Žádná schůzka tento týden. Naplánovat novou?")
- Empty state má max 3 prvky: nadpis, popis, akce

**Errors:**
- Inline pod input fieldem v `--error` text, ne toast
- Form-level errors v `--error-bg` boxu nahoře formuláře

**Animace:**
- POUZE: opacity (fade), transform (slide, scale)
- NIKDY: width, height, top, left animace
- Duration: 150-250ms pro micro-interactions, 300-400ms pro page transitions
- Easing: `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out-quart, smooth)
- Active state na buttons: `scale(0.98)`, žádný "lift"

### 5.7 COPY (anti-AI-slop)

**Empty states — patterns BANNED:**
- ❌ "[Thing name] — [thing description]"
- ❌ "Get started by..."
- ❌ "You don't have any [X] yet"
- ❌ "Welcome to [product]! Here's what you can do..."

**Empty states — patterns GOOD:**
- ✅ Akční formulace: "Žádná schůzka tento týden. Naplánovat?"
- ✅ Žádný subtitle pod hlavním nadpisem akčních stránek

**Buttons:**
- Sloveso v 1. osobě nebo imperative: "Nahrát", "Uložit", "Začít" (ne "Klikněte zde pro...")
- Krátké: 1-3 slova max

**AI asistent:**
- Empty state = jen input s placeholderem "Napište zprávu"
- ŽÁDNÉ suggested prompts ("Shrň schůzku...", "Co se obvykle ptám...")
- ŽÁDNÝ bio header ("Anna — AI asistent finančního poradce")
- AI se otevírá přes ⌘K, ne pořád v rail

**Formuláře:**
- Žádné helpful prose mezi polma
- Labels nad inputy, krátké
- Placeholder text je příklad (ne instrukce)

### 5.8 SOUND CHECK — slop detection

Před commitem komponenty si polož tyto otázky:

1. Vypadá to jako **konkrétní jiný produkt** (Granola, Linear, Stripe), nebo jako **average dashboard**?
2. Je tam Lucide ikonka u textu menu položky? → **slop, fix**
3. Je tam helpful subtitle pod nadpisem akce? → **slop, vyhodit**
4. Jsou tam suggested prompts u AI inputu? → **slop, vyhodit**
5. Je font Inter, Geist nebo system-sans? → **slop, fix na General Sans**
6. Jsou tam dva accent colors? → **slop, jeden**
7. Je tam shadow na cards? → **slop, border místo**
8. Je tam centered hero? → **slop, left-aligned**
9. Je tam "AI-powered" v copy? → **slop, vyhodit**
10. Vidíš purple/blue gradient? → **slop, smazat**

Pokud na 2+ otázek "ano" → komponenta není shippable.

---

## 6. KÓDOVÉ KONVENCE

- **TypeScript strict mode** — nikdy `any`
- **Server Components default** — Client Components jen pro interaktivitu
- **Server Actions** pro mutace (ne API routes, pokud to není nutné)
- **Zod schemas** pro VŠECHNY user inputs
- **Error handling:** try/catch + user-friendly **české** messages
- **Naming:**
  - `camelCase` — proměnné a funkce
  - `PascalCase` — komponenty
  - `kebab-case` — soubory
- **Jazyk:**
  - České UI texty
  - Anglické proměnné/funkce/komentáře v kódu
- **Žádný `localStorage` na client side** — používej Supabase session management

---

## 7. WORKFLOW PRAVIDLA

| Kdy | Co |
|-----|-----|
| Před každou novou feature | Plan mode (`Shift+Tab` dvakrát) → naplánovat → schválit → provést |
| Paralelní práce | Subagenty (`frontend-builder`, `supabase-expert`, `code-reviewer`) |
| Po každé Write/Edit na `.ts` souboru | Typecheck: `npx tsc --noEmit` |
| Po každé DB změně | Regenerovat types: `npx supabase gen types typescript` |
| Po změně EFA matematiky | `npm run test:parity` (20/20 musí projít) |
| Před commitem | Lint + typecheck + RLS test |

**EFA matematika je 1:1 s Excelem.** Logika v `src/lib/calculator/finplan/calculations.ts` musí přesně odpovídat „Metodika výpočtu zajištění 2025.xlsx". Parity test je v `scripts/efa-excel-parity.mjs` — porovná 20 hodnot (Smrt × Inv.I/II/III pro celkové výdaje / nutné výdaje / příjem rodiny, plus mezivýpočty CF). Pokud změníš vzorce nebo defaulty v `calculations.ts`, MUSÍŠ zároveň aktualizovat mirror v parity scriptu. **Žádné magic numbers** (73/27 split, /0.72 income ratio) — všechno musí vycházet z AI-driven kategorizace v `extract-documents.ts` (rich breakdown) nebo z Excel parametrů.

---

## 8. DATOVÁ SBĚRNÁ VRSTVA

> **Kritické pro budoucnost.** Anna sbírá data pro fine-tuning vlastního modelu.

**Sbíráme:**

- Všechny audio nahrávky (s opt-in)
- Všechny transkripce
- Všechny extrahované JSON struktury
- Zpětnou vazbu poradce na kvalitu extrakce
- Všechny vygenerované PDF
- Engagement metriky

**Storage:**

- Tabulka `analytics_events` (PostgreSQL)
- Supabase Storage (audio, PDF)

**Admin panel** pro Bartoloměje má dashboard nad těmito daty.

---

## 9. SCOPE FOR FIRST PROTOTYPE (do zítra)

### Funkční moduly

1. **Login bez hesla** — 5 demo poradců
2. **Today / Dashboard**
3. **Schůzky** (s naslouchačem)
4. **Zákazníci** (list + detail)
5. **Nabídky** (list všech PDF)
6. **Profil poradce** (branding)
7. **AI asistent** (sidebar chat)
8. **Admin panel**

### Placeholder moduly (UI, ale not functional)

| # | Modul | Etiketa |
|---|-------|---------|
| 9 | Newsletter | Q3 2026 |
| 10 | Pojištění (Direct API) | Q2 2026 |
| 11 | Kalendář | Q3 2026 |
| 12 | Smart inbox | Q3 2026 |
| 13 | CRM | Q4 2026 |
| 14 | Knowledge base | Q4 2026 |
| 15 | Klientská zóna pro zákazníky | Q2 2026 |

---

## 10. FOUNDERS

| Jméno | Role | Kontakt |
|-------|------|---------|
| **Bartoloměj Rota** | CTO, Harotas s.r.o. | bartolomej@arbey.cz |
| **Lukáš Gašník** | zemský ředitel 4FIN, distribuce a network | — |
