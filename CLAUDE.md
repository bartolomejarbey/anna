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

## 5. DESIGN SYSTEM — Apple brand (Lukášův Finplan 2)

Anna používá **Apple-style ink/canvas/blue jazyk** napříč celou app. Žádný cream, žádné wine v UI. Jediná výjimka: **Anna wordmark** (serif italic + tenké wine podtržení) — to je jediný brand-DNA detail. Vše ostatní = čistá Apple typografie, pill buttons, radius-18 cards, border-only hierarchie.

Inspirace: Apple.com (editorial bigness, generous whitespace, tabular numerics), iOS Settings (list rows s divide-y), Linear (status pills s dotem). 

Anti-inspirace: shadcn dashboard templates, Vercel v0 outputs, generic SaaS apps, cream/wine palety.

### 5.1 BANNED PATTERNS (porušení = re-do)

ABSOLUTNĚ ZAKÁZÁNO:

**Typografie:**
- ❌ font Geist (overused v AI workflow 2025-2026)
- ❌ system-sans (vágnost)
- ❌ tracking default (vždy explicitní `-0.01em` až `-0.03em` na nadpisech)
- ❌ uppercase body text (caption only)

**Barvy:**
- ❌ wine v UI (kromě `.anna-underline` pod wordmark)
- ❌ cream pozadí (`#FAF6F0` a podobné) — nahrazeno Apple gray `#FBFBFD`
- ❌ purple-to-blue gradients
- ❌ shadcn defaults (slate-*, zinc-*, neutral-*)
- ❌ neon barvy, gradient backgrounds
- ❌ dva accent colors najednou — accent = `#0071e3` (Apple blue) a basta

**Layout:**
- ❌ sidebar | main | rail dashboard
- ❌ cards s `shadow-sm/md/lg` (jen border)
- ❌ centered hero sections — vše left-aligned editorial
- ❌ bento grids
- ❌ symmetric padding všude
- ❌ p-8 jako default

**Ikony:**
- ❌ Lucide-react kdekoliv (Phosphor only)
- ❌ Heroicons
- ❌ Ikony u každého nadpisu / sidebar item

**Komponenty:**
- ❌ rounded-xl jako default na buttons (pill = `rounded-full` 980px)
- ❌ rounded-2xl na cards (radius-18 = `rounded-[18px]`)
- ❌ kulaté avatary s iniciálami v top-right

**Interakce:**
- ❌ spinners (skeletons only)
- ❌ "No items yet" empty states
- ❌ toast notifications pro errors (inline only)

**Copy:**
- ❌ "AI-powered" cokoliv
- ❌ helpful subtitle pod každým nadpisem
- ❌ suggested prompts u AI inputu

### 5.2 TYPOGRAFIE

**Font family:**
- `Inter` (variable, loaded přes `next/font/google` v `src/app/layout.tsx`) jako default
- `Instrument Serif` italic JEN pro Anna wordmark
- `JetBrains Mono` jen pro code/metrics/transcripts

**CSS:**
```css
--font-sans: var(--font-inter), -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif;
--font-serif: 'Instrument Serif', 'Georgia', serif;
--font-mono: 'JetBrains Mono', ui-monospace, monospace;
```

**Type scale (Apple editorial):**
```
text-hero          72px / 1   / 600 / tracking -0.03em   — page hero, Lukáš style
text-hero-sm       56px / 1   / 600 / tracking -0.025em  — subhero
text-h1            40px / 1.1 / 600 / tracking -0.02em   — page title
text-h2            28px / 1.2 / 600 / tracking -0.015em  — section
text-h3            20px / 1.3 / 600 / tracking -0.01em   — card title
text-body-lg       17px / 1.5 / 400                       — lead, intro
text-prose         17px / 1.55 / 400 / max-w 65ch         — reading copy
text-body          15px / 1.5 / 400                       — default
text-body-sm       13px / 1.45 / 400                      — meta, labels
text-caption       12px / 1.3 / 500 / tracking 0.12em UPPER — eyebrow
text-stat          56px / 1   / 600 / tracking -0.025em / tabular — stat numbers
text-wordmark      serif italic                           — Anna only
text-mono          14px JetBrains Mono                    — code
```

