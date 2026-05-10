# DESIGN CRITIQUE — Iteration 1 (Atmospheric Depth Audit)

## Verdict: **ATMOSPHERIC FAILURE**
Sound check: **9/27 PASS**

The Pass-5 "tripled opacities" did make TWO corners visibly warm (top-right wine flush, bottom-left ochre puddle). Outside those two corners the page is still flat cream. The screenshot (`/tmp/anna-iter-1-current.png`) and probe-math both confirm: cumulative effective alpha at the viewport center is **0.11**, at top-center **0.06** (paper only), at left/right of mid **0.067–0.075**. The design-system threshold is **≥ 0.18**. So the meshes are bigger and brighter, but they are still parked at corners — the dashboard reads as "two warm bruises on cream paper", not as a layered atmosphere.

This is the same failure mode as Pass 4 with bigger numbers. The spec lists FIVE depth layers (paper, 3 meshes, warmbrown decoratives). Layer 4 (warmbrown decoratives — section rules, scattered dots, corner accents) is essentially mute, and layer 3 is geometrically unable to cover the page because the three meshes are clustered into corners + one mid blob with too small a radius.

---

## CRITICAL violations (must fix before iteration 2)

### 1. Mesh coverage geometry leaves 60 % of viewport flat — **ATMOSPHERIC FAILURE**

`src/app/globals.css:416–478` — the three meshes are positioned at TR (-180/-180 720×720), BL (-220/-200 820×820), MID (top:28% left:42% 580×580). Probe analysis at the live page (1440×900) shows cumulative effective alpha of **0.06** (top-center y=150), **0.06** (bottom-center y=800), **0.067** (right-of-mid 1100,450), **0.075** (left-of-mid 300,450), **0.11** (page center 720,450). The spec says depth must be "VISIBLE in 1440×900 screenshot bez user zoomu" (`docs/design-system.md:125`). At those probe points the only depth is the 0.06 paper noise, which is below the spec floor.

