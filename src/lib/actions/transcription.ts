'use server';

import { supabaseAdmin } from '@/lib/supabase/admin';
import { currentAdvisorId } from '@/lib/auth';

/**
 * Appends a partial live transcript chunk to the meeting's transcript row.
 * Called by LiveRecorder (debounced) as the recording progresses.
 *
 * Verifies the meeting belongs to the current advisor before writing — without
 * this check, anyone with a meeting UUID could pollute another advisor's
 * live transcript (we use the service-role admin client which bypasses RLS).
 */
export async function appendLiveTranscript(
  meetingId: string,
  partialText: string,
): Promise<void> {
  const advisorId = await currentAdvisorId();
  const admin = supabaseAdmin();

  const { data: meeting, error: meetingError } = await admin
    .from('meetings')
    .select('id')
    .eq('id', meetingId)
    .eq('advisor_id', advisorId)
    .single();

  if (meetingError || !meeting) {
    throw new Error('Schůzka nenalezena nebo k ní nemáte přístup.');
  }

  const { data: existing } = await admin
    .from('transcripts')
    .select('live_text')
    .eq('meeting_id', meetingId)
    .single();

  const existingText: string =
    (existing as { live_text: string | null } | null)?.live_text ?? '';

  const newText = existingText ? `${existingText} ${partialText}` : partialText;

  await admin
    .from('transcripts')
    .upsert(
      { meeting_id: meetingId, live_text: newText },
      { onConflict: 'meeting_id' },
    );
}