**Pravidla:**
- Nadpisy `font-weight 600`. Hero může být 600 i 500, podle vizuálního důrazu.
- `tabular-nums` na všem numerickém (`.tabular` utility).
- Body NIKDY uppercase. Caption pouze sparingly — eyebrow nad h1, sekce labels, pill labels.
- `text-prose` má built-in `max-w 65ch` pro reading copy.

### 5.3 BARVY (Apple system, explicitní hex)

```css
/* Backgrounds */
--color-canvas:        #FBFBFD;  /* near-white, Apple's gray-7 */
--color-surface:       #FFFFFF;  /* cards, modals */
--color-subtle:        #F5F5F7;  /* hover, secondary surfaces */
--color-inset:         #EFEFF1;  /* nested, code blocks */

/* Borders */
--color-border-subtle: #E5E5EA;  /* default border — Apple gray-5 */
--color-border-default:#D2D2D7;  /* Apple gray-4 */
--color-border-strong: #1D1D1F;  /* ink — emphasized (focus rare) */

/* Text — ink hierarchy */
--color-text-primary:  #1D1D1F;  /* ink */
--color-text-secondary:#515154;  /* near-ink */
--color-text-tertiary: #86868B;  /* muted — Apple gray-1 */
--color-text-disabled: #B5B5B8;

/* Accent — Apple system blue */
--color-accent:        #0071E3;
--color-accent-hover:  #0051A2;
--color-accent-muted:  rgba(0, 113, 227, 0.08);
--color-accent-text:   #FFFFFF;

/* Wordmark — wine, JEN pro Anna wordmark underline */
--color-wordmark:      #6B1F2E;

/* Functional — Apple system colors */
--color-success:       #34C759;
--color-warning:       #FF9500;
--color-error:         #FF3B30;
```

**Pravidla:**
- `--color-accent` (Apple blue) = JEDINÝ akcent v UI. Žádný druhý.
- `--color-wordmark` (wine) JEN v `.anna-underline` pod wordmark. Nikdy text, nikdy border, nikdy bg.
- Hierarchie přes background contrast + border, **ŽÁDNÉ shadows** kromě modal/dropdown overlay (`shadow-[0_24px_64px_rgba(0,0,0,0.16)]` na centered modals).
- Cards: `border border-border-subtle` na `bg-surface`, hover `border-border-default` + `-translate-y-0.5`.

### 5.4 LAYOUT — Apple editorial

**Pattern:** topbar (h-14, slim) + main (scrollable, PageShell width tiers). Žádný sidebar. Navigace přes home launchpad + ⌘K command palette.

```
┌──────────────────────────────────────────────────────────┐
│ Anna  /  Schůzky                  Hledat  ⌘K   Karel ▾   │ ← h-14 topbar
├──────────────────────────────────────────────────────────┤
│         <PageShell, narrow/default/wide, scrollable>     │
└──────────────────────────────────────────────────────────┘

⌘K          → Command palette (640px, top-15%, rounded-[14px])
Asistent    → Modal (640×640, rounded-[14px], shadow-[0_24px_64px_…])
```

**Width tiers (PageShell):**
- `narrow` — 720px, forms, settings, customer flow
- `default` — 1024px, list views (schůzky, zákazníci, finanční plán)
- `wide` — 1280px, dashboard hero + grids

**Grid systém:**
- Base unit: 4px
- Spacing scale: 4, 8, 12, 16, 20, 24, 32, 48, 64, 96
- Vertical rhythm mezi sekcemi: `my-20 md:my-24` (SectionDivider) nebo `gap-20` na PageHeader → grid.

