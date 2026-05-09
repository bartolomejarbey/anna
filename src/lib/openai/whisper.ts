import "server-only";

import { toFile } from "openai";

import { MODEL, openai } from "@/lib/openai/client";

/**
 * Transcribe audio to Czech text using OpenAI Whisper-1.
 *
 * Failure model: this function THROWS on OpenAI errors. The caller (server
 * action) is expected to wrap in try/catch, log to `analytics_events`, and
 * surface a user-friendly Czech message. Empty transcriptions (silent audio,
 * no detected speech) are NOT errors — we return `text: ''` so the caller can
 * decide whether to retry, fail the meeting, or fall back to live captions.
 */

export type TranscriptionResult = {
  /** Reconciled-friendly transcript. Empty string if Whisper detected no speech. */
  text: string;
  /** OpenAI model identifier we sent. Mirrors `transcripts.whisper_model`. */
  model: string;
  /**
   * Whisper-1 (response_format: 'json') does not return token usage.
   * Always null for now; reserved for future migration to gpt-4o-transcribe.
   */
  tokens: number | null;
  /** Wall-clock latency in milliseconds (request → response, monotonic). */
  latency_ms: number;
  /** Language code we forced. Always 'cs' unless caller overrides. */
  language: string;
};

export type TranscribeAudioInput = {
  /**
   * Audio payload. Server actions usually pass a Buffer (downloaded from
   * Supabase Storage). Browser-originated test code may pass a Blob/File.
   * Accepted formats per Whisper spec: flac, mp3, mp4, mpeg, mpga, m4a, ogg,
   * wav, webm. (Caller is responsible for delivering one of these.)
   */
  audio: Blob | Buffer;
  /**
   * Filename hint for OpenAI's multipart upload. Whisper uses the extension
   * to detect format; if unsure, default 'audio.mp4' covers MediaRecorder
   * outputs and most user uploads.
   */
  filename?: string;
  /** ISO-639-1 language code. Default 'cs' (Czech). */
  language?: string;
};

export async function transcribeAudio(
  input: TranscribeAudioInput,
): Promise<TranscriptionResult> {
  const filename = input.filename ?? "audio.mp4";
  const language = input.language ?? "cs";

  // Wrap input into a File-compatible payload. `toFile` handles both Buffer
  // and Blob and is the SDK-recommended path for multipart uploads.
  const file = await toFile(input.audio, filename);

  const startedAt = performance.now();
  const resp = await openai().audio.transcriptions.create({
    model: MODEL.whisper,
    file,
    language,
    response_format: "json",
  });
  const latency_ms = Math.round(performance.now() - startedAt);

  return {
    text: resp.text ?? "",
    model: MODEL.whisper,
    tokens: null,
    latency_ms,
    language,
  };
}
