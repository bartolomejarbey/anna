# Iter 4 — Motion Choreography Audit

**Verdict:** FAIL
**Sound check (motion cluster):**
- Q14 (hero entrance arc 1.2-1.8s) — FAIL (terminates ≈1.26s, lower bound; word stagger only 0.08s × 3 words; tagline ends 0.76+0.5=1.26s)
- Q16 (mesh breathing visible) — PASS (4 meshes: 12s/15s/8s/18s, delays 0/4/2/6s, computed `animationDuration: "12s"` confirmed)
- Q18 (magnetic hover ±5-6px) — PASS at corners (-5.92, -5.85px confirmed via dispatchEvent at top-left); FAIL at center (-0.05px)
- Q20 (reduced-motion guards complete) — FAIL (`.anna-mesh--page-tl` NOT in guard at globals.css:495-510; `anna-mesh-drift` 30s legacy keyframe also unguarded; HeroDots framer-motion fade not gated by inline framer reduced-motion check — only the per-word and line/tagline are gated by `phase === 'animate'`)
- Q22 (sessionStorage one-shot + ?fast=1) — PASS (`hero-block.tsx:30-33` honors `?fast=1` AND skips sessionStorage write when skipping)

## CRITICAL violations

### V1: `.anna-mesh--page-tl` orphaned from reduced-motion guard
- **Where:** `src/app/globals.css:495-501`
- **What's wrong:** The `@media (prefers-reduced-motion: reduce)` block lists `--page-tr`, `--page-bl`, `--page-mid` but OMITS `--page-tl`. The TL mesh (added in iter-1 fix) keeps animating for vestibular-disorder users.
- **Why it fails:** Spec mandates "All animations gated behind `prefers-reduced-motion: reduce`" — accessibility violation, contradicts iter-1 mesh count (4) wiring.
- **CHANGE X to Y at globals.css:495-501:** Replace `.anna-mesh--page-tr,\n  .anna-mesh--page-bl,\n  .anna-mesh--page-mid {` with `.anna-mesh--page-tr,\n  .anna-mesh--page-bl,\n  .anna-mesh--page-mid,\n  .anna-mesh--page-tl {`

### V2: Hero entrance arc bottoms out at 1.26s — below spec floor
- **Where:** `src/components/launchpad/hero-block.tsx:46,83,101,115,122`
- **What's wrong:** With Czech greetings of 3 total words ("Dobré odpoledne, Karle"), `lineDelay = 0.42 + 2*0.08 = 0.58s`, line ends 1.08s, tagline 0.76+0.5=1.26s. Spec demands 1.2–1.8s; we're hugging the floor with no margin and on shorter names ("Karle" alone collapses below).
- **Why it fails:** Editorial entrance arc should breathe (~1.5s); 1.26s reads as utility, not scenic. Word stagger 0.08s is too tight — should be 0.12s.
- **CHANGE X to Y at hero-block.tsx:46:** `const lineDelay = 0.42 + (totalWords - 1) * 0.08;` → `const lineDelay = 0.55 + (totalWords - 1) * 0.12;`
- **CHANGE X to Y at hero-block.tsx:83,101:** `delay: idx * 0.08` → `delay: idx * 0.12` (both occurrences)

### V3: Wordmark hover breathing uses banned linear-ish easing
- **Where:** `src/app/globals.css:491`
- **What's wrong:** `animation: anna-underline-breathe 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;` uses `ease-sharp` (a Material standard easing) on a breathing loop. Breathing should use `ease-in-out` symmetric or `ease-out-quart`; `ease-sharp` is for entrances, NOT loops — produces a metronome feel, not breath.
- **Why it fails:** Design-system §5 lists `ease-sharp` for sharp transitions, NOT loops. A "breathing" 1.5× scale needs symmetric in-out.
- **CHANGE X to Y at globals.css:491:** `cubic-bezier(0.4, 0, 0.2, 1)` → `cubic-bezier(0.37, 0, 0.63, 1)` (symmetric ease-in-out)

### V4: `MotionSection` stagger gap is 60ms, spec mandates 40ms
- **Where:** `src/components/launchpad/dashboard-motion.tsx:13`
- **What's wrong:** `staggerChildren: 0.06` = 60ms between sections. Task spec verbatim: "Section stagger entrance (40ms gap) on /dashboard."
- **Why it fails:** Spec violation. Also creates noticeable delay (180ms before "Anna roste") that feels laggy on a 3-section column.
- **CHANGE X to Y at dashboard-motion.tsx:13:** `staggerChildren: 0.06` → `staggerChildren: 0.04`