**Topbar (h-14):**
- `bg-canvas/80 backdrop-blur-md border-b border-border-subtle`
- Vlevo: `AnnaWordmark` (serif italic + wine underline) + `/` separator + breadcrumb v `text-secondary`
- Vpravo: pill search trigger (`rounded-full bg-subtle px-4 h-9`) + advisor dropdown s caret (žádný kruh s iniciálami)

**Cards (radius-18):**
- `rounded-[18px] border border-border-subtle bg-surface p-6` (default)
- Hover (jen pokud clickable): `border-border-default -translate-y-0.5` přes 180ms ease-out-quart
- Tool card: `p-7`, icon v `h-11 w-11 rounded-[12px]` tone box
- ŽÁDNÉ shadows (kromě výše uvedených modal/dropdown)

**Buttons (pill, 980px radius):**
- Primary: `bg-accent text-accent-text rounded-full h-10 px-5 font-medium hover:bg-accent-hover active:scale-[0.98]`
- Secondary: `border border-border-default bg-surface rounded-full h-10 px-5`
- Ghost: `rounded-full text-primary hover:bg-subtle h-10 px-4`
- NIKDY rounded-xl ani rounded-md na buttons

**Inputs (radius-12):**
- `h-11 rounded-[12px] border border-border-default bg-surface px-4`
- Focus: `border-accent ring-4 ring-accent/15 outline-none`
- Label nad inputem: `text-body-sm font-medium text-primary`

**Tool card (launchpad):**
- `rounded-[18px] border border-border-subtle bg-surface p-7`
- Icon `h-11 w-11 rounded-[12px]` (subtle tone bg, accent text), top-left
- Title `text-h3`, description `text-body-sm text-secondary` (2 lines max)
- Featured: `bg-accent-muted` (no separate hover variant)
- Disabled: `opacity-50` + `StatusPill tone="accent"` s quarter ("Q* 2026")

**Stat card (activity):**
- `rounded-[18px] border border-border-subtle bg-surface p-6`
- Eyebrow `text-caption text-tertiary`
- Value `text-stat tabular text-primary`
- Subtitle `text-body-sm text-secondary`

**List rows (ListRow):**
- Parent: `<ul className="divide-y divide-border-subtle">`
- ListRow: hover `bg-subtle -mx-3 px-3 rounded-[12px]`, primary text + optional secondary, trailing slot (StatusPill / CaretRight)
- Žádné cards okolo — flat list, divide-y rules

**Command palette (⌘K):**
- `rounded-[14px] border border-border-subtle bg-surface shadow-[0_24px_64px_rgba(0,0,0,0.16)]`
- Top-15%, max-w 640px, overlay `bg-black/20`
- Input `h-14 px-5 text-[17px]` + border-b subtle
- Group heading: `text-[11px] tracking-[0.02em] uppercase text-tertiary` (subtle, ne shout)
- Items: `h-11 rounded-[10px] px-3.5`, selected `bg-subtle`

**Asistent modal:**
- `h-[640px] w-[640px] rounded-[14px] border border-border-subtle bg-surface shadow-[0_24px_64px_rgba(0,0,0,0.16)]`
- Header h-14: "Asistent" + close button (rounded-full, 32px)
- Wraps `AiAsistentChat`

### 5.5 IKONY

**Phosphor Icons** v `regular` weight (ne `bold`, ne `fill`). NIKDY Lucide.

```bash
npm install @phosphor-icons/react
```

```jsx
import { Microphone, Clock, FileText } from '@phosphor-icons/react';
// nebo SSR variant pro Server Components:
import { Microphone } from '@phosphor-icons/react/dist/ssr';

<Microphone size={18} weight="regular" />
```

**Pravidla:**
- Velikost 16-20px max (Phosphor default `size={20}`)
- Color přes parent `text-*` utility (nikdy hard-coded)
- Empty state hero ikona může být 32px (1 ikona, NE dekorativně)

### 5.6 STATUS PILLS

