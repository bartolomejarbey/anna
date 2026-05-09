import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';

export type AnalyticsEventType =
  | 'meeting.created'
  | 'audio.uploaded'
  | 'transcription.started'
  | 'transcription.completed'
  | 'reconciliation.completed'
  | 'extraction.completed'
  | 'calculation.completed'
  | 'pdf.generated'
  | 'pipeline.failed';

export async function logEvent(input: {
  type: AnalyticsEventType;
  data?: Record<string, unknown>;
  advisorId: string;
  tenantId: string;
}): Promise<void> {
  // Insert into analytics_events; swallow errors (analytics must never break the pipeline).
  try {
    await supabaseAdmin()
      .from('analytics_events')
      .insert({
        event_type: input.type,
        event_data: input.data ?? {},
        advisor_id: input.advisorId,
        tenant_id: input.tenantId,
      });
  } catch (e) {
    console.warn('[analytics] logEvent failed (non-fatal):', e);
  }
}
