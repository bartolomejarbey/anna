'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface CustomerOption {
  id: string;
  full_name: string;
}

interface NewMeetingShellProps {
  customers: CustomerOption[];
}

type PipelineStep =
  | 'idle'
  | 'creating'
  | 'uploading'
  | 'transcribing'
  | 'extracting'
  | 'generating'
  | 'done'
  | 'error';

const STEP_LABELS: Record<PipelineStep, string> = {
  idle: '',
  creating: 'Vytváříme schůzku…',
  uploading: 'Nahrávám audio…',
  transcribing: 'Přepisuji zvuk (Whisper)…',
  extracting: 'Vytahuji data…',
  generating: 'Vytvářím PDF nabídku…',
  done: 'Hotovo!',
  error: 'Chyba při zpracování.',
};

type CaptureTab = 'live' | 'upload';

// ─── Component ────────────────────────────────────────────────────────────────

export function NewMeetingShell({ customers }: NewMeetingShellProps): React.ReactElement {
  const router = useRouter();

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [captureTab, setCaptureTab] = useState<CaptureTab>('live');
  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [pipelineStep, setPipelineStep] = useState<PipelineStep>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Debounce ref for live transcript
  const liveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isProcessing = pipelineStep !== 'idle' && pipelineStep !== 'error';
  const canCapture = selectedCustomerId !== null && !isProcessing;

  // ── Helpers ──────────────────────────────────────────────────────────────

  async function ensureMeetingId(captureMethod: 'browser_live' | 'file_upload'): Promise<string> {
    if (meetingId) return meetingId;

    setPipelineStep('creating');
    const { meetingId: id } = await createMeeting({
      customerId: selectedCustomerId!,
      captureMethod,
    });
    setMeetingId(id);
    return id;
  }

  async function runPipeline(id: string, liveTranscript?: string): Promise<void> {
    try {
      setPipelineStep('transcribing');
      await runFullPipeline({ meetingId: id, liveTranscriptText: liveTranscript });
      setPipelineStep('done');
      router.push(`/schuzky/${id}`);
    } catch (err) {
      setPipelineStep('error');
      setErrorMessage(
        err instanceof Error ? err.message : 'Neznámá chyba — zkuste to znovu.',
      );
    }
  }

  // ── Live transcript callback (debounced 1 s) ─────────────────────────────

  const handleLiveTranscript = useCallback(
    (text: string) => {
      if (!meetingId) return;
      if (liveDebounceRef.current) clearTimeout(liveDebounceRef.current);
      liveDebounceRef.current = setTimeout(() => {
        void appendLiveTranscript(meetingId, text);
      }, 1000);
    },
    [meetingId],
  );

  // ── LiveRecorder stop ────────────────────────────────────────────────────

  const handleLiveStop = useCallback(
    async (audioBlob: Blob, fullLiveTranscript: string) => {
      try {
        const id = await ensureMeetingId('browser_live');

        setPipelineStep('uploading');
        const formData = new FormData();
        formData.append('meetingId', id);
        formData.append('file', audioBlob);
        formData.append('mimeType', audioBlob.type || 'audio/mp4');
        await uploadAudioForm(formData);

        await runPipeline(id, fullLiveTranscript || undefined);
      } catch (err) {
        setPipelineStep('error');
        setErrorMessage(
          err instanceof Error ? err.message : 'Neznámá chyba — zkuste to znovu.',
        );
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [meetingId, selectedCustomerId],
  );

  // ── AudioUploader drop ───────────────────────────────────────────────────

  const handleFileUpload = useCallback(
    async (file: File) => {
      try {
        const id = await ensureMeetingId('file_upload');

        setPipelineStep('uploading');
        const formData = new FormData();
        formData.append('meetingId', id);
        formData.append('file', file);
        formData.append('mimeType', file.type || 'audio/mp4');
        await uploadAudioForm(formData);

        await runPipeline(id);
      } catch (err) {
        setPipelineStep('error');
        setErrorMessage(
          err instanceof Error ? err.message : 'Neznámá chyba — zkuste to znovu.',
        );
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [meetingId, selectedCustomerId],
  );

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-8 max-w-2xl">
      {/* Step 1: Customer select */}
      <Card variant="compact">
        <h2 className="text-lg font-semibold text-text-primary mb-5">
          Zákazník
        </h2>

        {customers.length === 0 ? (
          <p className="text-[15px] text-text-secondary">
            Data se zobrazí po napojení na databázi.
          </p>
        ) : (
          <Select
            value={selectedCustomerId ?? ''}
            onValueChange={(val) => setSelectedCustomerId(val)}
            disabled={isProcessing}
          >
            <SelectTrigger>
              <SelectValue placeholder="Vyberte zákazníka…" />
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
      </Card>

      {/* Step 2: Capture method tabs */}
      <Card
        variant="compact"
        className={cn(!canCapture && 'opacity-50 pointer-events-none')}
      >
        <h2 className="text-lg font-semibold text-text-primary mb-5">
          Způsob nahrávání
        </h2>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['live', 'upload'] as CaptureTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setCaptureTab(tab)}
              disabled={!canCapture}
              className={cn(
                'px-4 py-2 rounded-xl text-[15px] font-medium transition-colors border',
                captureTab === tab
                  ? 'bg-accent text-bg-primary border-accent'
                  : 'bg-bg-primary text-text-secondary border-border-subtle hover:bg-bg-tertiary',
              )}
            >
              {tab === 'live' ? 'Nahrát teď ze schůzky' : 'Nahrát soubor'}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {captureTab === 'live' ? (
          <LiveRecorder
            meetingId={meetingId ?? ''}
            onLiveTranscript={handleLiveTranscript}
            onStop={handleLiveStop}
            disabled={!canCapture}
          />
        ) : (
          <AudioUploader
            meetingId={meetingId ?? ''}
            onUpload={handleFileUpload}
            disabled={!canCapture}
          />
        )}
      </Card>

      {/* Pipeline status */}
      {pipelineStep !== 'idle' && (
        <div
          className={cn(
            'rounded-xl border px-6 py-4',
            pipelineStep === 'error'
              ? 'border-[color-mix(in_oklab,_var(--color-error)_30%,_transparent)] bg-[color-mix(in_oklab,_var(--color-error)_8%,_transparent)]'
              : 'border-border-subtle bg-bg-tertiary',
          )}
        >
          <p
            className={cn(
              'text-[15px] font-medium',
              pipelineStep === 'error' ? 'text-error' : 'text-text-primary',
            )}
          >
            {STEP_LABELS[pipelineStep]}
          </p>
          {pipelineStep === 'error' && errorMessage && (
            <p className="mt-1 text-[13px] text-text-secondary">{errorMessage}</p>
          )}
          {pipelineStep === 'error' && (
            <Button
              variant="secondary"
              size="sm"
              className="mt-4"
              onClick={() => {
                setPipelineStep('idle');
                setErrorMessage(null);
              }}
            >
              Zkusit znovu
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
