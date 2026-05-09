'use server';

import path from 'path';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { MOCK_ADVISOR_ID, MOCK_TENANT_ID } from '@/lib/auth';
import { logEvent } from '@/lib/analytics/events';
import { transcribeAudio } from '@/lib/openai/whisper';
import { reconcileTranscripts } from '@/lib/openai/reconcile';
import { extractFromTranscript } from '@/lib/openai/extraction';
import { calculate } from '@/lib/calculator';
import { generateOfferNarrative } from '@/lib/openai/narrative';
import { generateOfferPdfBuffer, uploadOfferPdf } from '@/lib/pdf/generate';

// ─── Inline DB types (TODO: replace with generated types after F1.B) ─────────

interface MeetingRow {
  id: string;
  advisor_id: string;
  tenant_id: string;
  customer_id: string;
  status: string;
  audio_url: string | null;
  capture_method: string | null;
  created_at: string;
}

interface TranscriptRow {
  id: string;
  meeting_id: string;
  live_text: string | null;
  whisper_text: string | null;
  text: string | null;
}

interface ExtractionRow {
  id: string;
  meeting_id: string;
  transcript_id: string;
  structured_data: unknown;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extFromMimeType(mimeType: string): string {
  if (mimeType.includes('mp4') || mimeType.includes('m4a')) return 'mp4';
  if (mimeType.includes('wav')) return 'wav';
  if (mimeType.includes('mp3') || mimeType.includes('mpeg')) return 'mp3';
  return 'mp4';
}

async function setMeetingStatus(meetingId: string, status: string): Promise<void> {
  await supabaseAdmin()
    .from('meetings')
    .update({ status })
    .eq('id', meetingId);
}

// ─── createMeeting ────────────────────────────────────────────────────────────

export async function createMeeting(input: {
  customerId: string;
  captureMethod: 'browser_live' | 'file_upload';
}): Promise<{ meetingId: string }> {
  const admin = supabaseAdmin();

  const { data, error } = await admin
    .from('meetings')
    .insert({
      tenant_id: MOCK_TENANT_ID,
      advisor_id: MOCK_ADVISOR_ID,
      customer_id: input.customerId,
      status: 'idle',
      capture_method: input.captureMethod,
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`Nepodařilo se vytvořit schůzku: ${error?.message ?? 'neznámá chyba'}`);
  }

  await logEvent({
    type: 'meeting.created',
    data: { meeting_id: data.id, capture_method: input.captureMethod },
    advisorId: MOCK_ADVISOR_ID,
    tenantId: MOCK_TENANT_ID,
  });

  return { meetingId: data.id as string };
}

// ─── uploadAudioForm ──────────────────────────────────────────────────────────
// Accepts FormData with fields: meetingId (string), file (File/Blob), mimeType (string).

export async function uploadAudioForm(formData: FormData): Promise<void> {
  const meetingId = formData.get('meetingId');
  const file = formData.get('file');
  const mimeType = (formData.get('mimeType') as string | null) ?? 'audio/mp4';

  if (typeof meetingId !== 'string' || !meetingId) {
    throw new Error('uploadAudioForm: chybí meetingId');
  }
  if (!(file instanceof Blob)) {
    throw new Error('uploadAudioForm: chybí audio soubor');
  }

  const ext = extFromMimeType(mimeType);
  const storagePath = `${MOCK_ADVISOR_ID}/${meetingId}.${ext}`;
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const admin = supabaseAdmin();

  const { error: uploadError } = await admin.storage
    .from('audio')
    .upload(storagePath, buffer, { contentType: mimeType, upsert: true });

  if (uploadError) {
    throw new Error(`Nepodařilo se nahrát audio: ${uploadError.message}`);
  }

  await admin
    .from('meetings')
    .update({
      audio_url: storagePath,
      status: 'uploaded',
      recorded_at: new Date().toISOString(),
    })
    .eq('id', meetingId);

  await logEvent({
    type: 'audio.uploaded',
    data: { meeting_id: meetingId, storage_path: storagePath },
    advisorId: MOCK_ADVISOR_ID,
    tenantId: MOCK_TENANT_ID,
  });
}

// ─── runFullPipeline ──────────────────────────────────────────────────────────

export async function runFullPipeline(input: {
  meetingId: string;
  liveTranscriptText?: string;
}): Promise<void> {
  const { meetingId, liveTranscriptText } = input;
  const admin = supabaseAdmin();

  try {
    // 1. Fetch meeting row
    const { data: meeting, error: meetingError } = await admin
      .from('meetings')
      .select('*')
      .eq('id', meetingId)
      .single();

    if (meetingError || !meeting) {
      throw new Error(`Schůzka ${meetingId} nenalezena: ${meetingError?.message ?? ''}`);
    }
    const meetingRow = meeting as MeetingRow;

    if (!meetingRow.audio_url) {
      throw new Error('Schůzka nemá audio soubor — spusťte pipeline až po nahrání audia.');
    }

    // 2. Download audio from Storage
    const { data: audioData, error: audioError } = await admin.storage
      .from('audio')
      .download(meetingRow.audio_url);

    if (audioError || !audioData) {
      throw new Error(`Nepodařilo se stáhnout audio: ${audioError?.message ?? ''}`);
    }

    const audioBuffer = Buffer.from(await audioData.arrayBuffer());
    const filename = path.basename(meetingRow.audio_url);

    // 3. Transcribe with Whisper
    await setMeetingStatus(meetingId, 'transcribing');
    await logEvent({
      type: 'transcription.started',
      data: { meeting_id: meetingId },
      advisorId: MOCK_ADVISOR_ID,
      tenantId: MOCK_TENANT_ID,
    });

    const whisperResult = await transcribeAudio({ audio: audioBuffer, filename });

    await logEvent({
      type: 'transcription.completed',
      data: {
        meeting_id: meetingId,
        latency_ms: whisperResult.latency_ms,
      },
      advisorId: MOCK_ADVISOR_ID,
      tenantId: MOCK_TENANT_ID,
    });

    // 4. Upsert transcript row with whisper data; reconcile if live text present
    let finalText = whisperResult.text;
    let reconcileModel: string | null = null;
    let reconcileTokens: number | null = null;
    let reconcileLatencyMs: number | null = null;
    const promptVersion = 'reconcile-v1.0';

    if (liveTranscriptText && liveTranscriptText.trim().length > 0) {
      await setMeetingStatus(meetingId, 'reconciling');

      const reconcileResult = await reconcileTranscripts({
        liveText: liveTranscriptText,
        whisperText: whisperResult.text,
      });

      finalText = reconcileResult.text;
      reconcileModel = reconcileResult.model;
      reconcileTokens = reconcileResult.tokens;
      reconcileLatencyMs = reconcileResult.latency_ms;

      await logEvent({
        type: 'reconciliation.completed',
        data: { meeting_id: meetingId, latency_ms: reconcileResult.latency_ms },
        advisorId: MOCK_ADVISOR_ID,
        tenantId: MOCK_TENANT_ID,
      });
    }

    // Upsert transcript (meeting_id has a UNIQUE constraint)
    const { data: transcriptData, error: transcriptError } = await admin
      .from('transcripts')
      .upsert(
        {
          meeting_id: meetingId,
          live_text: liveTranscriptText ?? null,
          whisper_text: whisperResult.text,
          text: finalText,
          language: whisperResult.language,
          whisper_model: whisperResult.model,
          whisper_tokens: whisperResult.tokens,
          whisper_latency_ms: whisperResult.latency_ms,
          reconcile_model: reconcileModel,
          reconcile_tokens: reconcileTokens,
          reconcile_latency_ms: reconcileLatencyMs,
          prompt_version: promptVersion,
        },
        { onConflict: 'meeting_id' },
      )
      .select('id')
      .single();

    if (transcriptError || !transcriptData) {
      throw new Error(`Nepodařilo se uložit přepis: ${transcriptError?.message ?? ''}`);
    }

    const transcriptRow = transcriptData as TranscriptRow;

    // 5. Extract structured data with GPT-4o
    await setMeetingStatus(meetingId, 'extracting');

    if (!finalText.trim()) {
      throw new Error('Přepis je prázdný — nelze spustit extrakci.');
    }

    const extractionResult = await extractFromTranscript({
      transcriptText: finalText,
      contextDate: new Date(),
    });

    const { data: extractionData, error: extractionError } = await admin
      .from('extractions')
      .insert({
        meeting_id: meetingId,
        transcript_id: transcriptRow.id,
        structured_data: extractionResult.data,
        model: extractionResult.model,
        tokens_used: extractionResult.tokens,
        latency_ms: extractionResult.latency_ms,
        prompt_version: extractionResult.promptVersion,
      })
      .select('id')
      .single();

    if (extractionError || !extractionData) {
      throw new Error(`Nepodařilo se uložit extrakci: ${extractionError?.message ?? ''}`);
    }

    const extractionRow = extractionData as ExtractionRow;

    await logEvent({
      type: 'extraction.completed',
      data: {
        meeting_id: meetingId,
        tokens: extractionResult.tokens,
        latency_ms: extractionResult.latency_ms,
      },
      advisorId: MOCK_ADVISOR_ID,
      tenantId: MOCK_TENANT_ID,
    });

    // 6. Calculate + generate narrative + render PDF
    await setMeetingStatus(meetingId, 'generating');

    const calculation = calculate(extractionResult.data);

    const { data: calcData, error: calcError } = await admin
      .from('calculations')
      .insert({
        meeting_id: meetingId,
        extraction_id: extractionRow.id,
        results: calculation,
        calculator_version: calculation.calculator_version,
      })
      .select('id')
      .single();

    if (calcError || !calcData) {
      throw new Error(`Nepodařilo se uložit výpočet: ${calcError?.message ?? ''}`);
    }

    await logEvent({
      type: 'calculation.completed',
      data: { meeting_id: meetingId },
      advisorId: MOCK_ADVISOR_ID,
      tenantId: MOCK_TENANT_ID,
    });

    const narrative = await generateOfferNarrative({
      extraction: extractionResult.data,
      calculation,
    });

    // Fetch customer name for the PDF
    const { data: customerData } = await admin
      .from('customers')
      .select('full_name')
      .eq('id', meetingRow.customer_id)
      .single();

    const customerName = (customerData as { full_name: string } | null)?.full_name ?? null;

    const pdfBuffer = await generateOfferPdfBuffer({
      customer: {
        full_name: customerName,
        age: extractionResult.data.customer.age,
        occupation: extractionResult.data.customer.occupation,
        marital_status: extractionResult.data.customer.marital_status,
        has_children: extractionResult.data.customer.has_children,
        children_count: extractionResult.data.customer.children_count,
      },
      advisor: { full_name: 'Karel Novák', email: 'karel.novak@4fin.cz' },
      tenant: { name: '4FIN HOLDING' },
      extraction: extractionResult.data,
      calculation,
      narrative,
      generatedAt: new Date(),
    });

    const { publicUrl } = await uploadOfferPdf({
      advisorId: MOCK_ADVISOR_ID,
      meetingId,
      buffer: pdfBuffer,
    });

    await admin.from('offers').insert({
      tenant_id: MOCK_TENANT_ID,
      advisor_id: MOCK_ADVISOR_ID,
      customer_id: meetingRow.customer_id,
      meeting_id: meetingId,
      pdf_url: publicUrl,
      generated_text: narrative,
      model: 'gpt-4o-mini',
      status: 'draft',
    });

    await logEvent({
      type: 'pdf.generated',
      data: { meeting_id: meetingId, pdf_url: publicUrl },
      advisorId: MOCK_ADVISOR_ID,
      tenantId: MOCK_TENANT_ID,
    });

    // 7. Mark ready
    await setMeetingStatus(meetingId, 'ready');
  } catch (err) {
    await setMeetingStatus(meetingId, 'failed').catch(() => null);
    await logEvent({
      type: 'pipeline.failed',
      data: {
        meeting_id: meetingId,
        error: err instanceof Error ? err.message : String(err),
      },
      advisorId: MOCK_ADVISOR_ID,
      tenantId: MOCK_TENANT_ID,
    });
    throw err;
  }
}

// ─── getMeetingFull ───────────────────────────────────────────────────────────

export interface MeetingFull {
  id: string;
  status: string;
  audio_url: string | null;
  capture_method: string | null;
  scheduled_at: string | null;
  recorded_at: string | null;
  created_at: string;
  customer: { id: string; full_name: string } | null;
  transcript: {
    id: string;
    text: string | null;
    live_text: string | null;
    whisper_text: string | null;
    language: string;
  } | null;
  extraction: { id: string; structured_data: unknown } | null;
  calculation: { id: string; results: unknown } | null;
  offer: { id: string; pdf_url: string | null; status: string } | null;
}

export async function getMeetingFull(meetingId: string): Promise<MeetingFull | null> {
  const admin = supabaseAdmin();

  // Fetch meeting
  const { data: meeting, error: meetingError } = await admin
    .from('meetings')
    .select('id, status, audio_url, capture_method, scheduled_at, recorded_at, created_at, customer_id')
    .eq('id', meetingId)
    .single();

  if (meetingError || !meeting) return null;

  const m = meeting as {
    id: string;
    status: string;
    audio_url: string | null;
    capture_method: string | null;
    scheduled_at: string | null;
    recorded_at: string | null;
    created_at: string;
    customer_id: string;
  };

  // Fetch related rows in parallel
  const [customerRes, transcriptRes, extractionRes] = await Promise.all([
    admin.from('customers').select('id, full_name').eq('id', m.customer_id).single(),
    admin.from('transcripts').select('id, text, live_text, whisper_text, language').eq('meeting_id', meetingId).single(),
    admin.from('extractions').select('id, structured_data').eq('meeting_id', meetingId).order('created_at', { ascending: false }).limit(1).single(),
  ]);

  const extractionId = (extractionRes.data as { id: string } | null)?.id ?? null;

  const calculationRes = extractionId
    ? await admin.from('calculations').select('id, results').eq('extraction_id', extractionId).single()
    : { data: null };

  const offerRes = await admin
    .from('offers')
    .select('id, pdf_url, status')
    .eq('meeting_id', meetingId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return {
    id: m.id,
    status: m.status,
    audio_url: m.audio_url,
    capture_method: m.capture_method,
    scheduled_at: m.scheduled_at,
    recorded_at: m.recorded_at,
    created_at: m.created_at,
    customer: customerRes.data as { id: string; full_name: string } | null,
    transcript: transcriptRes.data as MeetingFull['transcript'] | null,
    extraction: extractionRes.data as { id: string; structured_data: unknown } | null,
    calculation: calculationRes.data as { id: string; results: unknown } | null,
    offer: offerRes.data as { id: string; pdf_url: string | null; status: string } | null,
  };
}

// ─── getMeetingsList ──────────────────────────────────────────────────────────

export interface MeetingListItem {
  id: string;
  status: string;
  created_at: string;
  customer_name: string | null;
}

export async function getMeetingsList(): Promise<MeetingListItem[]> {
  const admin = supabaseAdmin();

  const { data, error } = await admin
    .from('meetings')
    .select('id, status, created_at, customers(full_name)')
    .eq('advisor_id', MOCK_ADVISOR_ID)
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  return (data as unknown[]).map((row) => {
    const r = row as {
      id: string;
      status: string;
      created_at: string;
      customers: { full_name: string } | null;
    };
    return {
      id: r.id,
      status: r.status,
      created_at: r.created_at,
      customer_name: r.customers?.full_name ?? null,
    };
  });
}
