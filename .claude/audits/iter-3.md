# Iter 3 — Color Discipline Audit

**Verdict:** FAIL
**Sound check (color cluster, 4 questions):**
- Q6 (banned color tokens — Tailwind defaults / two CTA accents) — PARTIAL FAIL (no slate/zinc/gray defaults, but sage and ochre escape "decorative only" lane and act as second + third accents on tool cards)
- Q7 (wine sole CTA) — FAIL (growth + value tool cards stamp full-saturation `bg-[var(--color-sage)]` and `bg-[var(--color-ochre)]` 1.5px top accent lines — those read as CTA stripes, not decoration)
- Q8 (decoratives never on text/CTA) — FAIL (warmbrown-deep used as `text-` on the "Q* 2026" badge, ochre + sage used as `text-` on icons, SVG decorations + Q-badge are all in the CTA target zone of a clickable card)
- Q9 (no gradients) — PARTIAL FAIL (radial mesh layers are sanctioned by spec; legacy `.anna-paper-texture--gradient` fallback at globals.css:309 ships purple-free repeating-radial-gradient that the spec never approved as production code)

## CRITICAL violations

### V1: Three accent colors on tool-card top stripes — wine no longer "sole CTA"
- **Where:** `src/components/launchpad/tool-card.tsx:32-38`
- **What's wrong:** `VARIANT_LINE` map paints the 1.5px top accent line in three different saturated hues — `bg-accent` (wine) for `featured`, `bg-[var(--color-sage)]` for `growth`, `bg-[var(--color-ochre)]` for `value`. Combined with the matching tinted backgrounds and matching saturated icon colors, three tool cards on the home grid each declare a different accent color. CLAUDE.md §5.3: "Wine `--accent` je JEDINÝ akcent v UI. Žádný druhý." design-system.md §3: sage and ochre are "DECORATIVE only."
- **Why it fails:** A 1.5px full-saturation horizontal stripe at the top of a clickable card reads as CTA emphasis, not decoration. The eye sees three competing accents on the home, not one wine system with quiet tinted scenery.
- **CHANGE X to Y:** at `tool-card.tsx:32-38`, replace `VARIANT_LINE` so growth/value/neutral all resolve to `bg-[var(--color-warmbrown)]` with `opacity-50`, leaving only `featured: 'bg-accent'` truly wine. Move sage/ochre identity entirely into the Decor SVGs (already at 0.20–0.22 opacity) and the muted `bg-*-bg` washes.

### V2: Sage and ochre as `text-` on tool-card icons — decorative tokens on foreground glyphs
- **Where:** `src/components/launchpad/tool-card.tsx:40-46`
- **What's wrong:** `VARIANT_ICON` paints the 48px tool-card icon in `text-[var(--color-sage)]` (growth) and `text-[var(--color-ochre)]` (value) — the icon is the dominant glyph on the card, foreground content, not "decoration." design-system.md §3 explicitly carves sage/ochre out of foreground use ("DECORATIVE only").
- **Why it fails:** A 48px wine icon on featured + 48px sage icon on growth + 48px ochre icon on value = three colored anchor points on the home grid. That's the "two accent colors" anti-pattern multiplied.
- **CHANGE X to Y:** at `tool-card.tsx:40-46`, set every variant's icon to `text-accent` (wine) except `disabled: 'text-tertiary'`. Variant identity belongs in Decor + bg wash, not the icon.

### V3: Warmbrown-deep used as `text-` on the Q-badge — depth token on readable copy
- **Where:** `src/components/launchpad/tool-card.tsx:144`
- **What's wrong:** Q-badge renders `text-[var(--color-warmbrown-deep)]` over `bg-[var(--color-warmbrown-bg)]`. design-system.md §3 + globals.css:38 comment: "warm brown decorative depth (NIKDY CTA, NIKDY text)." The badge IS text — "Q3 2026."
- **Why it fails:** Spec is unambiguous: warmbrown is mesh / corner / dot / rule pigment. Putting it on a text run is a token-discipline violation, exactly the sort of drift the design system was written to stop.
- **CHANGE X to Y:** at `tool-card.tsx:144`, change `text-[var(--color-warmbrown-deep)]` → `text-secondary` (`#5A5045` is warm-brown-adjacent and is the legal text token). Keep `bg-[var(--color-warmbrown-bg)]` for the wash.

