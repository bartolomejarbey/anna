# DESIGN CRITIQUE — Iteration 2 (Typography drama)

## Verdict: **FAIL**
Sound check (typography subset, Q5 / Q11 / Q15): **0 / 3 PASS**

Scope: typography only. Atmospheric depth (iter-1) and motion (iter-4) explicitly excluded.

Pages inspected at viewport 1440×900: `/dashboard?fast=1`, `/login`, `/schuzky?fast=1`, `/schuzky/nova?fast=1`.

Source of truth: `docs/design-system.md` §4.

```
Spec scale                        Actual scale (live, dashboard)
──────────────────                ──────────────────────────────
Hero    84px IS italic, lh 1.0    84px IS italic, lh 1.0      OK (size+font)
H1      48px IS italic            36px GS 500 (sans, roman)   FAIL — wrong font, wrong style, undersized
H2      28px GS 500, -0.01em      12px GS 500 uppercase       FAIL — H2 stolen by caption tier, never present
Body    16px GS 400, lh 1.55,     18px GS 400, lh 1.55,       FAIL — size +12.5%, scale token missing 16
        max-width 72ch              max-width 72ch
Caption 12px GS 500, 0.12em       12px GS 500, 0.08em         FAIL — tracking undershoots (8 % vs 12 %)
Stat    56px IS roman tabular     26px IS roman tabular       FAIL — 46 % of spec, lost as drama element
```

Distinct font-sizes in the rendered dashboard tree (every node ≥ 13 px with text ≤ 60 chars):

```
13 / 15 / 16 / 18 / 20 / 22 / 26 / 28 / 84
```

Nine sizes. The spec defines six display levels. The 13 / 15 / 16 / 18 / 20 / 22 cluster is the entire problem in one screenshot — six sizes packed inside a 9 px range.

---

## CRITICAL violations (must fix before iteration 3)

### 1. H1 is rendered in General Sans roman 36px / weight 500 — spec mandates Instrument Serif italic 48px
File: `src/app/globals.css:80-85`, used in `src/app/(advisor)/schuzky/page.tsx:27`, `src/app/(advisor)/zakaznici/page.tsx:50`, `src/app/(advisor)/nabidky/page.tsx:7`, `src/app/(advisor)/profil/page.tsx:33`, `src/app/(admin)/admin/page.tsx:148`, `src/app/(advisor)/schuzky/[id]/page.tsx:87`, `src/components/layout/placeholder-module.tsx:19`.

```
@utility text-h1 {
  font-size: 36px;       /* spec: 48 */
  font-weight: 500;      /* spec font is Instrument Serif italic, 400 */
  letter-spacing: -0.015em;
  /* font-family missing — falls back to body General Sans */
}
```

CHANGE the `text-h1` utility in `src/app/globals.css:80` to:

```
@utility text-h1 {
  font-family: var(--font-serif);
  font-style: italic;
  font-weight: 400;
  font-size: 48px;
  line-height: 1.05;
  letter-spacing: -0.02em;
}
```

Then rebuild every page H1 — Schůzky, Zákazníci, Nabídky, Profil, Admin, Schůzka detail — none use the serif italic that is the editorial signature.

### 2. There is no real H2 anywhere in the dashboard tree — every "h2" is the 12 px caption tier
File: `src/app/(advisor)/dashboard/page.tsx:138, 150, 196`.

```
<h2 className="mb-6 text-platform-cap text-tertiary">Dnes na Anně</h2>
<h2 className="mb-6 text-platform-cap text-tertiary">Nástroje na Anně</h2>
<h2 className="mb-6 text-platform-cap text-tertiary">Anna roste</h2>
```

Computed: `font-size: 12px`, `letter-spacing: 0.96px` (≈ 0.08em), `text-transform: uppercase`. The spec H2 is **28 px General Sans 500, tracking -0.01em**. The semantic level that should be the dashboard's secondary drama is being rendered at a third of its size, in uppercase caption styling.

