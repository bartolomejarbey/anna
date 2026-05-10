# Iter 5 — Editorial Copy Audit

**Verdict:** FAIL
**Sound check (copy cluster):**
- Q23 (no banned AI-powered/welcome/click-here phrases) — PASS (no hits in src/, only `app/layout.tsx` `<title>` keeps "AI asistent" which is metadata, acceptable)
- Q24 (Anna as actor in sentences) — PARTIAL PASS (editorial-activity uses "Anna připravila", "Anna teď zpracovává", "Anna vyrobila", but offer empty-state "Nabídka se vyrobí" is anonymous passive)
- Q25 (Czech declension correct in interpolated names) — **FAIL** (every interpolated `customerName` is nominative, never declined to instrumental/accusative; preposition s/se hardcoded wrong)
- Q26 (no English in user-facing copy) — PASS
- Q27 (action-verb empty states, no "Get started by") — PARTIAL FAIL (placeholder-module CTA breaks vykání, schuzky/[id] dead-end empty state, /nabidky generic empty)

## CRITICAL violations

### V1: Czech declension is broken across the entire EditorialActivity — names rendered in nominative inside instrumental/accusative slots
- **Where:** `src/components/launchpad/editorial-activity.tsx:124, 135, 145, 162`
- **What's wrong:** `customer = meeting.customerName ?? 'zákazníkem'` then rendered as `Anna připravila přepis schůzky s {customer}` and `Anna vyrobila poslední nabídku pro {customer}`. With `full_name = "Markéta Horáková"` this prints **"schůzky s Markéta Horáková"** and **"pro Markéta Horáková"**. Required: `s Markétou Horákovou` (instrumental), `pro Markétu Horákovou` (accusative).
- **Why it fails:** Pass 5 Iter 5 explicitly demands "Czech declension applied". The hero declines `Karel→Karle` (vocative table at `dashboard/page.tsx:28-35`) but the showpiece editorial sentences use raw nominatives. This is the headline editorial moment of the homepage — and it's grammatically broken on every render with a real customer name.
- **CHANGE X to Y:** Add `src/lib/czech-declension.ts` exporting `instrumental(fullName)` and `accusative(fullName)` (heuristic: Czech surnames ending `-ová`→`-ovou` instrumental / `-ovou` accusative; `-a` female→`-ou`/`-u`; male `-ek`→`-kem`/`-ka` with -e- drop; male consonant→`-em`/`-a`). Wire `<MeetingSentence>`/`<OfferSentence>` to call them.

### V2: Preposition `s` vs `se` is hardcoded — guaranteed wrong on half the dataset
- **Where:** `src/components/launchpad/editorial-activity.tsx:124` ("schůzky s ") vs `:135, 145` ("nahrávku se ", "Schůzka se ")
- **What's wrong:** Czech rule: "se" before words starting with s/z/š/ž (and many sibilant clusters), "s" otherwise. Code hardcodes — line 124 always emits `s`, 135 and 145 always emit `se`. So "Anna teď zpracovává nahrávku se Markétou" reads native-broken; "schůzky s Sárou Procházkovou" reads native-broken.
- **Why it fails:** Editorial-magazine voice cannot ship with typography-grade hero sentences whose preposition is a coin flip.
- **CHANGE X to Y:** Replace hardcoded `"s "` / `"se "` with helper `withWith(name)` that returns `"se "` when `name[0]` is in `{s, S, z, Z, š, Š, ž, Ž}` else `"s "`.

### V3: Offer empty-state breaks Anna-as-actor with passive voice
- **Where:** `src/components/launchpad/editorial-activity.tsx:156`
- **What's wrong:** `<>Nabídka se vyrobí, jakmile dokončíš schůzku v Naslouchači.</>` — "Nabídka se vyrobí" is anonymous reflexive passive. The other two empty states use Anna-as-actor ("Anna zatím nic nezpracovala") or imperative ("Začni nahráváním"). This one is the odd one out.
- **Why it fails:** Q24 demands Anna as actor or imperative; not "Nabídka se vyrobí" (the nabídka is making itself, apparently).
- **CHANGE X to Y:** `<>Anna připraví nabídku, jakmile v Naslouchači dotáhneš schůzku.</>` at `editorial-activity.tsx:156`.

