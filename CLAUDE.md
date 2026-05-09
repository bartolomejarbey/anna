@AGENTS.md

# Anna — Project Context

> Tento soubor je hlavním referenčním zdrojem pro všechny budoucí Claude Code sessions na tomto projektu. Před jakoukoliv prací si pročti relevantní sekci.

---

## 1. PROJECT OVERVIEW

**Anna** je multi-tenant SaaS platforma pro finanční poradce.

**První tenant:** 4FIN HOLDING (1 400 poradců, 25 mld AUM v ČR).

**Cíl:** automatizovat celý workflow finančního poradce — od akviziční schůzky přes zpracování dat až po PDF nabídku pro klienta.

### První spuštěný modul: AI naslouchač schůzek

```
Audio (live nebo upload)
  → Whisper transkripce
  → GPT-4o extrakce (struktura 4FIN excelu)
  → Hardcoded kalkulátor (plnění/krytí)
  → AI generuje text
  → PDF nabídka pro klienta
```

---

## 2. TERMINOLOGIE

> **DŮLEŽITÉ — NIKDY neměnit. Tohle je jazyková smlouva s uživateli.**

| Pojem | Význam |
|-------|--------|
| **Tenant** | poradenská síť (4FIN, OVB později, Partners později) |
| **Klient** | poradce v rámci sítě (uživatel platformy, ten, kdo platí předplatné) |
| **Zákazník** | klient poradce (koncový spotřebitel finančních produktů) |
| **Super-admin** | Bartoloměj Rota a Lukáš Gašník (zakladatelé) |

**Pravidla:**

- NIKDY neměň „klient" za „user" nebo „advisor" v UI ani v user-facing kódu
- V databázi mohou být anglické názvy (`advisors`, `customers`)
- UI je vždy v češtině s touto terminologií

---

## 3. TECH STACK

| Vrstva | Technologie |
|--------|-------------|
| Framework | **Next.js 16** (App Router, TypeScript strict) |
| Backend | **Supabase** (PostgreSQL + Auth + Storage + Realtime) |
| AI — transkripce | **OpenAI Whisper-1** |
| AI — extrakce | **OpenAI GPT-4o** |
| AI — lehké tasky | **OpenAI GPT-4o-mini** |
| Styling | **Tailwind CSS** + **shadcn/ui** (customizované, ne defaulty) |
| Hosting | **Vercel**, EU region |
| Email | **Resend** (později) |
| Forms | **React Hook Form** + **Zod** |
| Ikony | **Lucide-react** |
| Animace | **Framer Motion** (mikro-animace) |
| PDF | **pdf-lib** nebo **react-pdf** |

> Next.js 16 má breaking changes oproti tréninkovým datům — vždy si přečti relevantní guide v `node_modules/next/dist/docs/` před psaním kódu. (Viz `AGENTS.md`.)

---

## 4. ARCHITEKTURA — MULTI-TENANT

### 3-úrovňová struktura

| Úroveň | Entita | Příklad |
|:---:|--------|---------|
| 1 | **Tenant** (poradenská síť) | 4FIN, OVB, Partners |
| 2 | **Klient** (poradce) | Karel Novák v 4FIN |
| 3 | **Zákazník** (klient poradce) | Pan Novotný u Karla |

### Dva nezávislé auth systémy

1. **Auth pro klienty (poradce)**
   - Login bez hesla pro demo
   - Magic link pro produkci
2. **Auth pro zákazníky**
   - Separátní zákaznická zóna
   - Vstupují s pozvánkou od svého poradce

### Row-Level Security (RLS) — povinné

VŠECHNY tabulky v DB MUSÍ mít RLS policies:

- **Klient** → vidí jen své zákazníky
- **Admin sítě** → vidí všechny klienty v síti
- **Super-admin** → vidí vše
- **Zákazník** → vidí jen svá data

---

## 5. DESIGN SYSTEM

> **Inspirace: Apple. Maximální jednoduchost. Žádný AI slop.**
> **DŮLEŽITÉ — NIKDY se od toho neodchylovat.**

### Barvy

| Token | Hex | Použití |
|-------|-----|---------|
| `bg-primary` | `#FFFFFF` | hlavní pozadí |
| `bg-secondary` | `#F4F0E9` | béžová |
| `bg-tertiary` | `#FAF7F2` | cards, inputs |
| `border-subtle` | `#E8E0D5` | jemné okraje |
| `text-primary` | `#1D1D1F` | hlavní text |
| `text-secondary` | `#6E6E73` | sekundární text |
| `text-tertiary` | `#8E8E93` | terciární text |
| `accent` | `#1D1D1F` | skoro černá |
| `accent-hover` | `#000000` | hover state |
| `success` | `#1F4F3F` | tmavá lesní zelená — JEN „podepsáno", „uloženo" |
| `warning` | `#B8860B` | tmavé gold — ne křiklavé |
| `error` | `#8B1A1A` | tmavé burgundy — ne neon red |