Adjacent-level jumps are now:
- 84 px hero → 12 px section head = **7×** (spec says ~3× between levels)
- 12 px section head → 18 px editorial body = **0.67× inverted** (children larger than parent)

Both directions broken at the same boundary.

CHANGE `src/app/(advisor)/dashboard/page.tsx:138, 150, 196` from `text-platform-cap text-tertiary` to a genuine H2: keep the caption as `<span class="text-platform-cap text-tertiary">` ABOVE the section, then below it add `<h2 className="text-h2 text-primary">…</h2>` (28 px General Sans 500). The current copy ("Dnes na Anně", "Nástroje na Anně", "Anna roste") is too vague — replace with editorial cadence: "Dnes" / "Nástroje" / "Co přijde". Or, if the caption is the section head, drop the H2 element entirely and use H3 for the next tier — currently you get the worst of both: `<h2>` semantics, caption styling, no editorial weight.

### 3. Body copy lives at 18 px when spec mandates 16 px / lh 1.55 / 72ch
File: `src/app/globals.css:200-207` (`text-editorial`).

```
@utility text-editorial {
  font-size: 18px;       /* spec: 16 */
  line-height: 1.55;
  max-width: 72ch;       /* good */
}
```

`text-body` (`globals.css:108-113`) sits at 15 px. There is no 16 px reading body in the type scale. Editorial sentences on dashboard render at 18 px (815 px wide ≈ 72ch — that part is honored). But spec says **Body: 16 px**, and the `text-body-lg` utility at 17 px is also wrong (spec says 19 px for body-large).

This collapses the drama between body and tagline (22 px serif italic) — only 4 px difference between the editorial body and the hero tagline; the eye reads them as one tier.

CHANGE `src/app/globals.css:200` `text-editorial` `font-size` from `18px` to `16px`. CHANGE `src/app/globals.css:108` `text-body` from `15px` to `16px` (consolidate). DELETE the 17px `text-body-lg` utility or reset to spec's 19 px. Audit every `text-body-lg` callsite afterwards — currently used only in `src/app/login/admin/page.tsx:48`.

### 4. Stat is rendered at 26 px when spec demands 56 px Instrument Serif roman tabular
File: `src/app/globals.css:227-236` (`text-stat-inline`), used in `src/components/launchpad/editorial-activity.tsx:46` (`<Num>` component).

```
@utility text-stat-inline {
  font-size: 26px;       /* spec stat: 56 */
  vertical-align: -0.06em;
}
@utility text-stat {
  font-size: 32px;       /* spec stat: 56 */
}
@utility text-stat-serif {
  font-size: 44px;       /* spec stat: 56 */
}
```

Three competing stat utilities, none of them at 56 px. The numbers in "Tento týden tu máš **2** schůzky — žádná zatím není hotová" are the only quantitative anchor on the dashboard and they render 6 px taller than the surrounding 18 px body. Spec says 56 px. The whole point of `text-stat` in editorial typography is the **3.5× ratio against body** — currently it is 1.4×. Wallpaper noise, not drama.

CHANGE `src/app/globals.css:227` `text-stat-inline` `font-size` from `26px` to `56px`, line-height `1`, keep tabular-nums. If a smaller inline variant is needed for "v týdnu **2** schůzky", create a new `text-stat-inline-mini` at 32 px tabular — but the primary stat is 56 px. Audit `editorial-activity.tsx:46` rendering: 56 px inline inside an 18 px body line will require alignment tuning (line-height + vertical-align).

### 5. Hero italic shift uses fixed `-ml-4` (16 px), not optical adjustment — and shifts only on the `Karle` line, not the comma break
File: `src/components/launchpad/hero-block.tsx:54, 91`.

```
<span className="block">{greetingWords.join(' ')}</span>
<span className="block -ml-4">{name}</span>
```

