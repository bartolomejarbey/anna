import { NextRequest } from 'next/server';
import { z } from 'zod';
import { MODEL, openai } from '@/lib/openai/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT =
  'Jsi Anna, AI asistentka českého finančního poradce. Mluvíš formálně (vykání), stručně, lidsky. ' +
  'Pomáháš s konkrétními úkoly: shrnout schůzku, vysvětlit produkt, nadhodit otázky pro příští ' +
  'setkání, navrhnout text e-mailu zákazníkovi. Když nevíš, řekneš, že nevíš — nikdy si ' +
  'nevymýšlíš čísla, sazby, ani podmínky produktů.';

const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(8000),
});

const BodySchema = z.object({
  messages: z.array(MessageSchema).min(1).max(50),
});

export async function POST(req: NextRequest) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid json' }), { status: 400 });
  }

  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'invalid body' }), { status: 400 });
  }

  let stream: AsyncIterable<{ choices: Array<{ delta: { content?: string | null } }> }>;
  try {
    stream = await openai().chat.completions.create({
      model: MODEL.assistant,
      stream: true,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...parsed.data.messages,
      ],
      temperature: 0.4,
      max_completion_tokens: 1000,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Chyba při volání OpenAI.';
    return new Response(JSON.stringify({ error: message }), { status: 502 });
  }

  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content ?? '';
          if (delta) controller.enqueue(encoder.encode(delta));
        }
        controller.close();
      } catch (e) {
        controller.error(e);
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Transfer-Encoding': 'chunked',
    },
  });
}
