# Anna — Design Strategy, Pass 4

> Reference dokument pro `editorial drama + atmospheric warmth + platform repositioning` redesign vrstvený na Pass 3.
> Pass 1: launchpad architektura. Pass 2: cream + wine + black. Pass 3: charakter (Instrument Serif, sémantické tinty, motion). Pass 4: **Anna jako platforma**.

---

## 1. Context — proč pass 4

### 1.1 Founder verdict po pass 3

> *„Mid, chybí koule, pozadí mrtvé, žádné animace, MacOS inspirace OK ale málo dramy."*

Pass 3 Anně dalo *visual character* (wordmark, italic display, sémantické tinty, atmospheric mesh, stagger entrance). Ale produkt pořád mluvil jako CRM:

- *„Tvoje aktivita"* — rámec naznačuje personal CRM
- *„Tvoje nástroje"* — nástroje jako majetek poradce
- *„Brzy dostupné"* — SaaS placeholder voice
- 3 metric tiles — dashboard reading mode

To čte jako Salesforce. Pass 4 přepíná hřiště — Anna je **platforma**, poradce je **host**. Tools live on Anna. Anna grows. Anna does things on your behalf.

### 1.2 Re-positioning thesis

| Před (pass 3) | Po (pass 4) | Reference |
|--------------|-------------|-----------|
| *Tvoje aktivita* | **DNES NA ANNĚ** | Stripe Dashboard |
| *Tvoje nástroje* | **NÁSTROJE NA ANNĚ** + subtitle | Substack workspace |
| *Brzy dostupné* | **ANNA ROSTE** + subtitle | Living platform |
| *Karle, máte 2 schůzky* | *Anna ti připravila nabídku* | Granola actor pattern |

Pozičně: Anna je **místo** (Stripe Press), **prostor** (Substack), **aktér** (Granola). Poradce *má svůj prostor na Anně*.

### 1.3 Anti-positioning

Anna NENÍ:
- Salesforce / Pipedrive (CRM dashboard)
- Notion (workspace tool kit)
- v0 / Vercel (developer platform)
- Linear (project tracker)

Anna je: editorial platform pro finančně poradenství s atmosférou magazínu.

---

## 2. Brand atmosphere strategy

### 2.1 Pět adjektiv (pass 3 rozšířeno)

1. **Editorial** — typografie hraje, hero má scenic moment
2. **Crafted** — každý element zvážený
3. **Quiet** — restraint nad showy
4. **Substantial** — váha; finance vyžaduje seriózno
5. **Atmospheric** *(NEW)* — vrstvená hloubka místo flat surface

### 2.2 Reference produkty (atmosphere ladder)

| Produkt | Co bereme |
|---------|-----------|
| **Stripe Press** | Cream + tmavé hnědé akcenty, paper texture, editorial gravity |
| **Things 3** | Warm cream bg, micro-interactions na každý hover |
| **Granola** | Atmospheric mesh, soft motion polish, „Granola joined…" voice |
| **Read.cv** | Dramatic typography, oversized hero, line break play |

Anti-references (re-do trigger): banking-blue dashboards · Vercel v0 outputs · crypto neon · gradient CTA buttons · metric-tile grids.

### 2.3 Drama bez over-doing

„Drama" = *scenic moment + restraint*. NIKDY:
- Scroll-jacking
- Parallax
- Video backgrounds
- Animated glow
- Pulsing CTAs

VŽDY:
- Choreographed entrance ~1,0–1,2 s
- Layered atmospheric depth (≤0,5 total opacity per pixel)
- Editorial typography moments (line breaks, italic plays, oversized serif)
- Subtle motion na cursor

---

## 3. Visual signatures — 10 prvků (pass 3 + pass 4)

### Z pass 3 (zachováno + extended)

1. **Anna wordmark** — Instrument Serif italic + signature underline. Pass 4 přidává hover breathing variant na topbaru.
2. **Editorial display** — pass 3 měl 64 px. Pass 4 bumpne hero greeting na **72 px** (`text-hero-serif`) + dvouřádkový + −8 px shift druhého řádku.
3. **Tinted tool-card system** — featured/growth/value/neutral/disabled. Pass 4 přidává **decorative SVG shape per variant** v rohu karty.
4. **Atmospheric mesh** — pass 3 měl jeden mesh top-right. Pass 4 vrství **tři meshes** s breathing.
5. **Stagger entrance** — pass 3 měl page-level fade-up. Pass 4 ho rozšiřuje do **choreografického arcu**.

