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
/* Background — vrstvená béžová */
--bg-canvas:        #FAF7F2;  /* hlavní pozadí, warm cream */
--bg-surface:       #FFFFFF;  /* cards, modals — pure white pro kontrast */
--bg-subtle:        #F4F0E9;  /* hover states, secondary surfaces */
--bg-inset:         #EDE7DB;  /* nested surfaces, code blocks */

/* Borders */
--border-subtle:    #E8E0D5;  /* default border — ledva viditelná */
--border-default:   #D6CDBE;  /* normal border */
--border-strong:    #1D1D1F;  /* emphasized border (focus, active) */

/* Text */
--text-primary:     #1D1D1F;  /* primary content */
--text-secondary:   #5C5A56;  /* secondary content */
--text-tertiary:    #8B8780;  /* metadata, timestamps */
--text-disabled:    #B5B0A6;

/* Accent — single, ne purple, ne blue */
--accent:           #1D1D1F;  /* primary actions = skoro černá, ne modrá */
--accent-hover:     #000000;
--accent-text:      #FAF7F2;  /* text na accent backgrounds */

/* Functional (subtle, finanční) */
--success:          #1F4F3F;  /* tmavá lesní zelená */
--warning:          #8B6914;  /* tmavé gold */
--error:            #6B1818;  /* tmavé burgundy */

/* Functional backgrounds (10% opacity verze) */
--success-bg:       #1F4F3F1A;
--warning-bg:       #8B69141A;
--error-bg:         #6B18181A;
```

**Pravidla:**
- ŽÁDNÝ accent v UI ostatně než `--accent` (skoro černá).
- Functional barvy JEN na status indicators a inline alerts. Nikdy buttons, nikdy nadpisy.
- Background hierarchie přes 4 vrstvy béžové (canvas → surface → subtle → inset). To je hierarchie, ne shadow.
- ŽÁDNÉ shadows. Hierarchie přes background contrast, ne stíny.

### 5.4 LAYOUT

**Grid systém:**
- Base unit: 4px
- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128
- ŽÁDNÉ vlastní pixel hodnoty mimo scale.
- Vertical rhythm mezi sekcemi: 64-96px, ne uniform.

**Page structure:**
```
┌─────────────────────────────────────────────────┐
│  Topbar (56px height, subtle border bottom)     │
├──────────┬──────────────────────────────────────┤
│          │                                       │
│ Sidebar  │  Main content                         │
│ (240px)  │  (max-width 960px, NOT centered)     │
│          │  (left-aligned, organic spacing)      │
│          │                                       │
└──────────┴──────────────────────────────────────┘

AI rail: HIDDEN by default. Trigger: ⌘K or button.
When open: slide-in from right, max-width 380px, overlay-style.
```

**Sidebar pravidla:**
- ŽÁDNÉ ikonky u menu items (kromě bottom-section utility icons jako logout)
- Aktivní stav: subtle 2px vertical bar vlevo + font-weight 500 (ne background change)
- Section labels: caption typography (uppercase 12px tracking-wide)
- Hover: bg-subtle, žádný transition delay
- Logo top-left: jen text "Anna" v display-weight 500, žádné ikony

**Topbar pravidla:**
- Žádný search bar (uživatel zítra search nepoužije)
- Vlevo: page title (H2 typography)
- Vpravo: jen advisor dropdown — text "Karel Novák" + chevron, žádný kruh s iniciálami
- Border-bottom subtle, ne shadow

**Cards:**
- Border 1px `--border-subtle`, ne shadow
- Padding 24px (ne 32px default)
- Border-radius 12px (ne 16px+)
- Background `--bg-surface` (white) na canvas (béžovém)
- Hover state: `--border-default` (subtle border darkening), žádný lift

**Buttons:**
- Primary: bg `--accent`, text `--accent-text`, height 40px, border-radius 8px, padding 0 16px, font-weight 500
- Secondary: border 1px `--border-default`, bg transparent, text `--text-primary`
- Ghost: text only, bg transparent, hover bg-subtle
- Žádné rounded-full, ne rounded-xl
- Active state: scale-[0.98]
- Hover: opacity 0.9 nebo bg darkening, žádný lift

**Inputs:**
- Border 1px `--border-default`, bg `--bg-surface`
- Height 40px, padding 0 12px
- Border-radius 8px
- Focus: border `--accent` (2px ring SUBTLE, ne neon)
- Žádný shadow

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
| Před commitem | Lint + typecheck + RLS test |

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
