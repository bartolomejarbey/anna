import React from 'react';
import { cn } from '@/lib/cn';

export type StepStatus = 'pending' | 'running' | 'done' | 'error';

export interface PipelineStepRowProps {
  /** 1-based pořadí kroku v pipeline. */
  number: number;
  /** Krátký český název kroku (např. "Transkripce"). */
  label: string;
  /** Jednořádkový popis ("Whisper → český text"). */
  description?: string;
  status: StepStatus;
  /** Meta data ke kroku — latence, tokeny, model. */
  meta?: {
    latencyMs?: number | null;
    tokens?: number | null;
    model?: string | null;
  };
  /** Server action nabindovaná na (meetingId, { force: true }). */
  rerunAction?: () => Promise<void>;
  /** Defaultně "Spustit znovu". */
  rerunLabel?: string;
  /** Volitelná chyba (po failu) — krátká fráze pod meta. */
  errorMessage?: string;
}

const STATUS_DOT: Record<StepStatus, string> = {
  pending: 'bg-inset border border-border-default',
  running: 'bg-accent animate-pulse',
  done: 'bg-[color:var(--color-success)]',
  error: 'bg-[color:var(--color-error)]',
};

const STATUS_LABEL: Record<StepStatus, string> = {
  pending: 'Čeká',
  running: 'Probíhá',
  done: 'Hotovo',
  error: 'Chyba',
};

function formatLatency(ms: number | null | undefined): string | null {
  if (ms == null || ms <= 0) return null;
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

function formatTokens(t: number | null | undefined): string | null {
  if (t == null || t <= 0) return null;
  return `${t.toLocaleString('cs-CZ')} t`;
}

export function PipelineStepRow({
  number,
  label,
  description,
  status,
  meta,
  rerunAction,
  rerunLabel = 'Spustit znovu',
  errorMessage,
}: PipelineStepRowProps): React.ReactElement {
  const metaParts: string[] = [];
  if (meta?.model) metaParts.push(meta.model);
  const lat = formatLatency(meta?.latencyMs);
  if (lat) metaParts.push(lat);
  const tok = formatTokens(meta?.tokens);
  if (tok) metaParts.push(tok);

  const showRerun =
    rerunAction !== undefined && (status === 'done' || status === 'error');

  return (
    <div
      className={cn(
        'flex items-center gap-5 border-b border-border-subtle py-5 last:border-b-0',
      )}
    >
      <div className="flex w-7 justify-end font-mono text-body-sm text-tertiary tabular-nums">
        {number}
      </div>

      <div className="flex w-4 justify-center">
        <div
          className={cn('h-2.5 w-2.5 rounded-full', STATUS_DOT[status])}
          aria-label={STATUS_LABEL[status]}
        />
      </div>

      <div className="flex flex-1 flex-col gap-0.5 min-w-0">
        <div className="flex items-baseline gap-3">
          <span className="text-h3 text-primary">{label}</span>
          <span className="text-caption text-tertiary">{STATUS_LABEL[status]}</span>
        </div>
        {description && (
          <p className="text-body-sm text-tertiary truncate">{description}</p>
        )}
        {(metaParts.length > 0 || errorMessage) && (
          <div className="mt-1 flex items-center gap-2 text-body-sm text-tertiary">
            {metaParts.length > 0 && <span>{metaParts.join(' · ')}</span>}
            {errorMessage && (
              <span className="text-[color:var(--color-error)] truncate" title={errorMessage}>
                {errorMessage}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center">
        {showRerun && rerunAction && (
          <form action={rerunAction}>
            <button
              type="submit"
              className="inline-flex h-9 items-center justify-center rounded-[8px] border border-border-subtle bg-transparent px-3 text-body-sm font-medium text-secondary transition-colors hover:border-border-default hover:bg-subtle hover:text-primary active:scale-[0.98]"
            >
              {rerunLabel}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