### Typography

- **Font:** Geist (`next/font/google` nebo přes Vercel)

| Úroveň | Velikost | Weight |
|--------|----------|--------|
| Hero nadpisy | 48–56px | 600 |
| H1 | 36–40px | 600 |
| H2 | 24–28px | 600 |
| Body | 15–17px | 400 |
| Caption | 13px | 500 |

### Layout

- Max content width: **1280px**
- Vertical rhythm: **96px** padding-y mezi sekcemi
- **Cards:** `rounded-2xl` (16px), border 1px subtle, **NE shadow**
- **Buttons:** `rounded-xl` (12px), výška **44px** standard
- **Inputs:** `rounded-lg` (10px), výška **44px**

### Anti-AI-slop pravidla

- ŽÁDNÉ stock illustrations
- ŽÁDNÉ „chubby people on laptops"
- ŽÁDNÉ defaultní shadcn templates
- ŽÁDNÉ gradient backgrounds (Apple je nepoužívá)
- ŽÁDNÉ neon barvy (vše je tlumené, dospělé)
- ŽÁDNÉ ikony v každém tlačítku
- HODNĚ whitespace — větší než instinkt říká

---

## 6. KÓDOVÉ KONVENCE

- **TypeScript strict mode** — nikdy `any`
- **Server Components default** — Client Components jen pro interaktivitu
- **Server Actions** pro mutace (ne API routes, pokud to není nutné)
- **Zod schemas** pro VŠECHNY user inputs
- **Error handling:** try/catch + user-friendly **české** messages
- **Naming:**
  - `camelCase` — proměnné a funkce
  - `PascalCase` — komponenty
  - `kebab-case` — soubory
- **Jazyk:**
  - České UI texty
  - Anglické proměnné/funkce/komentáře v kódu
- **Žádný `localStorage` na client side** — používej Supabase session management

---

## 7. WORKFLOW PRAVIDLA

| Kdy | Co |
|-----|-----|
| Před každou novou feature | Plan mode (`Shift+Tab` dvakrát) → naplánovat → schválit → provést |
| Paralelní práce | Subagenty (`frontend-builder`, `supabase-expert`, `code-reviewer`) |
| Po každé Write/Edit na `.ts` souboru | Typecheck: `npx tsc --noEmit` |
| Po každé DB změně | Regenerovat types: `npx supabase gen types typescript` |
| Před commitem | Lint + typecheck + RLS test |

---

## 8. DATOVÁ SBĚRNÁ VRSTVA

> **Kritické pro budoucnost.** Anna sbírá data pro fine-tuning vlastního modelu.

**Sbíráme:**

- Všechny audio nahrávky (s opt-in)
- Všechny transkripce
- Všechny extrahované JSON struktury
- Zpětnou vazbu poradce na kvalitu extrakce
- Všechny vygenerované PDF
- Engagement metriky

**Storage:**

- Tabulka `analytics_events` (PostgreSQL)
- Supabase Storage (audio, PDF)

**Admin panel** pro Bartoloměje má dashboard nad těmito daty.

---

## 9. SCOPE FOR FIRST PROTOTYPE (do zítra)

### Funkční moduly

1. **Login bez hesla** — 5 demo poradců
2. **Today / Dashboard**
3. **Schůzky** (s naslouchačem)
4. **Zákazníci** (list + detail)
5. **Nabídky** (list všech PDF)
6. **Profil poradce** (branding)
7. **AI asistent** (sidebar chat)
8. **Admin panel**

### Placeholder moduly (UI, ale not functional)

| # | Modul | Etiketa |
|---|-------|---------|
| 9 | Newsletter | Q3 2026 |
| 10 | Pojištění (Direct API) | Q2 2026 |
| 11 | Kalendář | Q3 2026 |
| 12 | Smart inbox | Q3 2026 |
| 13 | CRM | Q4 2026 |
| 14 | Knowledge base | Q4 2026 |
| 15 | Klientská zóna pro zákazníky | Q2 2026 |

---

## 10. FOUNDERS

| Jméno | Role | Kontakt |
|-------|------|---------|
| **Bartoloměj Rota** | CTO, Harotas s.r.o. | bartolomej@arbey.cz |
| **Lukáš Gašník** | zemský ředitel 4FIN, distribuce a network | — |
