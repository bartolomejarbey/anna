# Anna — Design Strategy Pass 3

> Reference dokument pro charakter & personality Anny po třetím design refaktoru. Slouží jako kotva pro budoucí pass-y a code review.

---

## 1. Brand personality

5 adjektiv, podle kterých se rozhoduje každý vizuální element:

| # | Adjektivum | Co to znamená v praxi |
|---|------------|----------------------|
| 1 | **Editorial** | Typografie je hrdina. Magazín pro finanční poradce, ne dashboard. Hero text v Instrument Serif, generous white space, typografická hierarchie přes velikost a styl, ne přes ikony a oddělovače. |
| 2 | **Crafted** | Každý element zvážený. Žádný template smell, žádný shadcn default. Custom SVG ikony (12×). Custom mesh decoration. Vlastní wordmark s draw animací. |
| 3 | **Quiet** | Restraint. Sebedůvěra bez křiku. Jeden action accent (wine), tinty na 8 % alpha, žádné gradienty na buttonech, žádné neon. Ambient drift namísto bouncy entrances. |
| 4 | **Substantial** | Váha. Finance vyžaduje seriózno, ne tech-bro lehkost. Typo weight 500 na nadpisech, generous padding na cards, dlouhý loading rhythm (count-up 800 ms místo instant). |
| 5 | **Czech** | Tichá lokální senzibilita. Cream tóny (ne arctic white), considered language (vocative — „Karle", ne „hi Karel"), žádné vlajkomávání. |

### Anti-personality (re-do trigger)

- Slick CTA gradients (purple → blue, magenta → cyan)
- Banking-blue korporát (Allianz, ČSOB look)
- Crypto neon (chartreuse, hot pink, electric teal)
- AI-template purple (`#6366f1`, `#8b5cf6`)
- Metric-tile dashboard (4 number boxes in a grid bez kontextu)

---

## 2. Visual signatures (5 prvků, které jsou *unikátně Anna*)

### 2.1 Anna wordmark

- **Font:** Instrument Serif Italic
- **Treatment:** italic „Anna" + signature underline (1.5 px wine, ~60 % šířky wordmarku)
- **Animation:** underline draws on first paint — `transform: scaleX(0)` → `scaleX(1)`, transform-origin left, 600 ms ease-out-quart
- **Sizes:**
  - `sm` 20 px — modal heads, footer
  - `md` 28 px — topbar (default)
  - `lg` 48 px — breakpoints, internal hero
  - `hero` 96 px — login

### 2.2 Editorial display

Hero greeting na `/dashboard` a velké stat čísla mají **serif treatment** namísto sans:

