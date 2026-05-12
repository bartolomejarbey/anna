import React from 'react';
import { StatusPill } from '@/components/ui/status-pill';

// ─── Types ───────────────────────────────────────────────────────────────────

export type MeetingStatus =
  | 'idle'
  | 'recording'
  | 'uploaded'
  | 'transcribing'
  | 'reconciling'
  | 'cleaning'
  | 'cleaned'
  | 'extracting'
  | 'extracted'
  | 'generating'
  | 'ready'
  | 'failed';

interface MeetingStatusPillProps {
  status: MeetingStatus;
}

// ─── Config ───────────────────────────────────────────────────────────────────

type Tone = 'neutral' | 'success' | 'warning' | 'error' | 'processing';

const STATUS_CONFIG: Record<MeetingStatus, { label: string; tone: Tone; dot?: boolean }> = {
  idle:         { label: 'Připraveno',           tone: 'neutral'    },
  recording:    { label: 'Nahráváme',            tone: 'processing', dot: true },
  uploaded:     { label: 'Nahráno',              tone: 'neutral'    },
  transcribing: { label: 'Přepisujeme',          tone: 'processing', dot: true },
  reconciling:  { label: 'Slaďujeme přepis',     tone: 'processing', dot: true },
  cleaning:     { label: 'Čistíme přepis',       tone: 'processing', dot: true },
  cleaned:      { label: 'Přepis čistý',         tone: 'neutral'    },
  extracting:   { label: 'Vytahujeme data',      tone: 'processing', dot: true },
  extracted:    { label: 'Data připravena',      tone: 'neutral'    },
  generating:   { label: 'Vytváříme nabídku',    tone: 'processing', dot: true },
  ready:        { label: 'Hotovo',               tone: 'success', dot: true },
  failed:       { label: 'Chyba',                tone: 'error', dot: true },
};

// ─── Component ───────────────────────────────────────────────────────────────

export function MeetingStatusPill({ status }: MeetingStatusPillProps): React.ReactElement {
  const { label, tone, dot } = STATUS_CONFIG[status];
  return (
    <StatusPill tone={tone} dot={dot}>
      {label}
    </StatusPill>
  );
}