### V4: Spec drift — `--accent-muted` is 0.15 in CSS but spec demands `--accent-2-bg / --accent-3-bg / --accent-4-bg` that don't exist
- **Where:** `src/app/globals.css:30-42` vs `docs/design-system.md:47-57`
- **What's wrong:** Spec lists tokens `--accent-2`, `--accent-2-bg`, `--accent-3`, `--accent-3-bg`, `--accent-4`, `--accent-4-deep`, `--accent-4-bg`. CSS ships them under inconsistent names: `--color-sage`, `--color-sage-bg`, `--color-ochre`, `--color-warmbrown`, `--color-warmbrown-deep`, `--color-warmbrown-bg`. Worse, parallel `--color-sage-muted` (0.08), `--color-ochre-muted` (0.08), `--color-warmbrown-muted` (0.06) tokens exist — the exact opacity range design-system.md §3 calls FAIL ("MINIMUM 15%, ne 4–6%") — and they are only ever defined, never visibly used. Dead tokens that contradict the spec.
- **Why it fails:** Two namings = drift over time; dead 6–8% tokens advertise the banned opacity range to whoever next reaches for a "subtle" wash.
- **CHANGE X to Y:** at `globals.css:31, 35, 41`, delete the three `*-muted` tokens entirely. Either rename the live tokens to the spec's `--accent-2 / --accent-3 / --accent-4` family OR amend `design-system.md §3` to ratify the sage/ochre/warmbrown names. One source of truth.

### V5: Ochre + sage stamped as full-saturation icon strokes on login-advisor cards
- **Where:** `src/components/login/login-advisor-card.tsx:14-20`
- **What's wrong:** Five demo advisors each render the wave SVG at 0.7 opacity in `text-[var(--color-sage)]`, `text-[var(--color-ochre)]`, `text-accent`, etc. The login screen — the single first impression of Anna — opens with three competing accent identities painted as full-saturation strokes (0.7 alpha is not "decorative dust," it's foreground).
- **Why it fails:** Q12 from design-system.md §9 sound check: "Wine je jediný akcent v UI? → must be yes." Login fails this.
- **CHANGE X to Y:** at `login-advisor-card.tsx:14-20`, collapse `TINT_STROKE` so all five tints resolve to `text-accent` for the SVG, with the variant identity carried only by `TINT_BG` (which is already correctly muted). Drop the `opacity-70` — wine at full alpha on a tinted wash reads as one design language, not five.

### V6 (bonus): Hero scattered dots fire warmbrown-deep at 0.62 opacity — depth token at near-CTA punch
- **Where:** `src/components/launchpad/hero-block.tsx:141-158`
- **What's wrong:** Hero dots oscillate 0.48–0.62 opacity, mixing wine `var(--color-accent)` and `var(--color-warmbrown-deep)` within a few px of each other. design-system.md §6 specifies hero dots at 0.45 opacity in warmbrown — the file ships values up to 0.62 in warmbrown-deep, which is the deeper token reserved for emphasis (corner accents, section rules), not page-scale dot scatter.
- **Why it fails:** Mixing the two warmbrown tokens at near-CTA opacity blurs the depth/accent boundary the four-color system is supposed to enforce.
- **CHANGE X to Y:** at `hero-block.tsx:141-158`, cap all warmbrown dot opacities at `0.45` and use only `var(--color-warmbrown)` (drop `-deep` from dots). Reserve `-deep` for the section rule + corner accent only.

## Top 3 RAZANTNÍ for next iteration

1. **Collapse the three-accent stripe to one wine, two warmbrowns** at `src/components/launchpad/tool-card.tsx:32-46` — `VARIANT_LINE` and `VARIANT_ICON` both lose their sage/ochre branches; only the bg wash + Decor SVG carry growth/value identity. Re-screenshot dashboard; only one saturated stripe (featured wine) should remain visible.
2. **Resolve the spec/CSS token drift** at `src/app/globals.css:30-42` and `docs/design-system.md:47-57` — pick one naming (sage/ochre/warmbrown won the implementation race; rename the spec or the CSS, but eliminate the parallel names). Delete `--color-*-muted` 6–8% tokens that advertise the banned opacity range.
3. **Strip `text-warmbrown-deep` from every text run** — start at `src/components/launchpad/tool-card.tsx:144` (Q-badge), then grep `text-\[var\(--color-warmbrown` and `text-\[var\(--color-sage\)\]` and `text-\[var\(--color-ochre\)\]` across `src/`, replacing every foreground hit with either `text-accent` (CTA), `text-primary` (copy), or `text-secondary` (subdued copy). Decoratives go on `fill=` and `bg-*-bg` only.