### V4: Placeholder-module CTA is a vykání-tonal regression and reads like a corporate microcopy joke
- **Where:** `src/components/layout/placeholder-module.tsx:23`
- **What's wrong:** `<Button variant="secondary" disabled>Dejte mi vědět, až bude hotovo</Button>` — vykání ("Dejte"), and the entire dashboard speaks tykání ("Nahraj", "Začni", "Tvůj prostor"). Six placeholder pages render this. Also semantically nonsensical: a disabled button labeled "Dejte mi vědět" implies user agency that the disabled state denies.
- **Why it fails:** Inconsistent pronoun register (rest of app uses tykání). "Dejte vědět" on a disabled button is purposeless filler — Anna's voice is editorial, not customer-service-bot.
- **CHANGE X to Y:** Either remove the button entirely OR change to caption text: `<p className="mt-10 text-caption text-tertiary">Doraz {quarter}</p>` at `placeholder-module.tsx:21-25`.

### V5: /nabidky empty state is a generic three-word stub with no Anna voice
- **Where:** `src/app/(advisor)/nabidky/page.tsx:8-12`
- **What's wrong:** `<EmptyState heading="Žádná nabídka." action={{ label: 'Začít schůzku', href: '/schuzky/nova' }} />` — bare period-terminated noun phrase, no Anna-as-actor, no editorial sentence. Compare to the dashboard's "Anna zatím nic nezpracovala. Nahraj v Naslouchači první schůzku." Same product, two different voices.
- **Why it fails:** Q27 demands action-question empty states ("Žádná schůzka tento týden. Naplánovat novou?"). "Žádná nabídka." is the failure mode the spec explicitly bans.
- **CHANGE X to Y:** `heading="Anna ještě žádnou nabídku nevyrobila."` and add `description="Nahraj schůzku v Naslouchači — nabídka přijde s ní."` at `nabidky/page.tsx:10-11`. Keep action button.

### V6: /schuzky/[id] terminal empty state is a dead end
- **Where:** `src/app/(advisor)/schuzky/[id]/page.tsx:147-150`
- **What's wrong:** `<EmptyState heading="Schůzka ještě nebyla zpracována." />` — no action, anonymous passive ("nebyla zpracována"), no Anna voice. User landed on a meeting detail and sees a brick wall.
- **Why it fails:** Both Anna-as-actor and action-CTA missing.
- **CHANGE X to Y:** `heading="Anna se k téhle schůzce ještě nedostala."` + `action={{ label: 'Spustit zpracování', /* server action */ }}` at `schuzky/[id]/page.tsx:147-150`.

### V7: AI assistant input parrots ChatGPT — generic placeholder, vykání error
- **Where:** `src/components/ai-asistent-chat.tsx:77, 122`
- **What's wrong:** Placeholder `"Napište zprávu"` (vykání, generic ChatGPT-coded copy) and error `"Něco se pokazilo. Zkuste to prosím znovu."` (vykání + filler "prosím"). Whole rest of dashboard tyká. Asistent tool-card teases "Zeptej se Anny" then assistant opens with a vykání placeholder — register whiplash.
- **Why it fails:** Bot-bio empty state pattern is gone (good), but the placeholder is the next-most-banned pattern: "Napište zprávu" is the literal default ChatGPT placeholder Anna's design system explicitly scolds.
- **CHANGE X to Y:** Placeholder `"Zeptej se."` at `ai-asistent-chat.tsx:122`. Error `"Něco vázne. Zkus to znovu."` at `ai-asistent-chat.tsx:77`.

## Top 3 RAZANTNÍ for Phase 3 final fixes

1. **Build `src/lib/czech-declension.ts`** with `instrumental(name)`, `accusative(name)`, and `withWith(name)` — wire into `editorial-activity.tsx` lines 124/135/145/162. Without this, the homepage hero sentences are grammatically broken on every render with a real customer.
2. **Rewrite the 3 broken empty states** — `nabidky/page.tsx:10`, `schuzky/[id]/page.tsx:149`, `editorial-activity.tsx:156` — all to Anna-as-actor + action-CTA pattern. Currently inconsistent voice across product surfaces.
3. **Kill `placeholder-module.tsx:23` button + retone /nova + asistent error/placeholder to tykání** — six placeholder pages and the asistent input currently swap to vykání mid-product, breaking the founder-voice register.
