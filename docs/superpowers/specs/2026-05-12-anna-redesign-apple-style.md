# Anna — kompletní redesign na Apple-style (Lukášův brand)

> **Status:** návrh k revizi
> **Datum:** 2026-05-12
> **Rozsah:** všech 24 stránek + global brand token swap

---

## 1. CO SE MĚNÍ A PROČ

**Stav před:** Anna používá vlastní brand (wine accent #6B1F2E, cream canvas #FAF6F0, General Sans). UI je
funkční ale nekonzistentní — finplan view je editorial Apple-style, dashboard chat-first s gradientem,
schůzky čisté karty, login experimentální. Žádný společný vizuální systém napříč 24 stránkami.

**Stav po:** Anna přijme **Lukášův design jazyk** (Apple-inspirovaný) napříč všemi 24 stránkami. Editorial
typografie, ink/canvas/blue palette, Inter font, hero-čísla, progresivní disclosure. Konzistentní rytmus
napříč aplikací. Tato spec definuje brand tokens, primitiva, a fázový plán.

**Motivace:** uživatel viděl Lukášovu finanční analýzu jako extrémně přehlednou (5min prototyp), chce stejný
jazyk vyškálovat na celou Annu a posunout o úroveň výš — top-tier kvalita.

---

## 2. NOVÝ BRAND (Apple-style)

### Barevná paleta

```css
/* Primary palette — z Lukášova Finplan 2 */
--ink:         #1D1D1F;  /* primary text, headings */
--muted:       #86868B;  /* secondary text, captions */
--line:        #E5E5EA;  /* borders, dividers */
--canvas:      #FBFBFD;  /* page background */
--surface:     #FFFFFF;  /* cards, modals */
--accent:      #0071E3;  /* primary action, focus, links */
--accent-deep: #0051A2;  /* hover state */

/* Doplňky (z Annina existujícího systému, mapované na Apple konvenci) */
--subtle:      #F5F5F7;  /* hover background, secondary surface */
--inset:       #EFEFF1;  /* code blocks, nested surfaces */
--success:     #34C759;  /* Apple's system green */
--warning:     #FF9500;  /* Apple's system orange */
--error:       #FF3B30;  /* Apple's system red */
--accent-muted: rgba(0,113,227,0.08);  /* featured cards */
```

**Pravidla:**
- ŽÁDNÝ wine accent. Wine se zachová JEN pro brand "Anna" wordmark (sentimentální detail).
- Modré `--accent` je jediný akcent pro CTA, links, focus.
- `--canvas` je téměř-bílé, ne čistě bílé (Apple to dělá kvůli únavě očí).
- Borders ne stíny.

### Typografie

**Font:** Inter (přes Fontshare nebo Google Fonts) s system fallback. Font features `ss01`, `cv11` pro
Apple-like alternaty.

```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif;
font-feature-settings: 'ss01', 'cv11';
```

**Type scale:**
```
hero        72px / 1.0 / -0.03em / 600  (page hero, max 1 výskyt na stránku)
hero-sm     56px / 1.0 / -0.025em / 600 (sekundární hero)
h1          40px / 1.1 / -0.02em / 600  (sekce headings)
h2          28px / 1.2 / -0.015em / 600 (subsection)
h3          20px / 1.3 / -0.01em / 600  (card title)
body-lg     17px / 1.5 / 0 / 400        (prose, hero subtitle)
body        15px / 1.5 / 0 / 400        (default)
body-sm     13px / 1.4 / 0 / 400        (secondary, helper)
caption     12px / 1.3 / 0.12em / 500   (kicker labels, uppercase)
mono        14px JetBrains Mono         (code, metrics jen kde fakt potřeba)
```

**Anna wordmark:** zachová svůj současný serif font + wine podtržení (jediná wine instance v UI). Anna
jako brand mark má historicky-rezonující identitu, body je Apple sans.

### Spacing & layout

```
Base: 4px
Scale: 4, 8, 12, 16, 24, 32, 48, 64, 80, 96, 128
Section vertical: 80-96px mezi sekcemi (Apple's editorial rhythm)
Page max-width: 1024px (max-w-5xl) pro content, 1280px (max-w-7xl) pro list views
Topbar: 56px (h-14, Apple Mail / Granola pattern)
Card padding: 24px default, 32px hero card
Border-radius: 12px default, 18px card, 980px (pill) badges
```

### Komponenty — vizuální DNA

**Cards:**
- `border: 1px solid var(--line)` (ne shadow)
- `border-radius: 18px` (Lukáš's `rounded-card`)
- `padding: 24-32px`
- Hover: `border-color: muted` (subtle darkening, ne lift)

**Buttons:**
- Primary: `bg: accent #0071E3`, white text, h-9 (36px), radius-pill (980px), font-medium
- Secondary: `border: line`, transparent bg, ink text, h-9, radius-pill
- Ghost: text only, hover `bg: subtle`
- Žádné rounded-md — vždy pill nebo card-radius

**Inputs:**
- `border: line`, focus `border: accent` (2px ring `--accent-muted`)
- `border-radius: 12px`
- h-10 (40px), font-size 15px

**Topbar:**
- `h-14` (56px), `bg: white/80 backdrop-blur`, `border-b: line`
- Sticky, z-30
- Vlevo: Anna wordmark (serif, wine), middle/right: breadcrumb / action
- Žádný sidebar — navigace přes ⌘K + breadcrumb

---

## 3. SDÍLENÁ PRIMITIVA (před page sweep)

Před tím než šahnu na 24 stránek, postavím tato primitiva v `src/components/ui/` (rozšířím existující sadu):

| Primitivum | Soubor | Účel |
|---|---|---|
| `PageShell` | `src/components/ui/page-shell.tsx` | max-w wrapper + padding (1024 / 1280 variants) |
| `PageHeader` | `src/components/ui/page-header.tsx` | Caption kicker + h1 + actions row |
| `SectionDivider` | `src/components/ui/section-divider.tsx` | Border-t + py-20 wrapper (rozšíření finplan/section-frame) |
| `HeroNumber` | `src/components/ui/hero-number.tsx` | Velké tabular-nums číslo, accent variant (přesun z finplan) |
| `InfoPopover` | `src/components/ui/info-popover.tsx` | "?" toggle popover (přesun z finplan) |
| `DisclosureRow` | `src/components/ui/disclosure-row.tsx` | Expandable řádek (přesun z finplan) |
| `ListRow` | `src/components/ui/list-row.tsx` | Universal list item: title + helper + meta + action |
| `EmptyState` | `src/components/ui/empty-state.tsx` | Akční formulace + button (Anna copy rules) |
| `StatusPill` | `src/components/ui/status-pill.tsx` | Pill badge: success/warning/info/neutral variants |
| `Tabs` | `src/components/ui/tabs.tsx` | Bottom-border tab pattern (Lukáš) |
| `Card` | `src/components/ui/card.tsx` | Refresh existující na card-radius + border-only |
| `Button` | `src/components/ui/button.tsx` | Refresh: primary/secondary/ghost na pill radius + Apple proportions |
| `Input` | `src/components/ui/input.tsx` | Refresh: line border, focus accent ring |
| `Avatar` | `src/components/ui/avatar.tsx` | Iniciály v circle, žádné kruh-v-rohu (Anna conventions) |

Existující komponenty co se buď refresh nebo deprekuji:
- `components/launchpad/*` → bude potřeba refresh pro dashboard launchpad layout
- `components/brand/*` → wordmark zachovat, ladit pozici
- `components/layout/AdvisorShell` → totální rewrite na 56px topbar bez sidebar

---

## 4. PAGES — FÁZOVÝ PLÁN (24 stránek)

Pořadí podle priority (high traffic + dependency order). Každá fáze = 1 commit minimum.

### Fáze 0 — Foundation (must precede everything)
- [ ] `globals.css` — přidat brand tokens (additive, staré ponechat pro transition)
- [ ] `tailwind.config` / @theme block — přidat Apple utility classes (`text-ink`, `bg-canvas`, `border-line`, `rounded-card`, `text-hero`, atd.)
- [ ] Inter font load (next/font/google)
- [ ] CLAUDE.md update — banned patterns výjimka pro brand pivot
- [ ] Buildnout primitiva výše (Card, Button, Input, PageHeader, Tabs, atd.)

### Fáze 1 — Auth & Shell (visible everywhere)
- [ ] `src/components/layout/AdvisorShell` — 56px topbar, blur backdrop, wordmark + breadcrumb + ⌘K + advisor menu
- [ ] `src/components/layout/CommandPalette` — refresh radius/typo
- [ ] `app/login/page.tsx` — Apple-style centered login (single hero card, ne split-screen)
- [ ] `app/login/admin/page.tsx` — analog

### Fáze 2 — Core advisor (denní traffic)
- [ ] `app/(advisor)/dashboard/page.tsx` — refresh hero gradient → flat canvas, retain chat-first ale s novou typografií
- [ ] `app/(advisor)/schuzky/page.tsx` — list s ListRow + groupování by week
- [ ] `app/(advisor)/schuzky/[id]/page.tsx` — meeting detail s transcript + AI extrakce
- [ ] `app/(advisor)/schuzky/nova/page.tsx` — new meeting flow
- [ ] `app/(advisor)/zakaznici/page.tsx` — customer list (ListRow)
- [ ] `app/(advisor)/zakaznici/[id]/page.tsx` — customer detail
- [ ] `app/(advisor)/nabidky/page.tsx` — offers list

### Fáze 3 — Finanční plán flow (částečně done)
- [ ] `app/(advisor)/financni-plan/page.tsx` — list refresh
- [ ] `app/(advisor)/financni-plan/[id]/page.tsx` — **already redesigned**, jen rebrand tokens
- [ ] `app/(advisor)/financni-plan/novy/page.tsx` — new plan flow
- [ ] `app/(advisor)/financni-plan/sdilet/[id]/page.tsx` — share dialog

### Fáze 4 — Customer-facing
- [ ] `app/plan/[token]/page.tsx` — customer upload portal
- [ ] `app/plan/[token]/formular/page.tsx` — manual fallback form
- [ ] `app/(customer)/zakaznicka-zona/page.tsx` — customer zone

### Fáze 5 — Admin & profile
- [ ] `app/(admin)/admin/page.tsx` — admin dashboard
- [ ] `app/(advisor)/profil/page.tsx` — advisor profile

### Fáze 6 — AI Asistent
- [ ] `components/ai-asistent-chat` — chat UI refresh

### Fáze 7 — Placeholder stránky (Q2-Q4 2026)
- [ ] `app/(advisor)/inbox/page.tsx`
- [ ] `app/(advisor)/kalendar/page.tsx`
- [ ] `app/(advisor)/crm/page.tsx`
- [ ] `app/(advisor)/knowledge-base/page.tsx`
- [ ] `app/(advisor)/pojisteni/page.tsx`
- [ ] `app/(advisor)/newsletter/page.tsx`

Placeholder pages dostanou shared "Coming soon" template s kickerem, hero, popisem, ETA, žádné fake UI.

### Fáze 8 — Cleanup
- [ ] Smazat staré tokens (wine, cream variables)
- [ ] Smazat unused General Sans imports
- [ ] CLAUDE.md update — finalizovat nový brand jako default

---

## 5. DEFINITION OF DONE per stránka

Každá stránka musí splnit:
1. ✅ Žádná wine/cream barva (jen na Anna wordmark)
2. ✅ Inter font napříč (žádný General Sans)
3. ✅ Border-only hierarchie (žádné box-shadows)
4. ✅ max-w wrapper přes `PageShell`
5. ✅ Caption kicker + h1 přes `PageHeader` (pokud má heading)
6. ✅ Sekce přes `SectionDivider` (border-t + spacing)
7. ✅ Apple buttons (pill radius, accent blue)
8. ✅ Apple inputs (line border, accent focus)
9. ✅ Žádné Lucide ikony — Phosphor regular
10. ✅ Empty states akční (Anna copy rules zachovány)
11. ✅ Loading skeletons (ne spinnery)
12. ✅ TypeCheck pass, no warnings

---

## 6. NEMĚNÍ SE (out of scope)

- Backend, server actions, kalkulace EFA (parity 20/20 zůstává)
- Multi-tenant logika, RLS, Supabase schema
- Routing structure, URL paths
- České UI texty (jen kde se mění layout/komponenta)
- Database, types, validation schemas
- Tests (parity, lint config)

---

## 7. RISKS & MITIGATIONS

**R1: Mid-transition inconsistency.** Když je polovina pages na novém brandu a druhá na starém, UI vypadá rozbitě.
*Mitigation:* Foundation phase přidává tokens additive — staré zůstávají. Sweep page-by-page commit-by-commit.
Žádná page nezůstane v "rozpracovaném" stavu na main.

**R2: Anna wordmark se utopí v Apple blue.** Wine wordmark může působit cize na canvas-bílém pozadí.
*Mitigation:* Wordmark zůstane serif + wine, ale velikost zmenšit, podtržení tenčí. Test v topbaru, případně přepnout na ink barvu pro wordmark a wine ponechat jen na podtržení.

**R3: User changes mind on brand.** Po Fázi 1-2 user řekne "ne, vrať to na wine".
*Mitigation:* Token-based — revert je úprava tokens v globals.css, ne 24 file edits. Komponenty zůstanou.

**R4: Out of context window.** 24 stránek = pravděpodobně víc sezení.
*Mitigation:* Po každé fázi commit + dokumentovat state. Tato spec slouží jako roadmap mezi sezeními.

---

## 8. ACCEPTANCE

Tato spec je hotová když:
- User ji prošel a schválil rozsah, fázování, brand tokens
- User schválil pořadí fází
- Foundation phase je odhlasovaná před začátkem (staré tokens zůstávají additive, ne rip-and-replace)

Pak skill přejde na `writing-plans` pro detailní per-fáze implementační plán.

---

## 9. OPEN QUESTIONS

1. **Wordmark "Anna"** — ponechat serif + wine, nebo přepnout na Inter ink (jako Lukášovo "AI Finance")?
   - Defaultně: ponechat serif + wine (sentimentální brand DNA, jediná instance wine v UI).

2. **Customer portal radius.** Customer-facing flow už používá radius-12 z předchozí práce. Sjednotit na 18 (card-radius) nebo ponechat 12 pro form inputs / 18 pro karty?
   - Defaultně: 12 pro inputs/buttons, 18 pro karty/modals (Lukášova konvence).

3. **AI asistent chat bubble style.** Lukáš nemá chat UI v reference. Adoptovat Granola / ChatGPT styl ale s Inter + ink?
   - Defaultně: ano, ale s Apple polish (žádné kruhy avatarů — text-only bubliny s caption kdo mluví).

4. **Placeholder pages** — má "Coming Q3 2026" stránka mít fake mockup screenshot, nebo jen prázdnou hero kartu?
   - Defaultně: prázdná hero karta s "Připravujeme. Sledujte release notes." (Anna copy rules).