### NOVÉ v pass 4

6. **Paper texture overlay** — globální 2,5 % SVG turbulence noise, fixed full-screen, behind everything. Inline data URI ~2 KB. **Degradation strategy:** test na retina + non-retina + mobile během Phase B; pokud noise vychází muddy → fallback CSS gradient pattern; pokud i ten muddy → skip texture úplně. Není must-have.
7. **Layered atmospheric meshes** — 3 meshes (top-right wine+sage / bottom-left ochre+warmbrown / middle subtle warmbrown), non-synced drift cykly 8 / 12 / 15 s, breathing opacity 0,4–0,7.
8. **Decorative warmbrown elements** — thin section rules (1 px × 120 px @ 0,15 opacity), scattered hero dots (4–6 × 2,5 px @ 0,3), tool-card corner shapes (60–80 px @ 0,08–0,1), wave closing signature.
9. **Scenic hero moment** — dvouřádkový 72 px Instrument Serif italic, druhý řádek −8 px shift, 80 px wine line draw, tagline „Tvůj prostor na Anně" 18 px italic. Choreograph 1,0–1,2 s.
10. **Editorial activity sentences** — 3 metric tiles → 3 prozaické věty s **inline serif emphasis** na číslech (Instrument Serif roman 24–28 px tabular-nums vnořeno do General Sans 18 px prose). Hybrid: prose flow + scanning čísla simultaneously.

---

## 4. Color system — 4 sémantické rodiny

### 4.1 Hierarchie

| Rodina | Hex | Role | Použití |
|--------|-----|------|---------|
| **Wine** | `#6B1F2E` | Action accent (one) | CTA, links, focus, error, featured tint |
| **Sage** | `#5C7A6B` | Growth tint | Tool variant „growth", success status |
| **Ochre** | `#9B7A1A` | Value tint | Tool variant „value", warning status |
| **Warmbrown** *(NEW)* | `#8C7355` / `#6B5742` | Decorative depth | Section rules, hero dots, tool decorations, ETA badges, wave closing |

### 4.2 Pravidla

- Wine **JEDINÝ** akční accent. Sage/ochre/warmbrown **NIKDY** na CTA/links.
- Warmbrown **NIKDY** na text. Jen background/decorative SVG.
- Total color palette pass 4: 4 sémantické rodiny + neutrals (cream stack 4 vrstev + text 4 stupňů).

### 4.3 Tokens (přidává Phase B do `globals.css`)

```css
@theme {
  /* Pass 4 — warm brown decorative depth */
  --color-warmbrown:        #8c7355;
  --color-warmbrown-deep:   #6b5742;
  --color-warmbrown-muted:  rgba(140, 115, 85, 0.06);
  --color-warmbrown-bg:     rgba(140, 115, 85, 0.12);
}
```

---

## 5. Typography — 4 nové utility classes

### 5.1 Existuje (pass 3)

- `text-wordmark` — Instrument Serif italic (sm/md/lg/hero sizes)
- `text-display-serif` — 64 px italic (sub-hero use cases)
- `text-stat-serif` — 44 px roman tabular-nums (zachováno pro pass 3 počítadlo, ne v pass 4 dashboard)
- `text-tagline-serif` — 18 px italic (login + hero tagline)

### 5.2 Nové v pass 4

