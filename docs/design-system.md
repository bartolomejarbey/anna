# Anna Design System v1.0

> Single source of truth for Anna's visual language. Read before any design task. Override CLAUDE.md section 5 where they conflict (this file is more recent and stricter).

---

## 1. Aesthetic Direction (commitment)

**EDITORIAL MAGAZINE pro finanční poradce.** Ne SaaS dashboard, ne CRM.

**Tone:** editorial · crafted · quiet · substantial · czech.

**Anti-tone:** corporate banking · crypto neon · AI-template purple · SaaS utility · Apple keynote (overused).

**Reference produkty PRO:** Stripe Press · Granola.ai · Things 3 · Read.cv · Linear · It's Nice That magazine

**Reference produkty CON:** shadcn dashboards · Notion clones · Vercel templates · "modern SaaS" · v0 outputs

---

## 2. Anti-patterns (NEVER — porušení = re-do)

**Typography:** Inter, Geist, Roboto, Arial, system-sans, Space Grotesk, Poppins, font-weight 600 default

**Color:** purple/blue gradients, slate-/zinc-/neutral-* defaults, blue-500 CTA, neon, two CTA accents

**Layout:** centered hero, 3-card symmetric grids, sidebar dashboard, shadow-* on cards, p-8 default

**Motion:** spinners (use skeletons), bounce on hover (use ease-out-quart), bounce > 1.4

**Backgrounds:** solid color, opacity < 8% on decorative layers (= invisible = slop)

**Copy:** "AI-powered", "Get started by", "smart", "intuitive", suggested prompts

---

## 3. Color Tokens (exact hex)

```
--bg-canvas:        #FAF6F0  (warm cream, dominant 70%+ of pixels)
--bg-surface:       #FFFFFF
--bg-subtle:        #F2EBE0
--bg-inset:         #E8DFCF

--accent:           #6B1F2E  (wine — SINGLE CTA accent, links, focus)
--accent-hover:     #561620
--accent-muted:     rgba(107, 31, 46, 0.15)   [INCREASED from 10%]

--accent-2:         #5C7A6B  (sage — DECORATIVE only)
--accent-2-bg:      rgba(92, 122, 107, 0.18)  [INCREASED]

--accent-3:         #9B7A1A  (ochre — DECORATIVE only)
--accent-3-bg:      rgba(155, 122, 26, 0.18)  [INCREASED]

--accent-4:         #8C7355  (warm brown — depth element)
--accent-4-deep:    #6B5742  (deeper for emphasis)
--accent-4-bg:      rgba(140, 115, 85, 0.20)  [INCREASED]

--text-primary:     #1A1A1A
--text-secondary:   #5A5045
--text-tertiary:    #8C8276
```

**CRITICAL RULE:** decorative layer opacities are MINIMUM 15%, ne 4–6%. Pokud není visible bez squinting, je to FAIL.

---

## 4. Typography Tokens

**Fonts:**
- Display: `Instrument Serif` (Google Fonts, italic + roman)
- Body: `General Sans` (Fontshare, weights 400 + 500)
- Mono: `JetBrains Mono`

**Weight extremes** (per Anthropic cookbook): 400 body / 500 display. NIKDY 400/600.
**Size jumps:** 3× between levels, ne 1.5×.

**Type scale:**
```
Hero display:   84px Instrument Serif italic, line-height 1.0,  tracking -0.025em
H1:             48px Instrument Serif italic
H2:             28px General Sans 500,         tracking -0.01em
Body large:     19px General Sans 400, line-height 1.6
Body:           16px General Sans 400, line-height 1.55, max-width 72ch
Caption:        12px General Sans 500, uppercase, tracking 0.12em
Stat:           56px Instrument Serif roman tabular-nums
```

---

## 5. Motion Tokens

**Easings:**
- `ease-out-quart`: `cubic-bezier(0.16, 1, 0.3, 1)`
- `ease-sharp`: `cubic-bezier(0.4, 0, 0.2, 1)`
- `ease-soft-bounce`: `cubic-bezier(0.34, 1.4, 0.64, 1)`

