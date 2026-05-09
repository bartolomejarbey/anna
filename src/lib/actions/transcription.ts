'use server';

import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * Appends a partial live transcript chunk to the meeting's transcript row.
 * Called by LiveRecorder (debounced) as the recording progresses.
 * Upserts on meeting_id so it works whether or not the row exists yet.
 */
export async function appendLiveTranscript(
  meetingId: string,
  partialText: string,
): Promise<void> {
  const admin = supabaseAdmin();

  // Fetch existing live_text (if any) then concatenate.
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