Computed: line 1 marginLeft 0, line 2 marginLeft -16 px. At 84 px italic Instrument Serif the optical overhang of an italic capital varies — `K` (Karle) needs ~10–12 px, but a leading `D` (Dobré) on line 1 has its own slope into negative space that should also be hung. Fixed -16 always undercompensates capitals with steep diagonals (V/W/X/Y) and overcompensates for round ones (O/Q). Per spec §4 "tracking -0.025em" is honored, but the italic-play promise is a **single-line shift**, never extended to other entry vocatives.

Worse: when the greeting is "Dobrý večer," and name "Bartoloměji", the comma sits at the end of line 1 with no kerning compensation — it leaves a visible gap before the line break. There is no `text-wrap: balance` or hanging punctuation.

CHANGE `src/components/launchpad/hero-block.tsx:54, 91` from `-ml-4` to `-ml-[0.18em]` (relative to font-size, scales with hero), AND add `text-indent: -0.06em` on the first span to hang the leading capital, AND wrap the trailing comma in `<span className="text-balance">` or use `text-wrap: balance` on the H1. Verify across all five vocatives in `dashboard/page.tsx:28-35` (Karle / Petro / Tomáši / Evo / Martine / Bartoloměji) by switching demo advisors and screenshotting.

### 6. ToolCard title at 20 px collapses against editorial body at 18 px — 1.1× scale-jump where 3× is mandated
File: `src/components/launchpad/tool-card.tsx:105-113`, uses `text-h3` from `globals.css:94-99`.

```
const titleClass = cn('text-h3 tracking-tight', …);
const descClass  = cn('mt-2 text-body-sm line-clamp-2', …);
```

Computed: title 20 px GS 500, description 13 px GS 400. Title-to-description ratio = 1.54×, description-to-editorial-body = 0.72×. The card title at 20 px is **2 px larger** than the editorial sentences on the same screen. Visually the cards collapse into the body-copy gray.

Spec H3 — implicit in `docs/design-system.md` §4 since it lists Hero / H1 / H2 / Body / Caption / Stat without H3 — should be derived from the 3× rule. If H2 = 28 px and Body = 16 px, then card title is either H2 (28 px, treated as a section head) or a new H3 = 19–22 px serif **italic** to mirror the hero motif. Sans roman 20 px medium is the most generic possible setting.

CHANGE `src/components/launchpad/tool-card.tsx:105` `titleClass` to use a new `text-tool-title` utility set to 22 px Instrument Serif italic 400, tracking -0.01em, line-height 1.15. Add the utility to `globals.css`. This keeps the editorial italic motif on every card head and creates a clear 22 → 13 = 1.7× tool-card hierarchy that doesn't compete with body 16 px.

### 7. Login page has zero heading semantics — wordmark is not h1, advisor names are p with `text-h3`
File: `src/app/login/page.tsx:23-39`.

The login screen has no `<h1>`, `<h2>`, or `<h3>` element on the page (verified — `h1: []`, `h2: []`, `h3: []` in computed snapshot). The wordmark renders as `<AnnaWordmark>`, advisor names render as `<p className="truncate text-h3 text-primary">`. Five `<p>` elements with `text-h3` class is using the typography token for layout but breaking heading semantics, screen-reader nav, AND the editorial promise — login is the moment Anna introduces herself; spec §8 visual signature 1 is "Anna wordmark — Instrument Serif italic + animated wave underline" — that wordmark MUST be the page H1.

CHANGE `src/app/login/page.tsx:24-26` from `<header><AnnaWordmark size="hero" animate /></header>` to `<header><h1 className="sr-only">Anna</h1><AnnaWordmark size="hero" animate aria-hidden /></header>` — OR have `AnnaWordmark` render `<h1>` internally when used in a hero context. CHANGE `src/components/login/login-advisor-card.tsx` advisor-name `<p className="text-h3">` to `<h2 className="text-h2">` per advisor. Currently the login type stack has no h-rank distinctions despite 5 visual tiers.