### V5: HeroDots fade lacks `useReducedMotion` gate inside the animate branch
- **Where:** `src/components/launchpad/hero-block.tsx:65-71`
- **What's wrong:** When `phase === 'animate'`, `<motion.div>` wrapping `<HeroDots />` plays opacity 0→1 with delay 0.7s ALWAYS. The outer `phase` check gates ENTRY into the animate branch via `reducedMotion`, but if `useReducedMotion()` switches mid-session (e.g. user toggles OS setting), the inline framer transition keeps firing without re-checking. More importantly: `anna-hero-line` element receives `scaleX 0→1` framer motion but lacks the `anna-hero-line--draw` CSS class fallback for the static branch — meaning `prefers-reduced-motion` users in the static branch never see the wine line at all (it's `transform: scaleX(0)` from CSS? No — the `.anna-hero-line` rule has NO transform, so static branch shows the line, but it appears with no draw animation on mount when motion changes). Actually worse: when static branch renders, `.anna-hero-line` has no `transformOrigin` set; if a previous animate session left a stale transform, line could be invisible.
- **Why it fails:** Reduced-motion guard incomplete; static fallback for hero line uses inline framer `scaleX:0` then `scaleX:1` which is CSS transform animation — but the static branch (`!animate`) renders `<span className="anna-hero-line ...">` WITHOUT framer, so no transform — it works, but the dot fade still uses framer motion in animate branch without a `useReducedMotion` short-circuit on individual elements.
- **CHANGE X to Y at hero-block.tsx:65-71:** Wrap HeroDots motion with reduced-motion check or unify under `animate &&` ternary so a single guard covers all elements. Concretely: replace lines 65-71 with `{animate ? (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.7, ease: EASE }}><HeroDots /></motion.div>) : (<HeroDots />)}` — but this branch is unreachable because `!animate` returns early at line 48. Real fix: move the early-return guard to also handle dots-only-static path — DELETE the duplicated `<HeroDots />` at line 51 and rely on the unified motion block.

### V6: Legacy `.anna-mesh` (30s drift) keyframe still in stylesheet, conflicts with page meshes
- **Where:** `src/app/globals.css:243-279` (`.anna-mesh`, `.anna-mesh--hero`, `.anna-mesh--login`)
- **What's wrong:** A `.anna-mesh` rule with `animation: anna-mesh-drift 30s ease-in-out infinite;` (line 250) co-exists with page meshes. The 30s `anna-mesh-drift` keyframe (line 236-241) is a 4-step drift that no element actively uses on dashboard but pollutes the stylesheet; reduced-motion guard at 495-501 does NOT cover `.anna-mesh--hero` or `.anna-mesh--login` either. Login page mesh keeps animating for reduced-motion users.
- **Why it fails:** Dead-code + accessibility hole (login affected). Spec §5 says 8–15s breathing; the 30s legacy is non-spec.
- **CHANGE X to Y at globals.css:236-279:** DELETE the `.anna-mesh`, `.anna-mesh--hero`, `.anna-mesh--login` blocks AND the `@keyframes anna-mesh-drift` (the 30s one). Migrate login to use one of the named page meshes (`--page-tr`) with the reduced-motion guard.

### V7: Tool-card uses `whileHover scale: 1.01` on TOP of magnetic translate — competing transforms
- **Where:** `src/components/launchpad/tool-card.tsx:158,166-167,182-183`
- **What's wrong:** Framer `whileHover={{ scale: 1.01 }}` with spring transition `{stiffness: 300, damping: 22}` runs concurrently with `style={{ x: sx, y: sy }}` springs `{stiffness: 200, damping: 15}`. Two different springs on the same element produce visible micro-jitter (verified screenshot showing translate matrix with scale 1.01 — `transform: translateY(-0.0525px) scale(1.01)` at center hover means the scale fires unconditionally while magnet does nothing).
- **Why it fails:** Spec says magnetic hover ±5-6px translate WITH spring (200/15). It does not call for a competing scale spring. The 1% scale at 300/22 reads as "shadcn jitter," not editorial.
- **CHANGE X to Y at tool-card.tsx:158:** DELETE `const motionWhileHover = reducedMotion ? undefined : { scale: 1.01 };` and remove `whileHover={motionWhileHover}` props at lines 166, 182. Keep only the magnetic translate.

## Top 3 RAZANTNÍ for next iteration

1. **Wire reduced-motion guard for ALL `.anna-mesh--*` variants and delete legacy 30s mesh** — single CSS audit pass, zero risk.
2. **Stretch hero arc to 1.5s+ via 0.12s word stagger and 0.55s base lineDelay** — three numeric edits in `hero-block.tsx`.
3. **Strip `whileHover scale 1.01` from tool-card** — kill the competing spring; magnetic translate alone IS the editorial feel.
