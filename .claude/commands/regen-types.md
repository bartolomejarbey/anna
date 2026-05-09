---
description: Regeneruj TypeScript typy z lokální Supabase DB do src/lib/supabase/types.ts a stage v gitu.
---

Cíl: po každé migraci přepiš `src/lib/supabase/types.ts` z aktuálního schématu, ať TS klienti drží krok s DB.

Postup:

1. Ověř, že lokální Supabase běží:
   ```bash
   npx supabase status
   ```
   Pokud neběží: `npx supabase start` a počkej, než se zvedne.

2. Vygeneruj typy (override existující soubor):
   ```bash
   npx supabase gen types typescript --local > src/lib/supabase/types.ts
   ```

3. Ověř, že soubor není prázdný a obsahuje `export type Database = ...`. Pokud ano, pokračuj. Pokud ne, nahlas chybu — nejspíš migrace neaplikovaná nebo `--local` neukazuje na běžící instanci.

4. Spusť typecheck:
   ```bash
   npx tsc --noEmit
   ```
   Pokud failne, neopravuj kódovou stranu — typy odpovídají DB. Místo toho nahlas, které soubory volají odstraněné/přejmenované sloupce, a počkej na pokyn (typicky DB byla zdroj pravdy, kód je z aktualizace pozadu).

5. Stage soubor:
   ```bash
   git add src/lib/supabase/types.ts
   ```

Necommituj — to nech na uživateli (gate v `.claude/settings.json` chce lint+typecheck).