**Durations:**
- 150ms hover
- 250ms modal
- 600ms hero text reveal
- 1200ms hero arc total
- 8–15s breathing meshes (NOT synced)

**CRITICAL RULE:** motion JE viditelná. Pokud je tak subtle že ji ani neuvidíš, je to FAIL.

---

## 6. Background System (multi-layer atmospheric depth)

```
LAYER 1 — base:        cream canvas #FAF6F0
LAYER 2 — paper:       SVG turbulence noise, opacity 0.06 (NE 0.025), fixed full-screen
LAYER 3 — meshes (3):  opacities 0.18–0.25 (NE 0.04–0.06)
  Mesh A — top-right:   wine + sage gradient,        blur 100px, breathing 12s
  Mesh B — bottom-left: ochre + warmbrown gradient,  blur 120px, breathing 15s
  Mesh C — middle:      warmbrown + cream,           blur 80px,  breathing 8s
LAYER 4 — warmbrown decoratives:
  Section rules:        1px × 200px @ 0.30 opacity (NE 0.15)
  Hero scattered dots:  6–10 dots, 3–4px size,         @ 0.45 opacity
  Corner accents:       SVG decorative shapes         @ 0.25 opacity
LAYER 5 — content (cards, text)
```

**CRITICAL RULE:** cumulative depth must be VISIBLE in 1440×900 screenshot bez user zoomu. Pokud screenshot vypadá jako solid cream s textem, je to **ATMOSPHERIC FAILURE**.

---

## 7. Spacing Scale (4px base)

`4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 / 128 / 192`

No values outside this scale.

---

## 8. Visual Signatures (5 unforgettable Anna prvků)

1. **Anna wordmark** — Instrument Serif italic + animated wave underline
2. **Editorial display typography** — italic hero with negative margin shift
3. **Tinted tool card variants** — featured / growth / value with decorative shapes
4. **Multi-layer atmospheric backgrounds** — paper + 3 meshes + warmbrown decorations
5. **Choreographed entrance** — mesh → dots → words → line → tagline → sentences

---

## 9. Sound Check (27 questions)

For every shipped screen:

**From CLAUDE.md / Pass 3-4 (1–22):**

1. Does it look like Granola/Linear/Stripe, not average dashboard?
2. Lucide icons in menu items? → fail
3. Helpful subtitle pod nadpisem? → fail
4. Suggested prompts u AI inputu? → fail
5. Font Inter / Geist / system-sans? → fail
6. Two accent colors? → fail
7. Shadow on cards? → fail
8. Centered hero? → fail
9. "AI-powered" copy? → fail
10. Purple/blue gradient? → fail
11. Display text bez tracking-tighter? → fail
12. Wine je jediný akcent v UI? → must be yes
13. Tool card decoration na featured/growth/value? → must be yes
14. Anna wordmark Instrument Serif italic v topbaru? → must be yes
15. Hero greeting Instrument Serif?
16. Editorial sentences místo plain stat tiles?
17. Magnetic hover na tool cards?
18. PageWave signature na konci?
19. Advisor dropdown reálný (click-outside, ESC)?
20. Reduced-motion guards napříč všemi anna-* animacemi?
21. Czech jazyk dodržen (klient = poradce, zákazník = jeho klient)?
22. ?fast=1 dev override funguje?

**Pass 5 NEW (23–27):**

23. Pozadí má VISIBLE depth (ne flat cream)? Ověř Playwright screenshot.
24. Decorative layers opacity ≥ 15% (ne invisible)?
25. Motion je VISIBLE bez zoomu nebo squinting?
26. Anna brand identity prvek na 5+ místech?
27. Razantní rozdíl od shadcn dashboard?

**Threshold: 23+/27 PASS.** Anything less = re-iterate.

---

## 10. Reference Workflow

Před každým design taskem:

1. Read this file (`docs/design-system.md`)
2. Read `.claude/skills/frontend-design/SKILL.md` (Anthropic official)
3. Commitment: 4-question framework (purpose, tone, constraints, differentiation)
4. Implement with Instrument Serif + General Sans + 4-color decorative system + visible depth
5. Self-critique screenshot vs this file
6. Iterate
