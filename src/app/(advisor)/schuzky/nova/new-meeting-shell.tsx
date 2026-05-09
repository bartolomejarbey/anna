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
import { LiveRecorder } from '@/components/live-recorder';
import { AudioUploader } from '@/components/audio-uploader';
import { createMeeting, uploadAudioForm, runFullPipeline } from '@/lib/actions/meetings';
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
  durationSec: number;
}

type ProcessStep = 'creating' | 'uploading' | 'transcribing' | 'extracting' | 'generating';

const STEP_LABELS: Record<ProcessStep, string> = {
  creating: 'Připravuji schůzku',
  uploading: 'Nahrávám zvuk',
  transcribing: 'Přepisuji',
  extracting: 'Vytahuji data',
  generating: 'Generuji nabídku',
};

export function NewMeetingShell({ customers }: NewMeetingShellProps): React.ReactElement {
  const router = useRouter();

  const [capture, setCapture] = useState<Capture | null>(null);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [processStep, setProcessStep] = useState<ProcessStep | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRecorderStop = useCallback((blob: Blob, transcript: string) => {
    setCapture({ blob, transcript, method: 'browser_live', durationSec: 0 });
  }, []);

  const handleFileUpload = useCallback((file: File) => {
    setCapture({ blob: file, transcript: '', method: 'file_upload', durationSec: 0 });
    setShowFileUpload(false);
  }, []);

  const handleDiscard = useCallback(() => {
    setCapture(null);
    setSelectedCustomerId(null);
    setProcessStep(null);
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

      setProcessStep('transcribing');
      await runFullPipeline({
        meetingId,
        liveTranscriptText: capture.transcript || undefined,
      });

      router.push(`/schuzky/${meetingId}`);
    } catch (err) {
      setProcessStep(null);
      setErrorMessage(
        err instanceof Error ? err.message : 'Něco se nepovedlo. Zkuste to prosím znovu.',
      );
    }
  }, [capture, selectedCustomerId, router]);

  // ── Processing ────────────────────────────────────────────────────────────
  if (processStep) {
    return (
      <div className="flex flex-col gap-6 max-w-md">
        <p className="text-body text-secondary">{STEP_LABELS[processStep]}</p>
        <div className="flex flex-col gap-3">
          <div className="skeleton h-2 w-full" />
          <div className="skeleton h-2 w-4/5" />
          <div className="skeleton h-2 w-3/5" />
        </div>
      </div>
    );
  }

  // ── Review (capture done, picking customer) ───────────────────────────────
  if (capture) {
    const noCustomers = customers.length === 0;
    return (
      <div className="flex flex-col gap-10 max-w-md">
        <div className="flex flex-col gap-3">
          <p className="text-caption text-tertiary">Zákazník</p>
          {noCustomers ? (
            <p className="text-body text-secondary">
              Data se zobrazí po napojení na databázi.
            </p>
          ) : (
            <Select
              value={selectedCustomerId ?? ''}
              onValueChange={setSelectedCustomerId}
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
        </div>

        {errorMessage && (
          <p className="text-body-sm text-error">{errorMessage}</p>
        )}

        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={handleContinue}
            disabled={!selectedCustomerId || noCustomers}
            className={cn(
              'h-10 px-4 rounded-[8px] bg-accent text-accent-text text-body font-medium',
              'transition-opacity active:scale-[0.98] hover:opacity-90',
              'disabled:opacity-40 disabled:cursor-not-allowed',
            )}
            style={{ transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.16,1,0.3,1)' }}
          >
            Pokračovat
          </button>
          <button
            type="button"
            onClick={handleDiscard}
            className="text-body-sm text-tertiary hover:text-primary transition-colors"
          >
            Zahodit
          </button>
        </div>
      </div>
    );
  }

  // ── Idle (recorder + secondary file upload) ───────────────────────────────
  return (
    <div className="flex flex-col items-center gap-16 py-12">
      <LiveRecorder onStop={handleRecorderStop} />

      {showFileUpload ? (
        <div className="w-full max-w-md flex flex-col gap-4">
          <AudioUploader meetingId="" onUpload={handleFileUpload} />
          <button
            type="button"
            onClick={() => setShowFileUpload(false)}
            className="text-body-sm text-tertiary hover:text-primary transition-colors self-start"
          >
            Zrušit
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowFileUpload(true)}
          className="text-body-sm text-tertiary hover:text-primary transition-colors"
        >
          nebo nahrát soubor
        </button>
      )}
    </div>
  );
}
