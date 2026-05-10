'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Microphone, Stop } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';

interface LiveRecorderProps {
  onStop: (audioBlob: Blob, transcript: string) => void;
  disabled?: boolean;
}

type RecorderState = 'idle' | 'recording';

function formatSeconds(secs: number): string {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function pickAudioMimeType(): string {
  if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/mp4')) {
    return 'audio/mp4';
  }
  return 'audio/wav';
}

function isSpeechRecognitionSupported(): boolean {
  return typeof window !== 'undefined' && 'webkitSpeechRecognition' in window;
}

export function LiveRecorder({ onStop, disabled = false }: LiveRecorderProps): React.ReactElement {
  const [state, setState] = useState<RecorderState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [micError, setMicError] = useState<string | null>(null);
  const speechSupported = isSpeechRecognitionSupported();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const finalTranscriptRef = useRef('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRecordingRef = useRef(false);

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

  const startRecognition = useCallback(() => {
    if (!isSpeechRecognitionSupported()) return;
    const RecognitionClass = window.webkitSpeechRecognition;
    const recognition = new RecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'cs-CZ';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let newFinal = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          newFinal += result[0].transcript + ' ';
        } else {
          interim += result[0].transcript;
        }
      }
      if (newFinal) {
        finalTranscriptRef.current = (finalTranscriptRef.current + newFinal).trimStart();
      }
      setTranscript((finalTranscriptRef.current + interim).trim());
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== 'no-speech') {
        console.warn('[LiveRecorder] SpeechRecognition error:', event.error);
      }
    };

    recognition.onend = () => {
      if (isRecordingRef.current) {
        restartTimerRef.current = setTimeout(() => {
          if (isRecordingRef.current) recognition.start();
        }, 200);
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
    scheduleRollingRestart(recognition);
  }, []);

  function scheduleRollingRestart(recognition: SpeechRecognition) {
    restartTimerRef.current = setTimeout(() => {
      if (!isRecordingRef.current) return;
      recognition.stop();
    }, 60_000);
  }

  async function handleStart() {
    if (disabled) return;
    setMicError(null);
    setTranscript('');
    finalTranscriptRef.current = '';

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setMicError('K nahrávání potřebujeme přístup k mikrofonu. Povolte ho v nastavení prohlížeče.');
      return;
    }

    const mimeType = pickAudioMimeType();
    const recorder = new MediaRecorder(stream, { mimeType });
    chunksRef.current = [];

    recorder.ondataavailable = (e: BlobEvent) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.start(1000);
    mediaRecorderRef.current = recorder;
    isRecordingRef.current = true;
    setState('recording');
    setElapsed(0);

    timerRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    if (speechSupported) startRecognition();
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
      const finalTranscript = finalTranscriptRef.current;

      setState('idle');
      setElapsed(0);

      onStop(blob, finalTranscript);

      recorder.stream.getTracks().forEach((t) => t.stop());
    };

    recorder.stop();
  }

  const isRecording = state === 'recording';

  return (
    <div className="flex flex-col items-center gap-8">
      <button
        type="button"
        onClick={isRecording ? handleStop : handleStart}
        disabled={disabled || !!micError}
        aria-label={isRecording ? 'Zastavit nahrávání' : 'Začít nahrávat'}
        className={cn(
          'flex items-center justify-center rounded-full bg-accent text-accent-text',
          'transition-transform active:scale-[0.98]',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          isRecording && 'anna-recording-pulse',
        )}
        style={{
          width: 200,
          height: 200,
          transitionDuration: '200ms',
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {isRecording ? (
          <Stop size={64} weight="fill" />
        ) : (
          <Microphone size={64} weight="regular" />
        )}
      </button>

      {isRecording ? (
        <div className="flex flex-col items-center gap-4">
          <span className="text-mono text-secondary tabular-nums">{formatSeconds(elapsed)}</span>
          {transcript ? (
            <div className="max-w-[560px] max-h-[180px] overflow-y-auto px-6">
              <p className="text-body-sm text-secondary leading-relaxed text-center">{transcript}</p>
            </div>
          ) : speechSupported ? (
            <p className="text-body-sm text-tertiary">Posloucháme</p>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <p className="text-body-sm text-tertiary">
            {micError ?? 'Klikni a začni mluvit'}
          </p>
          {!speechSupported && !micError && (
            <p className="text-body-sm text-tertiary text-center max-w-[420px]">
              Tvůj prohlížeč nepodporuje živý přepis. Po nahrání spustí Whisper transkripci.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