### 8. Dashboard hero h1 is the only element honoring serif italic — every other "page h1" reverts to sans-roman
Files: `src/app/(advisor)/schuzky/nova/page.tsx:33` uses `text-display` (56 px GS 500 roman, NOT serif italic). `src/app/(advisor)/schuzky/page.tsx:27` uses `text-h1` (36 px GS 500 roman). `src/app/(advisor)/zakaznici/page.tsx:50`, `src/app/(advisor)/nabidky/page.tsx:7`, `src/app/(advisor)/profil/page.tsx:33`, `src/app/(admin)/admin/page.tsx:148` — same.

The editorial signature (Visual Signature 1, Visual Signature 2 in `docs/design-system.md` §8) is **Instrument Serif italic with negative-margin shift**. Currently this lives ONLY at `/dashboard`. Every other route opens with sans-roman 36–56 px — indistinguishable from a Tailwind starter.

CHANGE every page H1 to use `text-h1` (after fix #1 lands the serif italic). Rebuild `schuzky/nova/page.tsx:33` to use `text-h1` 48 px serif italic, NOT `text-display` 56 px sans. Audit all 7 page-H1 callsites listed above.

### 9. Caption tracking is 0.08 em where spec mandates 0.12 em
File: `src/app/globals.css:209-216` (`text-platform-cap`) and `src/app/globals.css:122-128` (`text-caption`).

```
@utility text-platform-cap { letter-spacing: 0.08em; }   /* spec: 0.12 */
@utility text-caption       { letter-spacing: 0.04em; }  /* spec: 0.12 */
```

Computed on dashboard: `letter-spacing: 0.96px` at `font-size: 12px` = 0.08 em. Caption tracking is what makes uppercase caption tiers feel intentional vs. accidental shouting. 0.04 em (the `text-caption` utility) is **3× too tight**. 0.08 em (the `text-platform-cap` utility) is 33% too tight.

CHANGE `src/app/globals.css:127` `text-caption` `letter-spacing` from `0.04em` to `0.12em`. CHANGE `src/app/globals.css:214` `text-platform-cap` `letter-spacing` from `0.08em` to `0.12em`. Then collapse the two utilities into one — they exist for the same role (12 px, 500, uppercase, tracked) and the 0.04 vs 0.08 difference is itself an internal inconsistency.

---

## MAJOR drift

- `text-display` utility (`globals.css:73-78`) at 56 px sans 500 still exists and is used at `/schuzky/nova` (h1, 56 px). After spec compliance this token should be **deleted** — every page-display is either Hero (84 px) or H1 (48 px serif italic). The 56 px sans tier is a relic from the pre-Pass-5 system.
- `text-display-serif` utility (`globals.css:153-160`) at 64 px serif italic 400 exists but is **uncalled** in any `.tsx`. Dead utility. Delete.
- `text-tagline-serif` (18 px italic, `globals.css:172-179`) and `text-tagline-hero` (22 px italic, `globals.css:191-198`) are two competing italic body taglines — 4 px apart, both serif, both 400. Pick one and delete the other.
- `text-pluri-italic` (14 px italic, `globals.css:218-225`) is uncalled. Delete.
- Family fallback for `--font-serif` is `'Georgia', serif` (`globals.css:56`) — Georgia at 84 px italic for the hero is *visibly* wrong in any FOIT/FOUT moment. Add `display=swap` is OK but no preconnect / no `font-display: optional` consideration; viewer sees Georgia hero on first load. Add `<link rel="preload">` for Instrument Serif italic 400 in `src/app/layout.tsx`.
- Body classes mix `text-body` (15 px), `text-body-sm` (13 px), `text-body-lg` (17 px), `text-editorial` (18 px) — four body sizes is editorial slop. Spec defines two: Body 16 / Body large 19. Reduce to two.
- Tool-card description at 13 px (`text-body-sm`) is below the 16 px reading body — spec doesn't define a body-sm tier at all. The 13 px is closer to caption sizing without the caption styling. Rename to `text-meta` and constrain to 14 px / 1.4 / 0 / regular.

## MINOR polish

- `font-feature-settings: 'ss01', 'ss02'` on `body` (`globals.css:243`) — General Sans's SS01/SS02 are alternate `a` and `g`. Verified loaded but no visible impact at body sizes; check if these stylistic sets actually exist in the loaded weight.
- Hero `<h1>` line-height is `84px` (1.0). With descenders on `g` in "Dobré" the cap line clips visually against `Karle` below. Bump to `lh: 1.05` per spec, or 88 px exact.
- `text-tagline-hero` letter-spacing `-0.005em` (`globals.css:197`). At 22 px this is 0.11 px — sub-pixel. Either commit to -0.01em or drop to 0.
- `text-stat-inline` has `vertical-align: -0.06em` (`globals.css:235`) — magic number for inline-with-body alignment. After fix #4 (56 px stat), this needs recalibration.
- Admin page `<h1 className="text-body font-medium">` (`src/app/(admin)/layout.tsx:15`) — admin topbar wordmark sized at body 15 px. This is the admin product entry-point and it reads like a footer note.

## RAZANTNÍ změny required (next iteration — typography rebuild before color)

1. **Rebuild the type scale to 5 explicit tiers, delete the rest.**
   Hero (84 IS italic) / H1 (48 IS italic) / H2 (28 GS 500) / Body (16 GS 400 72ch) / Caption (12 GS 500 0.12em uppercase). Stat is its own role at **56 IS roman tabular**. That is six utility classes total. Delete `text-display`, `text-display-serif`, `text-body-sm`, `text-body-lg`, `text-tagline-serif`, `text-tagline-hero`, `text-pluri-italic`, `text-stat-inline`, `text-stat-serif`, `text-h3` (re-derive H3 if needed from H2 / 1.5). Currently there are **15 typography utilities** in `globals.css`; spec implies six. Cut by 60%.

2. **Wire serif italic to every page hero, not just `/dashboard`.**
   `text-h1` becomes Instrument Serif italic 48 px. Apply to all 7 page-H1 callsites. The editorial promise is *every* route opens with the same italic voice. `/schuzky/nova` should NOT be 56 px sans — it should be 48 px serif italic, possibly with the same negative-margin shift treatment as the dashboard hero ("Nová schůzka," with "schůzka" hung -0.18em).

3. **Make the stat the second drama element on the dashboard.**
   At 56 px serif roman tabular-nums beside 16 px body, the stat is the typographic anchor. Currently it's 26 px and indistinguishable from the surrounding text. The 56→16 ratio (3.5×) is the visual ratchet that makes editorial-magazine layouts feel substantial. Implement once and reuse on `/admin` (current admin "today's meetings" is `text-display` 56 px sans — should be 56 px serif roman tabular).

4. **Ban every weight that isn't 400 or 500. Audit every `font-medium` and confirm intent.**
   Spec §4: "Weight extremes (per Anthropic cookbook): 400 body / 500 display. NIKDY 400/600." Currently all weights are 400 or 500 (good — no font-bold, no font-semibold leakage in source) but the `text-h1` utility uses `font-weight: 500` on roman GS where the spec wants Instrument Serif italic 400. After fix #1 the rule reads cleanly: 400 for serif italic display + body, 500 for sans uppercase caption + sans medium H2. Make this the entire weight table.

5. **Add hanging punctuation + text-wrap: balance to all serif italic display elements.**
   Hero, H1 italics, page-display italics — all need `text-wrap: balance` on Chrome 114+ and `hanging-punctuation: first last` on Safari 17+. Currently zero hanging-punctuation rules exist in `globals.css` (`grep -c hanging-punctuation` = 0). Editorial italic without hanging punctuation reads as Word-doc italic.

---

Screenshots saved:
- Full dashboard: `/tmp/anna-iter-2-current.png`
- Login: `.playwright-mcp/anna-iter-2-login.png`
- Schůzky list: `.playwright-mcp/anna-iter-2-schuzky.png`
- Schůzky/nova: `.playwright-mcp/anna-iter-2-nova.png`
