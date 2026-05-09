'use client';

/**
 * LiveRecorder — captures full audio via MediaRecorder and provides live
 * Czech transcription via webkitSpeechRecognition (Chrome/Edge only).
 *
 * Audio codec strategy:
 *   1. Prefer audio/mp4  — Whisper accepts it natively; no server-side ffmpeg needed.
 *   2. Fall back to audio/wav — also natively accepted by Whisper.
 *   3. Never use audio/webm — Whisper rejects it without conversion.
 *
 * Rolling-restart: every 60 s recognition.stop() → recognition.start() is called
 * to prevent browser cap (~60–120 s) on continuous recognition sessions.
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

// ─── Types ───────────────────────────────────────────────────────────────────

interface LiveRecorderProps {
  meetingId: string;
  onLiveTranscript: (text: string) => void;
  onStop: (audioBlob: Blob, fullLiveTranscript: string) => void | Promise<void>;
  disabled?: boolean;
}

type RecorderState = 'idle' | 'recording' | 'stopped';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatSeconds(secs: number): string {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function pickAudioMimeType(): string {
  // Whisper accepts mp4 and wav natively. Prefer mp4 for smaller files.
  if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/mp4')) {
    return 'audio/mp4';
  }
  return 'audio/wav';
}

function isSpeechRecognitionSupported(): boolean {
  return typeof window !== 'undefined' && 'webkitSpeechRecognition' in window;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function LiveRecorder({
  meetingId: _meetingId,
  onLiveTranscript,
  onStop,
  disabled = false,
}: LiveRecorderProps): React.ReactElement {
  const [recorderState, setRecorderState] = useState<RecorderState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [micError, setMicError] = useState<string | null>(null);
  const speechSupported = isSpeechRecognitionSupported();

  // Refs — stable across renders, no stale-closure risk in event handlers
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const transcriptRef = useRef('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRecordingRef = useRef(false);

  // Keep transcriptRef in sync with state for use inside recognition handlers
  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimers();
      recognitionRef.current?.stop();
      mediaRecorderRef.current?.stop();
    };
  }, []);

  function stopTimers() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  }

  // ── Speech recognition setup ──────────────────────────────────────────────

  const startRecognition = useCallback(() => {
    if (!isSpeechRecognitionSupported()) return;
    const RecognitionClass = window.webkitSpeechRecognition;
    const recognition = new RecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = false; // only finalized fragments emitted upward
    recognition.lang = 'cs-CZ';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let newText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          newText += result[0].transcript + ' ';
        }
      }
      if (newText.trim()) {
        const updated = (transcriptRef.current + newText).trimStart();
        setTranscript(updated);
        onLiveTranscript(updated);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // 'no-speech' is benign — ignore. Other errors we log but don't crash.
      if (event.error !== 'no-speech') {
        console.warn('[LiveRecorder] SpeechRecognition error:', event.error);
      }
    };

    recognition.onend = () => {
      // If we're still supposed to be recording, schedule a rolling restart.
      if (isRecordingRef.current) {
        restartTimerRef.current = setTimeout(() => {
          if (isRecordingRef.current) {
            recognition.start();
          }
        }, 200);
      }
    };

    recognition.start();
    recognitionRef.current = recognition;

    // Rolling restart every 60 s to prevent browser timeout
    scheduleRollingRestart(recognition);
  }, [onLiveTranscript]);

  function scheduleRollingRestart(recognition: SpeechRecognition) {
    restartTimerRef.current = setTimeout(() => {
      if (!isRecordingRef.current) return;
      // stop() triggers onend → which re-starts after 200 ms
      recognition.stop();
    }, 60_000);
  }

  // ── Main recording controls ───────────────────────────────────────────────

  async function handleStart() {
    setMicError(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setMicError(
        'K nahrávání potřebujeme přístup k mikrofonu. Povolte ho v nastavení prohlížeče.',
      );
      return;
    }

    const mimeType = pickAudioMimeType();
    const recorder = new MediaRecorder(stream, { mimeType });
    chunksRef.current = [];

    recorder.ondataavailable = (e: BlobEvent) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.start(1000); // collect chunks every 1 s
    mediaRecorderRef.current = recorder;

    isRecordingRef.current = true;
    setRecorderState('recording');
    setElapsed(0);

    // Elapsed-time ticker
    timerRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    if (speechSupported) {
      startRecognition();
    }
  }

  function handleStop() {
    isRecordingRef.current = false;
    stopTimers();

    recognitionRef.current?.stop();
    recognitionRef.current = null;

    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    recorder.onstop = () => {
      const mimeType = recorder.mimeType || 'audio/mp4';
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const finalTranscript = transcriptRef.current;
      setRecorderState('stopped');
      void onStop(blob, finalTranscript);

      // Release mic tracks
      recorder.stream.getTracks().forEach((t) => t.stop());
    };

    recorder.stop();
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const isIdle = recorderState === 'idle';
  const isRecording = recorderState === 'recording';
  const isStopped = recorderState === 'stopped';

  return (
    <div className="flex flex-col gap-6">
      {/* Mic permission error */}
      {micError && (
        <div className="rounded-xl border border-[color-mix(in_oklab,_var(--color-error)_30%,_transparent)] bg-[color-mix(in_oklab,_var(--color-error)_8%,_transparent)] px-5 py-4">
          <p className="text-[15px] text-error">{micError}</p>
        </div>
      )}

      {/* Controls row */}
      <div className="flex items-center gap-4">
        {isIdle && (
          <Button
            variant="primary"
            onClick={handleStart}
            disabled={disabled}
          >
            Začít nahrávat
          </Button>
        )}

        {isRecording && (
          <>
            {/* Pulsing red dot + "Nahrávám…" */}
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-error opacity-60" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-error" />
              </span>
              <span className="text-[15px] font-medium text-text-primary">Nahrávám…</span>
            </div>

            {/* Timer */}
            <span className="min-w-[3rem] text-[15px] text-text-secondary tabular-nums">
              {formatSeconds(elapsed)}
            </span>

            {/* Stop button */}
            <Button
              variant="secondary"
              onClick={handleStop}
              disabled={disabled}
            >
              Zastavit
            </Button>
          </>
        )}

        {isStopped && (
          <div className="flex items-center gap-3">
            <span className="text-[15px] text-text-secondary">
              Nahrávka dokončena — {formatSeconds(elapsed)}
            </span>
          </div>
        )}
      </div>

      {/* Live transcript pane */}
      {(isRecording || isStopped) && (
        <Card
          variant="compact"
          className={cn(
            'flex flex-col gap-3',
            isStopped && 'opacity-70',
          )}
        >
          <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
            Live přepis
          </p>
          <div className="max-h-[300px] overflow-y-auto">
            {transcript ? (
              <p className="text-[15px] leading-relaxed text-text-primary whitespace-pre-wrap">
                {transcript}
              </p>
            ) : (
              <p className="text-[15px] text-text-tertiary italic">
                {speechSupported
                  ? 'Čekáme na řeč…'
                  : 'Přepis bude k dispozici po nahrání.'}
              </p>
            )}
          </div>

          {/* Status line */}
          <p className="text-xs text-text-tertiary">
            {speechSupported
              ? isRecording
                ? 'Nahrávám live (cs-CZ)'
                : 'Nahrávání ukončeno'
              : 'Live přepis není podporován v tomto prohlížeči — audio se přepíše po dokončení.'}
          </p>
        </Card>
      )}

      {/* Browser fallback notice shown before recording starts */}
      {isIdle && !speechSupported && (
        <p className="text-[13px] text-text-tertiary">
          Live přepis není v tomto prohlížeči podporován. Audio se nahraje a přepíše po
          dokončení.
        </p>
      )}
    </div>
  );
}
