import "server-only";

import OpenAI from "openai";

let cached: OpenAI | null = null;

export function openai(): OpenAI {
  if (cached) return cached;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Chybí OPENAI_API_KEY v env. Doplň do .env.local podle .env.example.",
    );
  }
  cached = new OpenAI({ apiKey });
  return cached;
}

export const MODEL = {
  whisper: "whisper-1",
  reconcile: "gpt-4o-mini",
  cleanup: "gpt-4o-mini",
  extraction: "gpt-4o",
  assistant: "gpt-4o-mini",
} as const;