`<StatusPill tone="...">` (`src/components/ui/status-pill.tsx`).

**Tones:**
- `neutral` (default) — bg subtle, text secondary
- `success` — Apple green tinted bg
- `warning` — Apple orange tinted bg
- `error` — Apple red tinted bg
- `accent` — Apple blue tinted bg (Q* badges, featured tags)
- `processing` — neutral + animated dot (running states)

Props: `tone`, `dot` (boolean — colored dot indicator).

Layout: `rounded-full px-2.5 py-1 text-body-sm font-medium`.

### 5.7 INTERAKCE

**Loading:**
- Skeletons matching real layout (ne spinners)
- `skeleton` utility: `bg-subtle rounded-[6px]` + 1.5s pulse animation

**Empty states (EmptyState component):**
- Icon v `h-14 w-14 rounded-full bg-subtle` wrapper, centered text
- Heading + body + optional action button
- Akční formulace ("Žádná schůzka. Naplánovat novou?"), nikdy "No items yet"

**Errors:**
- Inline pod input fieldem v `text-error`, ne toast
- Form-level: `ErrorState` component s `bg-error-bg` wrapper

**Animace:**
- POUZE opacity (fade), transform (slide, scale)
- NIKDY width, height, top, left
- Duration: 150-250ms micro, 300-400ms page
- Easing: `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out-quart) — definováno jako `--ease-out-quart`
- Buttons active: `scale(0.98)`. Cards hover: `-translate-y-0.5`. Žádný "lift".

**Modal/palette enter:**
- `.anna-fade-scale-in` (180ms ease-out-quart, opacity 0→1 + scale 0.96→1)

### 5.8 COPY (anti-AI-slop)

**Empty states — BANNED:**
- ❌ "[Thing name] — [thing description]"
- ❌ "Get started by..."
- ❌ "You don't have any [X] yet"

**GOOD:**
- ✅ Akční formulace v 1. osobě / imperative
- ✅ Žádný subtitle pod hlavním nadpisem akčních stránek

**Buttons:** 1-3 slova, sloveso imperative ("Nahrát", "Uložit", "Začít").

**AI asistent:** placeholder "Zeptej se." — ŽÁDNÉ suggested prompts, ŽÁDNÝ bio header.

**Formuláře:** labels nad inputy, žádná helpful prose, placeholder = příklad.

### 5.9 BRAND DNA — Anna wordmark

Jediný sentimentální detail v jinak Apple-čisté UI. Bez wordmarku by Anna nebyla Anna.

**Komponenta:** `<AnnaWordmark size="sm|md|lg" />` (`src/components/brand/anna-wordmark.tsx`).

**Pravidla:**
- Serif italic (`Instrument Serif`) na slově "Anna", text `text-primary` (ink, ne wine!)
- Pod ním tenké wine podtržení (`.anna-underline`, `--color-wordmark` = #6B1F2E)
- Hover: subtle breathing animation podtržení (`anna-underline-breathe`)
- **Wine je tady a jen tady.** Žádný button, žádný badge, žádný text v UI nemá wine. Nikdy.

### 5.10 SOUND CHECK — slop detection

Před commitem komponenty:

1. Vypadá to jako **Apple.com / Linear / Stripe**, nebo jako **generic dashboard**?
2. Je tam Lucide ikonka? → **slop, fix na Phosphor**
3. Je tam shadow na běžném cardu (ne modal)? → **slop, border místo**
4. Je tam `rounded-xl` na buttonu? → **slop, `rounded-full` pill**
5. Je tam wine kdekoliv kromě `.anna-underline`? → **slop, na blue (`text-accent`)**
6. Je font Geist nebo system-sans? → **slop, Inter**
7. Je tam centered hero? → **slop, left-aligned**
8. Je tam "AI-powered" v copy? → **slop, vyhodit**
9. Vidíš purple/blue gradient? → **slop, smazat**
10. Suggested prompts u AI inputu? → **slop, vyhodit**

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
