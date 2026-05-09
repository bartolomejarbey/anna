import 'server-only';

import { MODEL, openai } from './client';
import type { CustomerExtraction } from './schemas/customer-extraction';
import type { CalculationResult } from '@/lib/calculator';

export async function generateOfferNarrative(args: {
  extraction: CustomerExtraction;
  calculation: CalculationResult;
}): Promise<string> {
  const system = `Jsi asistent finančního poradce. Napiš krátký osobní úvod k navrženému finančnímu plánu (2–3 odstavce, vykání, profesionální ale lidský tón). Reaguj na konkrétní situaci zákazníka — věk, rodinu, hlavní cíl. Žádné prázdné fráze, žádné odrážky, žádný marketing. Mluv jako poradce, ne jako brožura.

Pravidla:
- Maximálně 180 slov celkem.
- První odstavec: shrň, co jsi pochopil ze schůzky.
- Druhý odstavec: vysvětli logiku doporučení (proč zrovna tyto produkty / částky).
- Třetí odstavec (volitelný, jen když dává smysl): pojmenuj otevřené otázky nebo příští kroky.
- Nepiš "Vážený zákazníku" ani jiné formální oslovení; začni rovnou věcí.
- Žádný JSON, jen čistý text.`;

  const user = JSON.stringify(
    { extraction: args.extraction, calculation: args.calculation },
    null,
    2,
  );

  const resp = await openai().chat.completions.create({
    model: MODEL.assistant, // gpt-4o-mini
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: 0.4,
    max_completion_tokens: 600,
  });

  return resp.choices[0]?.message?.content?.trim() ?? '';
}