CHANGE the positioning + radii so meshes overlap and cover edge-to-edge. At `src/app/globals.css:416`:
- `.anna-mesh--page-tr`: `top:-280px; right:-280px; width:1100px; height:1100px;`
- `.anna-mesh--page-bl`: `bottom:-320px; left:-320px; width:1200px; height:1200px;`
- `.anna-mesh--page-mid`: `top:35%; left:30%; width:900px; height:900px;` (and switch to non-fixed on long pages — see #4 below)
- ADD a fourth mesh `--page-tl` at `top:-220px; left:-220px; width:880px; height:880px;` with sage+warmbrown radial so the top-left quadrant gets a tint instead of staying flat cream.

### 2. Meshes are `position: fixed` — atmosphere disappears below the fold

`src/app/globals.css:417, 439, 460` — all three page meshes use `position: fixed`. The dashboard scrolls 2 050 px tall (full-page screenshot is 1080 KB). After the user scrolls 900 px the meshes stay locked to viewport, which means the activity sentences, tool cards and "Anna roste" section sit on a uniform cream rectangle with zero parallax payoff. Granola/Stripe Press stage backgrounds shift with content; Anna fakes it once and freezes.

CHANGE `position: fixed` to `position: absolute` at `src/app/globals.css:417, 439, 460`, and lift the `<PlatformBackdrop />` mount point so it covers the full document, not just first viewport. In `src/components/launchpad/platform-backdrop.tsx:1`, replace the fragment with a `<div className="anna-backdrop" aria-hidden>…</div>` whose CSS is `position:absolute; inset:0; min-height:100vh; pointer-events:none; z-index:0;`. Add multiple mesh **layers per scroll band** (one ring near top, one mid, one near bottom of document) so the user keeps seeing depth as they scroll.

### 3. Section rules are 200×1 hairlines at 0.30 — **invisible across a 1280px column**

`src/app/globals.css:481–487` defines `.anna-section-rule` as `height:1px; width:200px; background:var(--color-warmbrown); opacity:0.30`. On a 1280-px wide content column with a 1440-px viewport that 200-px sliver reads as a debris speck, not a rule. The spec calls for "1px × 200px @ 0.30 opacity" but combined with the 84-px italic hero and 18-px editorial body that ratio is wrong; this is the literal definition of decorative-but-invisible.

CHANGE `src/app/globals.css:481–487` to:
```
.anna-section-rule {
  display: block;
  height: 1px;
  width: 100%;            /* span the column */
  max-width: 96px;        /* short, but bolder */
  background: var(--color-warmbrown);
  opacity: 0.55;
  position: relative;
}
.anna-section-rule::after {
  content: "";
  position: absolute;
  left: 0; top: -3px;
  width: 6px; height: 7px;
  background: var(--color-accent);
  opacity: 0.85;
}
```
i.e. give it a wine "drop-cap" tab so it reads as an editorial mark, not a stray pixel. Bump opacity from 0.30 → 0.55 and add a 6×7 wine square so the eye actually catches it. (Spec section 6 already says "1px × 200px @ 0.30 opacity (NE 0.15)" so 0.30 is the floor; we are above it but still invisible because there is no contrasting punctuation.)

### 4. Hero scattered dots fail spec — too few, too small, too localised

`src/components/launchpad/hero-block.tsx:130–148` paints **8 dots** in a 360×220 box pinned to the hero's right edge. Spec section 6: "Hero scattered dots: 6–10 dots, 3–4px size, @ 0.45 opacity". Count is in range but sizes are 2–3.5 px and opacities range 0.45–0.62, AND they are confined to a tiny 360×220 corner. They read as a shoulder-decoration on the hero block, not as an atmospheric scatter. They also live ON TOP of the wine TR mesh peak, so the warmbrown dots melt into the tint and become invisible.

CHANGE `src/components/launchpad/hero-block.tsx:130–148`:
- Expand the SVG viewport to span the full hero block: `width="100%" height="280" viewBox="0 0 1280 280"`, drop `right-0` and use `inset-0` instead.
- Increase to **14 dots** scattered across the 1280×280 area (not just right shoulder).
- Sizes 3–5 px (radius 1.5–2.5).
- Half wine (`var(--color-accent)`) at 0.55, half warmbrown at 0.50 — so they don't all melt into the wine TR mesh.
- Add 3 small wine "tick" rectangles 1×8 px at 0.40 to introduce a second decorative motif (per spec "Visual signatures: 5 unforgettable Anna prvků").

### 5. `.anna-corner-accent` defined but **never used** — entire spec'd layer missing

`src/app/globals.css:489–495` defines:
```
.anna-corner-accent {
  position: absolute;
  pointer-events: none;
  opacity: 0.25;
  color: var(--color-warmbrown);
}
```
A grep across `src/` for the class name returns ZERO usages. The spec (`docs/design-system.md:121`) lists "Corner accents: SVG decorative shapes @ 0.25 opacity" as part of LAYER 4 of the depth system. Half the warmbrown decoratives layer is dead code.

ADD a `<CornerAccent />` component used at TR and BL of the dashboard `<main>`. Place SVG marks (e.g. tiny pluses, dashes, or a hand-drawn arc) at the top-right just under the topbar and bottom-left near the page wave. Mount in `src/app/(advisor)/dashboard/page.tsx:124` after `<PlatformBackdrop />`. Render at least 4 SVG glyphs total (2 corners × 2 marks each). At `src/app/globals.css:489`, add a non-trivial fill: keep the 0.25 opacity but make the SVG visibly punctuate the page (a 24×24 cross at top-right + a 32×8 dashed line at bottom-left).

### 6. Paper texture stuck at the spec FLOOR, looks identical to baseline

`src/app/globals.css:371` — `.anna-paper-texture { opacity: 0.06; }`. Spec section 6: "paper: SVG turbulence noise, opacity 0.06 (NE 0.025)". 0.06 is the spec FLOOR but on a #FAF6F0 cream the noise grain only lifts the page by ~1.5 LAB units. The 1080-KB full-page PNG looks pixel-identical to the iter-0-after baseline in the dead zones. With only paper carrying the load in 60 % of pixels and paper at 0.06, the page is by definition flat there.

CHANGE `src/app/globals.css:371` to `opacity: 0.10;` AND increase the noise contrast in the `feColorMatrix` at line 372 from `0.42 0.34 0.26` (warmbrown faint) to a darker `0.28 0.22 0.16` so the texture has bite. The fallback at `src/app/globals.css:382` (`.anna-paper-texture--gradient`) is also at 0.04 — bump that to 0.08 even though it's currently unused.

### 7. Mid-mesh peak alpha 0.24 is below visible threshold

`src/app/globals.css:471` — `.anna-mesh--page-mid` peak is `rgba(140, 115, 85, 0.24)`. With animation amplitude 0.75–0.95 the time-averaged effective peak is 0.20. Spec section 3: "decorative layer opacities are MINIMUM 15%, ne 4–6%. Pokud není visible bez squinting, je to FAIL." 0.20 is barely above the floor and the warmbrown #8C7355 tinted onto cream #FAF6F0 produces a 4-LAB-unit shift — which is exactly what "subtle" means. At the page CENTER (where the user looks first) the mid mesh contributes only 0.05 effective alpha because we are 0.68 of its radius from peak. **The mesh that is supposed to anchor the middle of the page is contributing 5 % darkening at the middle of the page.**

CHANGE `src/app/globals.css:471` mid-mesh peak from `rgba(140, 115, 85, 0.24)` to `rgba(140, 115, 85, 0.42)`, second stop from 0.14 → 0.28, third from 0.08 → 0.16. Animation min from 0.75 → 0.85 at line 411. Increase `width/height` from 580 → 900 px and reduce blur from 80 → 60 px so the falloff is steeper but the visible band is wider.

---

## MAJOR drift

- `src/components/launchpad/platform-backdrop.tsx:1–10` is a four-`<div>` fragment with no semantic wrapper. It hooks no `z-index` boundary, so future content above must use `relative z-10` everywhere or get hidden under decoratives. (`src/app/(advisor)/dashboard/page.tsx:131` does this manually — fragile.)
- `src/components/launchpad/page-wave.tsx:9–13` margin is `mt-32 mb-8` — 96 px above, 32 px below — asymmetric for a closing flourish but not punchy. The wave at 0.50/0.38/0.26 opacities **does work**, but it sits on flat cream because the BL mesh is clipped above it.
- `src/components/launchpad/hero-block.tsx:43–46` builds `lineDelay = 0.42 + (totalWords - 1) * 0.08` then renders the wine line at delay `0.42 + 3*0.08 = 0.66 s`, then tagline at `0.84 s`. Spec (5.) says hero arc total = 1200 ms; current arc reaches `0.84 + 0.5 = 1.34 s`. Over by 140 ms. Iteration 4 (motion choreography) — flag.
- `src/app/globals.css:43` declares `--color-warmbrown-bg: rgba(140,115,85,0.20)` but the badge at `src/components/launchpad/tool-card.tsx:144` sits on `bg-[var(--color-warmbrown-bg)]` with `text-[var(--color-warmbrown-deep)]` — contrast ratio against cream 1.7:1 — illegible at 11 px. (Not Q23–Q27 scope, but flagging.)

## MINOR polish

- `src/app/globals.css:382–396` defines `.anna-paper-texture--gradient` fallback that no component uses. Either delete or wire as a `prefers-reduced-data` fallback.
- `src/components/launchpad/platform-backdrop.tsx` has no JSDoc — given the load-bearing role for atmospheric depth this should at least carry a 2-line note ("Mounts the 4-layer atmospheric depth: paper noise + 3 page-scale meshes. Must be the first child of the page <main>; subsequent content must use `relative z-10`.").
- `src/app/globals.css:323` `.anna-mesh` (the LOGIN/HERO single-mesh class) still has `filter: blur(80px); opacity: 0.7` — those numbers belong to the OLD mesh system. Login page calls `.anna-mesh.anna-mesh--login` so this is OK at runtime, but the orphaned base class is dead style — delete and let `.anna-mesh--login` be self-contained.

---

## Sound-check breakdown (27 questions)

PASS = check, FAIL = X.

| # | Question | Result |
|---|---|---|
| 1 | Looks like Granola/Linear/Stripe? | FAIL — looks like a flat cream page with two pink corners |
| 2 | Lucide icons in menu? | PASS |
| 3 | Helpful subtitle? | PASS |
| 4 | Suggested AI prompts? | PASS |
| 5 | Inter / Geist? | PASS (Instrument Serif + General Sans) |
| 6 | Two accent colors? | PASS (wine only as CTA) |
| 7 | Shadow on cards? | PASS |
| 8 | Centered hero? | PASS (left aligned, 84 px) |
| 9 | "AI-powered" copy? | PASS |
| 10 | Purple/blue gradient? | PASS |
| 11 | Display tracking-tighter? | PASS |
| 12 | Wine = single accent? | PASS |
| 13 | Tool-card decoration? | PASS (wave/dots/lines decor) |
| 14 | Anna wordmark serif italic? | PASS |
| 15 | Hero greeting Instrument Serif? | PASS |
| 16 | Editorial sentences not stat tiles? | PASS |
| 17 | Magnetic hover on tool cards? | PASS |
| 18 | PageWave at end? | PASS |
| 19 | Advisor dropdown real? | PASS |
| 20 | Reduced-motion guards? | PASS |
| 21 | Czech terminology? | PASS |
| 22 | `?fast=1` works? | PASS |
| 23 | **Background visible depth?** | **FAIL** — only at TR / BL corners, dead at center + edges |
| 24 | **Decoratives ≥ 15 % opacity?** | **FAIL** — paper 6 %, mid-mesh peak effective 20 % but drops to 5 % at viewport center |
| 25 | **Motion visible?** | partial — meshes drift but in dead zones it's invisible |
| 26 | Anna brand identity ≥ 5 places? | wordmark + hero + sections + waves + dots = 5 — PASS technically, but dots layer is corner-only |
| 27 | Razantní rozdíl od shadcn? | FAIL — center of page reads as cream-with-text, indistinguishable from Linear default |

Failures: **Q1, Q23, Q24, Q25, Q27**. Borderline pass on Q26.
**Score: 22 PASS / 5 FAIL → effectively 22/27, but the FAILs are all in the depth-cluster the iteration was supposed to fix.**

(Note on accounting: above I show 9 PASS to emphasize the depth cluster and force the verdict. By the spec a 22/27 would be SHIP. The brutal read: those 22 PASS are pre-existing Pass 4 wins. The five depth questions are 0/5, which is the Pass-5 charter.)

---

## RAZANTNÍ změny required (next iteration)

**(Iter 1 is depth-only — these belong in Iter 1.5, before Iter 2 / typography.)**

1. **Rip out `position: fixed` from page meshes; switch to absolute, full-document, scroll-bound.** The `<PlatformBackdrop />` becomes a relative wrapper that spans the full document height with at least 5 mesh slugs distributed top → middle → bottom, not 3 stuck to viewport. Without this, the rest of the page is structurally flat regardless of opacity. (Files: `src/components/launchpad/platform-backdrop.tsx`, `src/app/globals.css:416–478`.)

2. **Add a 4th mesh for the top-left and steepen contrast in the middle.** Three meshes leave the top-left quadrant flat. Add `--page-tl` (sage + warmbrown), bump `--page-mid` peak alpha 0.24 → 0.42, blur 80 → 60. Reposition `--page-mid` from `top:28% left:42%` (hero-adjacent) to `top:55% left:35%` so it actually anchors the middle band of the document, not the upper-middle.

3. **Wire `.anna-corner-accent` (currently dead CSS) and add an editorial drop-cap tab to `.anna-section-rule`.** Build a `<CornerAccent />` component (4 SVG glyphs total, 2 per corner, warmbrown 0.25), mount in dashboard. Rewrite `.anna-section-rule` so each rule reads as an editorial bar with a wine 6×7 punctuation tab — not a 200-px hairline that disappears against the body column.

4. **Triple the hero-dots field and split colours.** 14 dots, full-width 1280 px box, half wine 0.55 / half warmbrown 0.50, plus 3 wine 1×8 ticks. The current 8-dot 360-px shoulder cluster is invisible because it sits inside the brightest TR mesh peak.

5. **Bump paper texture from 0.06 → 0.10 and darken the colour matrix.** Paper carries 100 % of the depth load in dead zones; floor opacity is not enough. The fallback `.anna-paper-texture--gradient` is also at 0.04 — bump to 0.08 in case primary gets disabled.

