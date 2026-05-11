import "server-only";

/**
 * Server-side PDF text extraction přes pdfjs-dist (legacy/Node build).
 *
 * Vrací plain text z PDF výpisu — žádné parsování transakcí, jen text který se
 * pošle do GPT-4o k extrakci agregátů.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pdfjsLib: any = null;

async function getPdfjs() {
  if (pdfjsLib) return pdfjsLib;
  // Legacy build běží v Node bez DOM API.
  pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  return pdfjsLib;
}

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const pdfjs = await getPdfjs();

  const uint8 = new Uint8Array(buffer);
  const doc = await pdfjs.getDocument({
    data: uint8,
    disableFontFace: true,
    useSystemFonts: false,
  }).promise;

  const parts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((it: any) => ("str" in it ? it.str : ""))
      .join(" ");
    parts.push(text);
  }
  await doc.destroy();

  return parts.join("\n");
}
