import "server-only";

import { extractText, getDocumentProxy } from "unpdf";

/**
 * Server-side PDF text extraction přes `unpdf` — Node/edge-friendly wrapper
 * nad pdfjs, bez závislosti na DOM globals (DOMMatrix, Path2D atd.). Vercel
 * serverless Node runtime tyto globaly nemá, takže přímý import pdfjs-dist@5
 * tam padá s "DOMMatrix is not defined".
 *
 * Vrací plain text z PDF výpisu — žádné parsování transakcí, jen text který
 * se pošle do GPT-4o k extrakci agregátů.
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const uint8 = new Uint8Array(
    buffer.buffer,
    buffer.byteOffset,
    buffer.byteLength,
  );

  const pdf = await getDocumentProxy(uint8);
  const { text } = await extractText(pdf, { mergePages: true });

  // S `mergePages: true` vrací unpdf `text: string`, ale TS overloady to
  // občas resolvnou jako `string[]` (první overload). Cover oba případy.
  return Array.isArray(text) ? text.join("\n") : text;
}
