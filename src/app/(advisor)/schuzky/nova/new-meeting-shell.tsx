'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/cn';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { LiveRecorder } from '@/components/live-recorder';
import { AudioUploader } from '@/components/audio-uploader';
import {
  createMeeting,
  uploadAudioForm,
  runFullPipeline,
} from '@/lib/actions/meetings';
import { appendLiveTranscript } from '@/lib/actions/transcription';

interface CustomerOption {
  id: string;
  full_name: string;
}

interface NewMeetingShellProps {
  customers: CustomerOption[];
}

interface Capture {
  blob: Blob;
  transcript: string;
  method: 'browser_live' | 'file_upload';
}

type Mode = 'live' | 'file';
type ProcessStep = 'creating' | 'uploading' | 'processing';

const STEP_LABELS: Record<ProcessStep, string> = {
  creating: 'Připravuji schůzku',
  uploading: 'Nahrávám zvuk',
  processing: 'Anna zpracovává nahrávku',
};

export function NewMeetingShell({
  customers,
}: NewMeetingShellProps): React.ReactElement {
  const router = useRouter();

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null,
  );
  const [mode, setMode] = useState<Mode>('live');
  const [capture, setCapture] = useState<Capture | null>(null);
  const [processStep, setProcessStep] = useState<ProcessStep | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRecorderStop = useCallback(
    (blob: Blob, transcript: string) => {
      setCapture({ blob, transcript, method: 'browser_live' });
    },
    [],
  );

  const handleFileUpload = useCallback((file: File) => {
    setCapture({ blob: file, transcript: '', method: 'file_upload' });
  }, []);

  const handleDiscard = useCallback(() => {
    setCapture(null);
    setErrorMessage(null);
  }, []);

  const handleContinue = useCallback(async () => {
    if (!capture || !selectedCustomerId) return;
    setErrorMessage(null);

    try {
      setProcessStep('creating');
      const { meetingId } = await createMeeting({
        customerId: selectedCustomerId,
        captureMethod: capture.method,
      });

      setProcessStep('uploading');
      const formData = new FormData();
      formData.append('meetingId', meetingId);
      formData.append('file', capture.blob);
      formData.append('mimeType', capture.blob.type || 'audio/mp4');
      await uploadAudioForm(formData);

      if (capture.transcript) {
        await appendLiveTranscript(meetingId, capture.transcript);
      }

      setProcessStep('processing');
      await runFullPipeline({
        meetingId,
        liveTranscriptText: capture.transcript || undefined,
      });

      router.push(`/schuzky/${meetingId}`);
    } catch (err) {
      setProcessStep(null);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Něco se nepovedlo. Zkuste to prosím znovu.',
      );
    }
  }, [capture, selectedCustomerId, router]);

  // ── Processing ──────────────────────────────────────────────────────────────
  if (processStep) {
    return (
      <div className="flex max-w-md flex-col gap-6">
        <p className="text-body text-secondary">{STEP_LABELS[processStep]}</p>
        <div className="flex flex-col gap-3">
          <div className="skeleton h-2 w-full" />
          <div className="skeleton h-2 w-4/5" />
          <div className="skeleton h-2 w-3/5" />
        </div>
      </div>
    );
  }

  const noCustomers = customers.length === 0;
  const customerChosen = !!selectedCustomerId;

  return (
    <div className="flex flex-col gap-12">
      {/* Krok 1 — Zákazník */}
      <section className="flex max-w-md flex-col gap-3">
        <p className="text-caption text-tertiary">1 · Zákazník</p>
        {noCustomers ? (
          <p className="text-body text-secondary">
            Data se zobrazí po napojení na databázi.
          </p>
        ) : (
          <Select
            value={selectedCustomerId ?? ''}
            onValueChange={setSelectedCustomerId}
            disabled={!!capture}
          >
            <SelectTrigger>
              <SelectValue placeholder="Vyberte zákazníka" />
            </SelectTrigger>
            <SelectContent>
              {customers.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </section>

      {/* Krok 2 — Nahrávka (gated on customer selected, hidden once captured) */}
      {customerChosen && !capture && (
        <section className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <p className="text-caption text-tertiary">2 · Nahrávka</p>
            <div className="inline-flex self-start rounded-full bg-subtle p-1">
              <button
                type="button"
                onClick={() => setMode('live')}
                className={cn(
                  'h-8 rounded-full px-4 text-body-sm font-medium transition-colors',
                  mode === 'live'
                    ? 'bg-surface text-primary shadow-[0_1px_3px_rgba(0,0,0,0.06)]'
                    : 'text-tertiary hover:text-secondary',
                )}
              >
                Nahrát živě
              </button>
              <button
                type="button"
                onClick={() => setMode('file')}
                className={cn(
                  'h-8 rounded-full px-4 text-body-sm font-medium transition-colors',
                  mode === 'file'
                    ? 'bg-surface text-primary shadow-[0_1px_3px_rgba(0,0,0,0.06)]'
                    : 'text-tertiary hover:text-secondary',
                )}
              >
                Nahrát soubor
              </button>
            </div>
          </div>

          {mode === 'live' ? (
            <div className="py-12">
              <LiveRecorder onStop={handleRecorderStop} />
            </div>
          ) : (
            <div className="max-w-md">
              <AudioUploader meetingId="" onUpload={handleFileUpload} />
            </div>
          )}
        </section>
      )}

      {/* Krok 3 — Review */}
      {capture && (
        <section className="flex max-w-md flex-col gap-6">
          <div className="flex flex-col gap-2">
            <p className="text-caption text-tertiary">3 · Zkontrolovat</p>
            <p className="text-body text-secondary">
              {capture.method === 'browser_live'
                ? 'Živá nahrávka připravena.'
                : 'Soubor připraven.'}
              {capture.transcript &&
                ' Anna použije živý přepis jako vodítko pro Whisper.'}
            </p>
          </div>

          {errorMessage && (
            <p className="text-body-sm text-[color:var(--color-error)]">
              {errorMessage}
            </p>
          )}

          <div className="flex items-center gap-4">
            <Button onClick={handleContinue}>Pokračovat</Button>
            <button
              type="button"
              onClick={handleDiscard}
              className="text-body-sm text-tertiary transition-colors hover:text-primary"
            >
              Zahodit
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
