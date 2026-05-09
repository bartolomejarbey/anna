---
description: Audit dodržení design systému (CLAUDE.md sekce 5) napříč src/components a src/app.
---

Projdi `src/components/**` a `src/app/**` (jen `.tsx` soubory) proti CLAUDE.md sekci 5. Reportuj **jen porušení**, ne shody.

Pravidla a grep příkazy:

1. **Žádné shadow na cards**
   ```bash
   grep -rnE "shadow-(sm|md|lg|xl|2xl|inner|none)" src/components src/app --include="*.tsx"
   ```
   Reportuj všechny výskyty kromě těch, kde komentář říká `// allowed-shadow:` (modaly, tooltipy, dropdown menu mají shadow OK).

2. **Žádný gradient**
   ```bash
   grep -rnE "(bg|from|via|to)-gradient|gradient-to-" src/components src/app --include="*.tsx"
   ```

3. **Žádné křiklavé/neon barvy mimo paletu**
   ```bash
   grep -rnE "(bg|text|border)-(blue|red|green|yellow|purple|pink|orange|indigo|violet|fuchsia|rose|cyan|sky|emerald|lime|amber)-(400|500|600|700)" src/components src/app --include="*.tsx"
   ```
   Povolené barvy: `bg-bg-{primary,secondary,tertiary}`, `text-text-{primary,secondary,tertiary}`, `border-border-subtle`, `bg-accent`, `text-success/warning/error`. Pokud najdeš bare Tailwind barvu, navrhni token z naší palety.

4. **Rounded — buttons rounded-xl, cards rounded-2xl, inputs rounded-lg**
   Heuristika: pokud `<button` nebo `role="button"` na řádku a chybí `rounded-xl` (nebo varianta `rounded-button`), reportuj jako možný issue (confidence: medium — explicitně označ jako „možná").

5. **Výška inputů a buttonů 44px (`h-11`)**
   ```bash
   grep -rnE "<(button|input|select)" src/components src/app --include="*.tsx" -l
   ```
   Pak v každém zkontroluj, zda obsahuje `h-11` nebo `h-[44px]`. Reportuj výjimky.

6. **Žádné emoji v UI textech**
   ```bash
   grep -rnP "[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}]" src/components src/app --include="*.tsx"
   ```

7. **Container max width 1280px (`max-w-[1280px]` nebo `max-w-content` z naší proměnné)**
   Heuristika u top-level layout containerů.

Output formát:

```
## Design audit — <timestamp>

### Kritické (porušuje pravidla CLAUDE.md sekce 5)
- `src/components/Card.tsx:8` — `shadow-lg` na cardu. Nahraď borderem.

### Možná (ověř kontext)
- `src/app/dashboard/page.tsx:12` — `<button>` bez `h-11`. Možná pure ikona, ověř.

### Čisté
- (počet souborů bez nálezu)
```

**Confidence:** stejné pravidlo jako `code-reviewer` — kritické hlas jen >95 %, možná >70 %. Šum je horší než výpadek.

Read-only, jen reportuj.
