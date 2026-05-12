# Lukáš FinPlan — vývojová kopie modulu Finanční plán

> **Pro Lukášova Claude Code:** Tohle je tvoje pískoviště. Pracuj jen v tomto modulu, nesahej na originál.

## Tvůj scope

**Smíš editovat / vytvářet:**
- `src/components/lukas-finplan/**` — všechny komponenty modulu
- `src/app/(advisor)/lukas-finplan/**` — stránky modulu (list / detail / novy / sdilet)

**Smíš číst pro pochopení (ne editovat):**
- `src/components/finplan/**` — originál, slouží jako reference odkud kopie pochází
- `src/lib/calculator/finplan/**` — sdílená EFA matematika (1:1 s Excelem, nikdy neměnit)
- `src/lib/actions/finplan*.ts` — sdílené server actions (čtení DB, vytváření session)
- `src/lib/finplan/**` — sdílené utilities (token, extrakce z dokumentů)
- `src/components/ui/**` — sdílené Apple-style primitives (Card, Button, PageShell, …)
- `src/app/globals.css` + `CLAUDE.md` v rootu — design system, brand pravidla

**NESAHEJ na:**
- `src/components/finplan/**` (produkční verze — bartolomějova doména)
- `src/app/(advisor)/financni-plan/**` (produkční routy)
- Jakýkoliv jiný modul (schůzky, zákazníci, nabídky, dashboard, admin, plan/[token])
- Databázové migrace, server actions, kalkulátor, RLS policies
- `package.json`, `next.config.ts`, build konfigurace

## Architektura modulu

Modul je **úplnou kopií** finančního plánu — používá stejnou DB (`finplan_sessions`, `finplan_analyses`, …), stejné server actions, stejnou matematiku. Jediný rozdíl je vizuální vrstva.

```
src/app/(advisor)/lukas-finplan/
├── page.tsx                 — list všech plánů
├── novy/page.tsx            — vytvořit nový plán (formulář)
├── [id]/page.tsx            — detail plánu (analýza + PDF)
└── sdilet/[id]/page.tsx     — share link panel

src/components/lukas-finplan/
├── new-finplan-form.tsx     — formulář pro založení sessionu
├── plan-screen.tsx          — root analýzy
├── share-link-panel.tsx     — share UI po vytvoření
├── customer-upload.tsx      — (customer-facing kopie, zatím nepoužitá)
├── customer-form-wizard.tsx — (customer-facing kopie, zatím nepoužitá)
├── plan-thanks.tsx / plan-error.tsx
├── notes-panel.tsx
├── debug-panel.tsx
├── sections/                — sekce v plan-screen (client-header, cashflow, insurance, retirement)
└── ui/                      — interní mikro-primitives (info-popover, disclosure-row, section-frame, hero-number, format)
```

## Workflow

1. Spusť `npm run dev` a otevři `http://localhost:3000/dashboard` — tool card **„Lukáš FinPlan"** tě tam zavede.
2. Iteruj na UI uvnitř svojí složky.
3. Před commitem: `npm run typecheck && npm run lint`.
4. Commits push na `main` (nebo feature branch + PR — domluv s Bartolomějem).

## Design pravidla

Plně respektuj Apple-style design system v `/CLAUDE.md` sekce 5:
- Inter font, ink/canvas/Apple blue palette
- pill buttons (rounded-full), radius-18 cards, radius-12 inputs
- žádné shadows (kromě modal/dropdown), border-only hierarchie
- Phosphor Icons (SSR variant pro Server Components)
- wine zachováno **jen** pro Anna wordmark

## Když si nejsi jistý

Nedělej. Napiš Bartoloměji nebo zkopíruj originální chování 1:1 — modul vznikl jako kopie a má se chovat stejně, dokud Lukáš explicitně nezmění UI.