```css
@utility text-hero-serif {
  font-family: 'Instrument Serif', 'Georgia', serif;
  font-style: italic;
  font-weight: 400;
  font-size: 72px;
  line-height: 1.04;
  letter-spacing: -0.018em;
}

@utility text-editorial {
  font-family: 'General Sans', -apple-system, sans-serif;
  font-weight: 400;
  font-size: 18px;
  line-height: 1.55;
  letter-spacing: 0;
  max-width: 72ch;
}

@utility text-platform-cap {
  font-family: 'General Sans', -apple-system, sans-serif;
  font-size: 12px;
  line-height: 1.3;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

@utility text-pluri-italic {
  font-family: 'Instrument Serif', 'Georgia', serif;
  font-style: italic;
  font-weight: 400;
  font-size: 14px;
  line-height: 1.4;
  letter-spacing: 0;
}

/* Inline emphasis pro čísla v editorial sentences */
@utility text-stat-inline {
  font-family: 'Instrument Serif', 'Georgia', serif;
  font-style: normal;
  font-weight: 400;
  font-size: 26px;
  line-height: 1;
  letter-spacing: -0.01em;
  font-variant-numeric: tabular-nums;
}
```

### 5.3 Pravidlo

Display serif **JEN** v editorial momenty (hero, wordmark, modal heads, inline emphasis). NIKDY v body, buttons, inputs, navigation.

---

## 6. Motion choreography

### 6.1 Hero entrance arc — 1,0–1,2 s (compressed z 1,8 s)

```
0–150 ms:    Meshes fade-in (opacity 0 → cíl)
150–350 ms:  Scattered hero dots stagger (40 ms × 5 dots = 200 ms)
350–700 ms:  Greeting words reveal (60 ms × 3 slov = 180 ms, finish 530)
700–900 ms:  80 px line draw (scaleX 0 → 1, transform-origin left)
900–1100 ms: Tagline „Tvůj prostor na Anně" fade-up
1100 ms+:    Editorial sentences stagger (60 ms × 3 věty)
```

### 6.2 Dev override + first-session-ever flag

- `?fast=1` query param → entrance disabled, vše renderuje instantně
- `sessionStorage.getItem('anna-hero-played')` — pokud existuje, skip entrance choreography
- Po prvním fire: `sessionStorage.setItem('anna-hero-played', '1')`
- Konkrétně: HeroBlock + EditorialActivity zkontrolují flag na mount; pokud set, použijí `initial="visible"` ne `initial="hidden"`

Důsledek: poradce vidí scenic moment **jen jednou per session**. Subsequent reloads / route navigations jsou instant.

### 6.3 Breathing meshes (cyklické, infinite, NE synced)

- Mesh page-tr: drift 12 s + opacity 0,5 → 0,7 → 0,5
- Mesh page-bl: drift 15 s + opacity 0,4 → 0,6 → 0,4
- Mesh page-mid: drift 8 s + scale 1,0 → 1,03 → 1,0

Důležité: animace start-times **rozdílné** (mesh 1: delay 0 s, mesh 2: delay 4 s, mesh 3: delay 2 s) → nikdy nejsou v synchronu, dýchá to organicky.

### 6.4 Magnetic tool cards

- `useMotionValue` x/y → `useSpring` (stiffness 200, damping 15) → `transform: translate(x, y) scale(s)`
- Map: cursor pozice rel. ke středu karty → translate **±4–5 px** + scale **1,0 → 1,01**
- Reset on `mouseleave`
- **Composes** s pass 3 hover-lift (Tailwind v4 používá `translate` property, motion `transform` — neclashují)
- `useReducedMotion()` short-circuits → magnetic disabled, jen hover-lift zůstává
- Skip pro `disabled` variant

### 6.5 Wordmark hover breathing

CSS-only:

```css
.anna-wordmark-link:hover .anna-underline {
  animation: anna-underline-breathe 1.5s ease-in-out infinite;
}

@keyframes anna-underline-breathe {
  0%, 100% { transform: scaleX(1); }
  50%      { transform: scaleX(1.05); }
}
```

Topbar wordmark wrapped Linkem dostane class `.anna-wordmark-link`. Login + admin + hero greeting NEMAJÍ breathing (jsou static / one-shot draw).

### 6.6 Scroll reveal (sekce pod foldem)

Framer Motion `whileInView={{ once: true, amount: 0.2 }}` na NÁSTROJE NA ANNĚ + ANNA ROSTE. Fade-up 16 px, 600 ms ease-out.

---

## 7. Editorial copy direction

### 7.1 Anna actor split — ENFORCED v copy passu

