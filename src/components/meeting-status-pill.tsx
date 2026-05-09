import React from 'react';
import { Badge } from '@/components/ui/badge';

// ─── Types ───────────────────────────────────────────────────────────────────

export type MeetingStatus =
  | 'idle'
  | 'recording'
  | 'uploaded'
  | 'transcribing'
  | 'reconciling'
  | 'extracting'
  | 'extracted'
  | 'generating'
  | 'ready'
  | 'failed';

interface MeetingStatusPillProps {
  status: MeetingStatus;
}

// ─── Config ───────────────────────────────────────────────────────────────────

type BadgeVariant = 'neutral' | 'success' | 'warning' | 'error';

const STATUS_CONFIG: Record<MeetingStatus, { label: string; variant: BadgeVariant }> = {
  idle:         { label: 'Připraveno',           variant: 'neutral'  },
  recording:    { label: 'Nahráváme',            variant: 'warning'  },
  uploaded:     { label: 'Nahráno',              variant: 'neutral'  },
  transcribing: { label: 'Přepisujeme',          variant: 'warning'  },
  reconciling:  { label: 'Slaďujeme přepis',     variant: 'warning'  },
  extracting:   { label: 'Vytahujeme data',      variant: 'warning'  },
  extracted:    { label: 'Data připravena',      variant: 'neutral'  },
  generating:   { label: 'Vytváříme nabídku',    variant: 'warning'  },
  ready:        { label: 'Hotovo',               variant: 'success'  },
  failed:       { label: 'Chyba',                variant: 'error'    },
};

// ─── Component ───────────────────────────────────────────────────────────────

export function MeetingStatusPill({ status }: MeetingStatusPillProps): React.ReactElement {
  const { label, variant } = STATUS_CONFIG[status];
  return <Badge variant={variant}>{label}</Badge>;
}