- Hero greeting („Dobré ráno, Karle") → Instrument Serif **italic** 64 px
- Stat numbers v activity cards → Instrument Serif **roman** 44 px tabular-nums

**Anti-slop:** většina SaaS apps používá sans-only pro čísla a hero. Serif = brand recognition + finance gravitas.

### 2.3 Tinted tool-card system

Každá tool-card má sémantický tint background + 1.5 px barevný accent line nahoře. Karty jsou rozlišitelné v klidu, ne až na hover.

| Variant | Color | Použití |
|---------|-------|---------|
| `featured` | Wine (`#6B1F2E`, 8 % bg) | Naslouchač, Asistent (hero CTAs) |
| `growth` | Sage (`#5C7A6B`, 8 % bg) | Zákazníci, Admin |
| `value` | Ochre (`#9B7A1A`, 8 % bg) | Nabídky, Profil |
| `neutral` | Cream-white (`#FFFFFF` + tertiary line) | fallback |
| `disabled` | Subtle gray (`#F2EBE0`, opacity 0.6) | Brzy dostupné (6×) |

### 2.4 Atmospheric mesh

Radial blurred gradient (wine 4 % + sage 4 %) v top-right rohu hero sekcí na `/dashboard` a `/login`.

- Vrstva pod textem (`z-index: 0`)
- Blur 80 px, opacity 0.7
- Slow ambient drift (30 s loop, translate ±2 %)
- Pseudo element, `pointer-events: none`

**Anti-slop:** gradient slouží atmosféře, **NE buttonům**. Stripe playbook.

### 2.5 Stagger entrance

Page-level Framer Motion fade-up (12 px) entrance, 60 ms stagger mezi sekcemi.

- Hero → caption → cards (1 → 2 → 3 wave)
- 400 ms duration, ease-out
- Subtle ale signalizuje záměr (ne náhodný load)

---

## 3. Color strategy

### Action accent (jediný)

```
--color-accent:        #6B1F2E   /* wine — všechny CTA, links, focused borders, error */
--color-accent-hover:  #561620
--color-accent-muted:  rgba(107,31,46,0.10)
```

### Sémantické tinty (decorace + status, NIKDY CTA)

```
--color-sage:          #5C7A6B   /* calm, active, growth */
--color-sage-muted:    rgba(92,122,107,0.08)
--color-sage-bg:       rgba(92,122,107,0.10)

--color-ochre:         #9B7A1A   /* wealth, value, premium */
--color-ochre-muted:   rgba(155,122,26,0.08)
--color-ochre-bg:      rgba(155,122,26,0.10)
```

### Resolution napětí „víc barev" vs „one accent"

Founder explicitně chce „víc barev", reference data (Linear, Stripe) ukazují „one accent, used sparingly". Resolution:

- **Action color zůstává one** (wine) — všechny buttony, links, focused states
- **Tinty bg/status jsou dva** (sage, ochre) — atmosféra a sémantika
- Vizuálně produkt nese tři barvy, sémanticky jeden CTA

To je Stripe playbook (single CTA + decorative gradient mesh).

### Sjednocení success → sage

Původní `--color-success: #2F5237` přemapováno na `--color-sage: #5C7A6B` — sjednoceně sage napříč produktem.

---

## 4. Typography

### Font stack

```
--font-sans:   'General Sans'      /* body, buttons, labels, navigation, captions */
--font-serif:  'Instrument Serif'  /* wordmark, hero greeting, stat numbers, tagline */
--font-mono:   'JetBrains Mono'    /* code, transcripts, technical readouts */
```

### Type scale additions (Pass 3)

| Utility | Size | Weight | Style | Použití |
|---------|------|--------|-------|---------|
| `text-wordmark` | 28 px | 400 | Italic Instrument Serif | Topbar Anna |
| `text-display-serif` | 64 px | 400 | Italic Instrument Serif | Hero greeting |
| `text-stat-serif` | 44 px | 400 | Roman Instrument Serif tabular-nums | Activity stats |
| `text-tagline-serif` | 18 px | 400 | Italic Instrument Serif | Login tagline |

### Type scale unchanged (Pass 2)

`text-display`, `text-h1`, `text-h2`, `text-h3`, `text-body-lg`, `text-body`, `text-body-sm`, `text-caption`, `text-stat`, `text-mono` zůstávají.

`text-display` (sans 56 px) zůstává — používá se na page heroes mimo dashboard.

---

## 5. Motion language

### Easings

```
--ease-out-quart:    cubic-bezier(0.16, 1,    0.3,  1)    /* default */
--ease-sharp:        cubic-bezier(0.4,  0,    0.2,  1)    /* entrance */
--ease-soft-bounce:  cubic-bezier(0.34, 1.4,  0.64, 1)    /* hover lift */
```

### Durations

| Use case | Duration |
|----------|----------|
| Hover, focus | 180 ms |
| Modal expand, palette | 250 ms |
| Page entrance | 400 ms |
| Wordmark underline draw | 600 ms |
| Stat count-up | 800 ms |
| Ambient mesh drift | 30 s loop |

### Patterns

1. **Page entrance** — `motion.div initial={opacity:0, y:12} animate={opacity:1, y:0} transition={duration:0.4}`
2. **Stagger children** — `staggerChildren: 0.06` na home dashboard
3. **Wordmark underline draw** — CSS `scaleX(0)` → `scaleX(1)`, origin left, 600 ms (jednou na mount)
4. **Tool card hover** — `translateY -2px` + border accent, 180 ms
5. **Stat count-up** — Framer Motion `useMotionValue` 0 → target, 800 ms ease-out
6. **Mesh ambient drift** — CSS keyframe 30 s, translate ±2 %

### NEpoužívat

- `scale > 1` na hover (nešroubovat)
- `rotate`, `skew` (zbytečně dramatické)
- bouncing > 1.4 (cringe)
- spinners (skeletons only)
- toast notifications (inline only)

---

## 6. Component variants

### ToolCard

```ts
type ToolVariant = 'featured' | 'growth' | 'value' | 'neutral' | 'disabled';
```

Mapping per tool:

| Tool | Variant | Reason |
|------|---------|--------|
| Naslouchač | `featured` | Hero CTA, primary tool |
| Asistent | `featured` | AI primary, hero CTA |
| Zákazníci | `growth` | People = growth |
| Admin | `growth` | Operational |
| Nabídky | `value` | Documents = value |
| Profil | `value` | Identity = personal value |
| Newsletter, Pojištění, Kalendář, Inbox, CRM, Knowledge base | `disabled` | Q* 2026 placeholders |

Visual differences:

- `bg-{variant}-muted` (5–8 % alpha) — surface tint
- 1.5 px top accent line — `var(--color-{variant})` na 0.4 opacity
- Icon stays `currentColor`
- Disabled si zachovává Q* badge top-right

### LoginAdvisorCard

```ts
type AvatarTint = 'cream' | 'sage' | 'ochre' | 'wine' | 'inset';
```

5 advisorů, každý s rotující tint avatarem (88 px squircle):

- Karel → cream
- Petra → sage
- Tomáš → ochre
- Eva → wine
- Martin → inset

Squircle s subtle wave SVG decoration uvnitř (NE iniciály v kruhu).

---

## 7. Sound check (16 questions)

### Base 5.8 (10)

1. Vypadá to jako konkrétní jiný produkt nebo average dashboard?
2. Lucide ikonka u textu menu položky?
3. Helpful subtitle pod nadpisem akce?
4. Suggested prompts u AI inputu?
5. Font Inter, Geist nebo system-sans?
6. Dva accent colors?
7. Shadow na cards?
8. Centered hero?
9. „AI-powered" v copy?
10. Purple/blue gradient?

### Pass 3 extensions (6)

11. ≥2 distinct accent colors (kromě primary)?
12. Anna identity prvek na ≥3 místech?
13. Motion na home page (entrance, hover)?
14. Tool cards vizuálně diferenciované?
15. Copy character-driven?
16. Designer řekne „to vypadá jako [konkrétní reference]" nebo „AI slop"?

**Threshold:** 14/16+ pro shippable. <14 → re-do.

---

## 8. Tři rozhodnutí proti AI default patterns

### 8.1 Display serif v UI app, ne jen v PDF

**Default pattern:** SaaS apps používají sans-only pro consistency.

**Anna decision:** Instrument Serif italic v wordmarku + hero greeting + stat čísla.

**Why:** Anna je editorial-positioned platforma. Serif italic dává „magazín pro finanční poradce", ne „dashboard".

**Risk + mitigation:** font load fail → fallback `serif`, čitelné. Reward: instantní brand recognition.

### 8.2 Tinted tool cards místo single-color grid

**Default pattern:** všechny cards stejné, hover diferencuje.

**Anna decision:** každá karta má sémantický tint already at rest.

**Why:** uniformní mřížka = AI slop signature. Tinting at-rest signalizuje péči o detail.

**Risk + mitigation:** visual noise. Mitigace: tinty na 5–8 % alpha, ne flat colors. Primary action zůstává jen wine.

### 8.3 Atmospheric mesh místo gradient CTA

**Default pattern:** přidaná barva → na CTA button (purple-to-blue).

**Anna decision:** mesh jako bg dekorace hero, kde *neslouží akci*. Buttony zůstávají solid wine.

**Why:** Stripe playbook — color jako atmosféra, ne jako reklama na klik.

**Risk + mitigation:** nepostřehnutelné. Mitigace: subtle drift animace (30 s loop) přidává ambient pohyb.

---

## 9. Reference produkty (co jsme „ukradli" a co ne)

| Produkt | Co jsme vzali | Co jsme NE vzali |
|---------|----------------|---------------------|
| **Granola.ai** | Cream/parchment warmth, conversational copy | Hand-drawn personality, photography hero |
| **Linear** | Asymmetric grid, custom diagrams, motion polish | Dark mode default, gradient borders |
| **Stripe** | Editorial typography, single decorative mesh | Photography hero, multi-page animations |
| **Things 3** | Typography hierarchy přes velikost, ne ikony | Pastel accents, cute |
| **Read.cv** | Personal/portfolio feel | Multi-font experimentation |

---

## 10. Maintenance pravidla (jak to udržet při dalších feature pass-ech)

1. **Žádný nový accent color bez review.** Wine je primary, sage + ochre jsou sémantické. Čtvrtá barva = re-do.
2. **Žádný shadow na cards. Border + tint only.** Kdykoliv chceš hierarchii, použij background tint nebo border weight.
3. **Žádný gradient na buttonu / linku / tool card.** Gradienty jen jako mesh decoration.
4. **Wordmark v každém modal headu.** Konzistence brand recognition.
5. **Stat čísla v Instrument Serif roman.** Nikdy General Sans.
6. **Hero greetings v Instrument Serif italic.** Nikdy General Sans bold.
7. **Empty states: 3 prvky max** (nadpis, popis, akce). Žádný subtitle pod nadpisem.
8. **Animace pouze opacity + transform.** Nikdy width/height/top/left.
9. **Sound check 16/16 před každým commit.** Threshold 14+.

---

*Pass 3 implementation: viz `git log` po commitu „refactor(design): pass 3 — Instrument Serif wordmark, sage + ochre semantic tints, Framer Motion entrance, login admin split"*