| Typ obsahu | Pattern | Příklad |
|-----------|---------|---------|
| **Skutečné akce platformy** | „Anna [verb in past tense]" | „Anna ti připravila nabídku." |
| | | „Anna spustila přepis." |
| | | „Anna vygenerovala PDF." |
| **Stav / counts / dates** | Bez Anny anthropomorphizing | „Tento týden máš na Anně 2 schůzky." |
| | | „Včera jsi nahrál schůzku." |
| | | „Poslední nabídka putuje k Martinu Tichému." |
| **Hero greeting** | Time-based, jméno | „Dobré odpoledne, Evo" |

**Proč rozlišovat:** Anna jako aktér je legitimní jen tam, kde *skutečně něco udělala* (transcription, extraction, PDF gen, scheduling). Pro counts, dates, status — Anna nic „neudělala", to jen je. Anthropomorphizing v takovém kontextu sklouzává do AI-slop („Anna ti spočítala 2 schůzky" → cringe).

### 7.2 Czech-copywriter pass v Phase I MUSÍ

- Projít každou string v editorial-activity.tsx
- Zkontrolovat, že Anna actor pattern je použit jen na akce
- Stav/counts/dates v 2. osobě („máš", „nahrál jsi") nebo pasivně („putuje k…")
- Cap věta na ≤100 chars
- Žádné „AI-powered", „smart", „automaticky"

### 7.3 Banned patterns (z CLAUDE.md §5.7 + pass 4 additions)

- ❌ „Anna ti spočítala…" / „Anna ti řekla, že…" (state, ne action)
- ❌ „Anna automaticky…" (slop)
- ❌ „AI-powered cokoliv"
- ❌ Helpful subtitles („Zde najdete…", „Chcete-li začít…")
- ❌ Suggested prompts u AI inputu
- ❌ „Get started by…"

---

## 8. Component inventory

### 8.1 NEW

| Soubor | Účel |
|--------|------|
| `docs/design-strategy-pass-4.md` | Tento dokument |
| `src/lib/format-czech.ts` | `pluralize(n, [one, few, many])` přes `Intl.PluralRules('cs')` + `relativeDate(iso)` (dnes / včera / před N dny / DD. měsíc) |
| `src/components/launchpad/platform-backdrop.tsx` | Pure-CSS wrapper, 3 meshes + texture overlay |
| `src/components/launchpad/hero-block.tsx` | Client; word-stagger reveal, line draw, dots, tagline, fast/firstSession guard |
| `src/components/launchpad/editorial-activity.tsx` | Client; renders 3 sentences s inline serif emphasis, stagger entrance |
| `src/components/launchpad/tool-card-decoration.tsx` | 3 SVG dekorace: `WaveDecor`, `DotsDecor`, `LinesDecor` (60×60, currentColor) |
| `src/components/launchpad/dashboard-closing.tsx` | Wave decoration only (žádné links / colophon) |

### 8.2 EDITED

| Soubor | Změna |
|--------|-------|
| `src/app/globals.css` | Tokens (warmbrown), utilities (text-hero-serif/editorial/platform-cap/pluri-italic/stat-inline), `.anna-paper-texture`, 3 mesh variants + keyframes, `.anna-section-rule`, `.anna-line-draw`, `.anna-underline-breathe` |
| `src/app/(advisor)/dashboard/page.tsx` | Mount `<PlatformBackdrop>`, swap header za `<HeroBlock>`, swap activity tiles za `<EditorialActivity>`, update captions, append `<DashboardClosing>` |
| `src/components/launchpad/tool-card.tsx` | Per-variant decorative shape, magnetic hover wrapper, ETA badge restyle |
| `src/components/layout/topbar.tsx` | „Hledat" → „Anna" v palette trigger; advisor dropdown získá „Změnit poradce" link → /login (přesunuto z plánovaného footeru); wordmark Link `.anna-wordmark-link` class |
| `src/components/brand/anna-wordmark.tsx` | `interactive?: boolean` prop pro hover-breathing |

### 8.3 OUT OF SCOPE (pass 4 NEDOTÝKÁ)

- Backend: server actions, Supabase, OpenAI, RLS — netknuto
- Pass 3 hotovo: login, login/admin, wordmark mechanika, login-advisor-card, dashboard-motion (zachováno, jen rozšířeno o nové komponenty)
- /schuzky/* / asistent / pipeline / PDF / transcription
- Footer s links/colophon — DROPED per founder correction #4

---

## 9. Implementation phases

| Phase | Scope | Code review |
|-------|-------|-------------|
| **A** | Strategy doc (this) | — |
| **B** | Foundation tokens + utilities + paper texture (s degradation testem) | — |
| **C** | `<PlatformBackdrop>` + dashboard root mount | (po E) |
| **D** | `<HeroBlock>` + 72 px serif + line draw + scattered dots + fast/firstSession guard | (po E) |
| **E** | `<EditorialActivity>` + `format-czech.ts` + dashboard data wiring + Anna actor split | **code-reviewer C+D+E** |
| **F** | ToolCard decorations + magnetic hover + section captions | (po G) |
| **G** | Platform news section + ETA badge restyle | **code-reviewer F+G** |
| **H** | Topbar palette label + advisor dropdown link + wave closing decoration + wordmark breathing | **code-reviewer H** |
| **I** | czech-copywriter pass + 22-Q sound check + lint + typecheck + build + smoke test plan + commit (na user OK) | — |

Code-reviewer 3× total (po E, po G, po H). Skipped na docs (A) a CSS-only (B).

---

## 10. Sound check — 22 otázek

### Pass 1–2 base (10)

1. Konkrétní jiný produkt? → cíl: „Stripe Press × Granola × Things 3 hybrid"
2. Lucide v menu? → ne, sidebar neexistuje
3. Helpful subtitle? → none
4. Suggested prompts? → N/A v této vrstvě
5. Font Inter / Geist / system? → General Sans + Instrument Serif
6. Dva accent colors? → wine je jediný akční; sage/ochre/warmbrown jsou tinty/decorations
7. Shadow na cards? → ne, jen border + bg tint
8. Centered hero? → left-aligned + −8 px shift druhého řádku
9. „AI-powered"? → ne
10. Purple/blue gradient? → ne; meshes jsou warm tones

### Pass 3 (6)

11. ≥2 accents kromě primary? → 4 (wine + sage + ochre + warmbrown) ✓
12. Anna identity ≥3 místech? → topbar wordmark, login hero, /login/admin, hero scenic, wave closing ✓
13. Motion na home? → choreograph + breathing meshes + magnetic + wordmark + scroll reveal ✓
14. Tool cards diferencované? → 4 variants + top accent line + decorative SVG shape per variant ✓
15. Copy character-driven? → editorial sentences + Anna actor split ✓
16. Designerova reakce? → cíl „editorial gravity, atmospheric warmth, restraint drama"

### Pass 4 (6 nových)

17. Atmosféra pozadí (textures, meshes, depth) vs flat? → paper texture (s degradation fallback) + 3 meshes + section rules + dots
18. UI reaguje na cursor? → magnetic tool cards (±4–5 px + scale 1,01) + wordmark hover breathing
19. Hero scenic moment? → 72 px serif italic dvouřádkový + −8 px shift + 80 px wine line draw + tagline + dots
20. Copy editorial (sentences) vs metric (tiles)? → 3 prozaické věty s inline serif číslovým emphasis
21. Anna jako platforma vs CRM? → captions „NA ANNĚ" / „ANNA ROSTE" + Anna actor pattern v copy
22. Sekce home propojené? → `.anna-section-rule` warm-brown thin lines + atmospheric mesh continuity + wave closing signature

**Threshold pro shippable:** 14+ z 22, ideálně 18+.

---

## 11. Tři rozhodnutí proti AI default patterns

### 1. Editorial sentences s inline serif emphasis místo metric tiles

**Default pattern:** větší čísla, víc karet, „at a glance" dashboard. **Pass 4:** 3 sentences místo 3 tiles, ale **hybrid** — čísla zůstávají skenovatelná díky inline 26 px Instrument Serif roman tabular-nums emphasis vnořenému do 18 px General Sans prose.

```
Tento týden máš na Anně {2 schůzky}, 1 ze 2 hotových.
              ↑18 px sans   ↑26 px serif inline
```

**Risk:** ztráta okamžité scanability dashboard-style. **Mitigace:** inline serif emphasis řeší — čísla *vyjedou* z prose, dají se přečíst i při skenování. **Reward:** poziční posun na platformu, čtení místo skenování, stále scanovatelné.

### 2. Layered atmospheric depth (paper + 3 meshes + dots + rules + decorations) místo flat surface

**Default pattern:** flat dashboard, hierarchie přes shadow. **Pass 4:** 5 vrstev decorations, každá ≤0,3 opacity, **aditivně**. Total per-pixel opacity stále <0,5 = nikdy nedominantní, ale *kvalita warmth se mění*.

**Risk:** noise. **Mitigace:** každá vrstva má hard opacity cap a pravidlo (ne CTA, ne text); paper texture má degradation strategy (test → fallback → skip); test v browser per device. **Reward:** atmosféra místo prázdna; produktové diferencování.

### 3. ~1,0–1,2 s entrance choreography místo <300 ms snap

**Default pattern:** dashboard renderuje instantně, „rychlé" UX. **Pass 4:** mesh → dots → words → line → tagline → sentences přes ~1,0–1,2 s arc.

**Risk:** subjektivní pomalost na revisits. **Mitigace:** **first-session-ever** flag přes sessionStorage — entrance fires JEN při prvním mountu v session. Subsequent reloads / route returns jsou instant. `?fast=1` dev override pro dev workflow. **Reward:** editorial gravitas v prvním dojmu; čtení magazínu vs. spreadsheet.

---

## 12. Maintenance rules — co budoucí pass NESMÍ

- ❌ Druhý akční accent vedle wine
- ❌ Color na CTA z warmbrown / sage / ochre
- ❌ Text v warmbrown
- ❌ Display serif v body/buttons/inputs/navigation
- ❌ Shadow na cards (border + bg tint hierarchie)
- ❌ Lucide / Heroicons v menu (Phosphor jen na functional ikony, custom SVG na decorace)
- ❌ Bento grid / centered hero / 3-col sidebar
- ❌ Toast errors / spinners
- ❌ AI-slop copy patterns („AI-powered", „Get started by…", suggested prompts)
- ❌ Anna actor anthropomorphizing pro state/counts (jen pro skutečné akce)
- ❌ Entrance choreography over 1,5 s
- ❌ Magnetic intensity over ±6 px

---

## 13. Constraints summary

- **Backend:** netknuto. Server actions, Supabase, OpenAI, RLS, pipeline — out of scope
- **Wine** zůstává jediný akční accent
- **Cream** zůstává dominantní pozadí
- **Free typography only** (Instrument Serif + General Sans)
- **Czech UI** s 4FIN terminologií (klient = poradce, zákazník = jeho klient, super-admin)
- **Pass 3 implementace** — extend, ne replace

---

## 14. Verification (Phase I checklist)

```bash
# Lint + typecheck + build
npm run lint && npx tsc --noEmit && npm run build

# Manual smoke test
# 1. /login → wordmark animate, mesh atmosférický (existuje z pass 3)
# 2. /login/admin → existuje, netknuto
# 3. /dashboard FIRST visit (clear sessionStorage):
#    - paper texture viditelná (nebo fallback)
#    - 3 meshes breathing async
#    - hero entrance choreographed ~1 s
#    - 80 px wine line draws zleva
#    - tagline „Tvůj prostor na Anně" italic
#    - editorial sentences stagger; inline číslo serif emphasis
#    - tool cards: per-variant decorative shape v rohu, magnetic hover ±4-5 px
#    - section rules warm-brown mezi sekcemi
#    - wave closing signature na konci dashboard
# 4. /dashboard SECOND visit (sessionStorage set): instant render, žádný entrance
# 5. /dashboard?fast=1: instant render
# 6. Topbar wordmark hover → underline breathes
# 7. Topbar advisor dropdown → „Změnit poradce" → /login
# 8. Topbar palette trigger label „Anna ⌘K"

# Sound check 22/22 (cíl 18+)

# Commit (jen na user OK):
# refactor(design): pass 4 — editorial sentences, layered atmosphere, scenic hero, magnetic tools
```
