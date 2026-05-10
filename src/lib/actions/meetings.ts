'use server';

import path from 'path';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { currentAdvisorId, MOCK_TENANT_ID } from '@/lib/auth';
import { logEvent } from '@/lib/analytics/events';
import { transcribeAudio } from '@/lib/openai/whisper';
import { reconcileTranscripts } from '@/lib/openai/reconcile';
import { cleanupTranscript } from '@/lib/openai/cleanup';
import { extractFromTranscript } from '@/lib/openai/extraction';
import { calculate } from '@/lib/calculator';
import { generateOfferNarrative } from '@/lib/openai/narrative';
import { generateOfferPdfBuffer, uploadOfferPdf } from '@/lib/pdf/generate';
import { getCustomerHints, getWhisperPromptHint } from '@/lib/actions/customers';

// ─── Inline DB types (TODO: replace with generated types after supabase gen) ──

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
  cleaned_text: string | null;
  cleanup_corrections: unknown;
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
  await supabaseAdmin().from('meetings').update({ status }).eq('id', meetingId);
}

async function requireMeeting(meetingId: string, advisorId: string): Promise<MeetingRow> {
  const { data, error } = await supabaseAdmin()
    .from('meetings')
    .select('*')
    .eq('id', meetingId)
    .eq('advisor_id', advisorId)
    .single();
  if (error || !data) {
    throw new Error('Schůzka nenalezena nebo k ní nemáte přístup.');
  }
  return data as MeetingRow;
}

async function getTranscript(meetingId: string): Promise<TranscriptRow | null> {
  const { data } = await supabaseAdmin()
    .from('transcripts')
    .select('id, meeting_id, live_text, whisper_text, text, cleaned_text, cleanup_corrections')
    .eq('meeting_id', meetingId)
    .single();
  return (data as TranscriptRow | null) ?? null;
}

async function assertMeetingOwnership(meetingId: string, advisorId: string): Promise<void> {
  const { data, error } = await supabaseAdmin()
    .from('meetings')
    .select('id')
    .eq('id', meetingId)
    .eq('advisor_id', advisorId)
    .single();
  if (error || !data) {
    throw new Error('Schůzka nenalezena nebo k ní nemáte přístup.');
  }
}

// ─── createMeeting ────────────────────────────────────────────────────────────

export async function createMeeting(input: {
  customerId: string;
  captureMethod: 'browser_live' | 'file_upload';
}): Promise<{ meetingId: string }> {
  const advisorId = await currentAdvisorId();
  const admin = supabaseAdmin();

  const { data, error } = await admin
    .from('meetings')
    .insert({
      tenant_id: MOCK_TENANT_ID,
      advisor_id: advisorId,
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
    advisorId,
    tenantId: MOCK_TENANT_ID,
  });

  return { meetingId: data.id as string };
}

// ─── uploadAudioForm ──────────────────────────────────────────────────────────

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

  const advisorId = await currentAdvisorId();
  await assertMeetingOwnership(meetingId, advisorId);

  const ext = extFromMimeType(mimeType);
  const storagePath = `${advisorId}/${meetingId}.${ext}`;
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
    advisorId,
    tenantId: MOCK_TENANT_ID,
  });
}

// ─── Per-step result type ─────────────────────────────────────────────────────

export type StepResult =
  | { ok: true; skipped?: boolean }
  | { ok: false; error: string };

export type StepOpts = {
  /** Re-run the step even if its output already exists. */
  force?: boolean;
};

// ─── runStepTranscribe ────────────────────────────────────────────────────────
// Whisper transkripce. Vyžaduje meeting.audio_url.
// Idempotentní: pokud transcripts.whisper_text už existuje a !force → skip.

export async function runStepTranscribe(
  meetingId: string,
  opts?: StepOpts & { liveTranscriptText?: string },
): Promise<StepResult> {
  try {
    const advisorId = await currentAdvisorId();
    const meeting = await requireMeeting(meetingId, advisorId);

    if (!meeting.audio_url) {
      throw new Error('Schůzka nemá audio soubor — nahrajte audio před spuštěním transkripce.');
    }

    const existing = await getTranscript(meetingId);
    if (existing?.whisper_text && !opts?.force) {
      return { ok: true, skipped: true };
    }

    await setMeetingStatus(meetingId, 'transcribing');
    await logEvent({
      type: 'transcription.started',
      data: { meeting_id: meetingId },
      advisorId,
      tenantId: MOCK_TENANT_ID,
    });

    const admin = supabaseAdmin();
    const { data: audioData, error: audioError } = await admin.storage
      .from('audio')
      .download(meeting.audio_url);
    if (audioError || !audioData) {
      throw new Error(`Nepodařilo se stáhnout audio: ${audioError?.message ?? ''}`);
    }
    const audioBuffer = Buffer.from(await audioData.arrayBuffer());
    const filename = path.basename(meeting.audio_url);

    // Customer-name + brand hints for Whisper prompt (Recommended #2)
    const promptHint = await getWhisperPromptHint(advisorId);

    const whisperResult = await transcribeAudio({
      audio: audioBuffer,
      filename,
      prompt: promptHint || undefined,
    });

    await admin.from('transcripts').upsert(
      {
        meeting_id: meetingId,
        live_text: opts?.liveTranscriptText ?? existing?.live_text ?? null,
        whisper_text: whisperResult.text,
        // Initial canonical text — reconcile may overwrite.
        text: existing?.text ?? whisperResult.text,
        language: whisperResult.language,
        whisper_model: whisperResult.model,
        whisper_tokens: whisperResult.tokens,
        whisper_latency_ms: whisperResult.latency_ms,
      },
      { onConflict: 'meeting_id' },
    );

    await logEvent({
      type: 'transcription.completed',
      data: { meeting_id: meetingId, latency_ms: whisperResult.latency_ms },
      advisorId,
      tenantId: MOCK_TENANT_ID,
    });

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await setMeetingStatus(meetingId, 'failed').catch(() => null);
    await logEvent({
      type: 'pipeline.failed',
      data: { meeting_id: meetingId, step: 'transcribe', error: message },
      advisorId: await currentAdvisorId().catch(() => ''),
      tenantId: MOCK_TENANT_ID,
    }).catch(() => null);
    return { ok: false, error: message };
  }
}

// ─── runStepReconcile ─────────────────────────────────────────────────────────
// Sloučí live + whisper přepis. Pokud nemáme live text, zkratka: text=whisper.
// Idempotentní: !force → skip pokud reconcile už proběhl.

export async function runStepReconcile(
  meetingId: string,
  opts?: StepOpts,
): Promise<StepResult> {
  try {
    const advisorId = await currentAdvisorId();
    await requireMeeting(meetingId, advisorId);

    const transcript = await getTranscript(meetingId);
    if (!transcript || !transcript.whisper_text) {
      throw new Error('Reconcile vyžaduje hotový Whisper přepis. Spusťte transkripci nejdřív.');
    }

    // Idempotence: pokud máme `text` set z reconcile (ne shortcut z transcribe)
    // a !force, skip. Heuristika: reconcile_model is non-null.
    const admin = supabaseAdmin();
    const { data: trMeta } = await admin
      .from('transcripts')
      .select('reconcile_model')
      .eq('meeting_id', meetingId)
      .single();
    const reconcileAlreadyDone = (trMeta as { reconcile_model: string | null } | null)?.reconcile_model;
    if (reconcileAlreadyDone && !opts?.force) {
      return { ok: true, skipped: true };
    }

    await setMeetingStatus(meetingId, 'reconciling');

    const reconcileResult = await reconcileTranscripts({
      liveText: transcript.live_text ?? '',
      whisperText: transcript.whisper_text,
    });

    await admin
      .from('transcripts')
      .update({
        text: reconcileResult.text,
        reconcile_model: reconcileResult.model,
        reconcile_tokens: reconcileResult.tokens,
        reconcile_latency_ms: reconcileResult.latency_ms,
        prompt_version: reconcileResult.promptVersion,
      })
      .eq('meeting_id', meetingId);

    await logEvent({
      type: 'reconciliation.completed',
      data: { meeting_id: meetingId, latency_ms: reconcileResult.latency_ms },
      advisorId,
      tenantId: MOCK_TENANT_ID,
    });

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await setMeetingStatus(meetingId, 'failed').catch(() => null);
    return { ok: false, error: message };
  }
}

// ─── runStepCleanup ───────────────────────────────────────────────────────────
// AI cleanup českých překlepů, diakritiky, jmen. gpt-4o-mini structured output.

export async function runStepCleanup(
  meetingId: string,
  opts?: StepOpts,
): Promise<StepResult> {
  try {
    const advisorId = await currentAdvisorId();
    await requireMeeting(meetingId, advisorId);

    const transcript = await getTranscript(meetingId);
    if (!transcript || !transcript.text) {
      throw new Error('Cleanup vyžaduje reconciled přepis. Spusťte reconcile nejdřív.');
    }

    if (transcript.cleaned_text && !opts?.force) {
      return { ok: true, skipped: true };
    }

    await setMeetingStatus(meetingId, 'cleaning');

    const customerHints = await getCustomerHints(advisorId);

    const cleanupResult = await cleanupTranscript({
      reconciledText: transcript.text,
      customerHints,
    });

    const admin = supabaseAdmin();
    await admin
      .from('transcripts')
      .update({
        cleaned_text: cleanupResult.cleanedText,
        cleanup_corrections: cleanupResult.corrections,
        cleanup_model: cleanupResult.model,
        cleanup_tokens: cleanupResult.tokens,
        cleanup_latency_ms: cleanupResult.latency_ms,
      })
      .eq('meeting_id', meetingId);

    await setMeetingStatus(meetingId, 'cleaned');

    await logEvent({
      type: 'cleanup.completed',
      data: {
        meeting_id: meetingId,
        latency_ms: cleanupResult.latency_ms,
        corrections_count: cleanupResult.corrections.length,
      },
      advisorId,
      tenantId: MOCK_TENANT_ID,
    });

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await setMeetingStatus(meetingId, 'failed').catch(() => null);
    return { ok: false, error: message };
  }
}

// ─── runStepExtract ───────────────────────────────────────────────────────────
// GPT-4o strict structured outputs → CustomerExtraction včetně meeting_facts.
// Preferuje cleaned_text > text > whisper_text.

export async function runStepExtract(
  meetingId: string,
  opts?: StepOpts,
): Promise<StepResult> {
  try {
    const advisorId = await currentAdvisorId();
    await requireMeeting(meetingId, advisorId);

    const transcript = await getTranscript(meetingId);
    if (!transcript) {
      throw new Error('Extrakce vyžaduje přepis. Spusťte transkripci nejdřív.');
    }

    const sourceText =
      transcript.cleaned_text?.trim() ||
      transcript.text?.trim() ||
      transcript.whisper_text?.trim() ||
      '';
    if (!sourceText) {
      throw new Error('Přepis je prázdný — nelze spustit extrakci.');
    }

    const admin = supabaseAdmin();
    const { data: existingExtraction } = await admin
      .from('extractions')
      .select('id')
      .eq('meeting_id', meetingId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existingExtraction && !opts?.force) {
      return { ok: true, skipped: true };
    }

    await setMeetingStatus(meetingId, 'extracting');

    const extractionResult = await extractFromTranscript({
      transcriptText: sourceText,
      contextDate: new Date(),
    });

    await admin.from('extractions').insert({
      meeting_id: meetingId,
      transcript_id: transcript.id,
      structured_data: extractionResult.data,
      model: extractionResult.model,
      tokens_used: extractionResult.tokens,
      latency_ms: extractionResult.latency_ms,
      prompt_version: extractionResult.promptVersion,
    });

    await setMeetingStatus(meetingId, 'extracted');

    await logEvent({
      type: 'extraction.completed',
      data: {
        meeting_id: meetingId,
        tokens: extractionResult.tokens,
        latency_ms: extractionResult.latency_ms,
      },
      advisorId,
      tenantId: MOCK_TENANT_ID,
    });

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await setMeetingStatus(meetingId, 'failed').catch(() => null);
    return { ok: false, error: message };
  }
}

// ─── runStepCalculate ─────────────────────────────────────────────────────────
// EFA + retirement + cashflow. Closes the offer-readiness gap by persisting
// calculations row.

export async function runStepCalculate(
  meetingId: string,
  opts?: StepOpts,
): Promise<StepResult> {
  try {
    const advisorId = await currentAdvisorId();
    const meeting = await requireMeeting(meetingId, advisorId);

    const admin = supabaseAdmin();
    const { data: extractionData, error: exErr } = await admin
      .from('extractions')
      .select('id, structured_data')
      .eq('meeting_id', meetingId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    if (exErr || !extractionData) {
      throw new Error('Výpočet vyžaduje extrakci. Spusťte extract nejdřív.');
    }
    const extractionRow = extractionData as ExtractionRow;

    const { data: existingCalc } = await admin
      .from('calculations')
      .select('id')
      .eq('extraction_id', extractionRow.id)
      .single();
    if (existingCalc && !opts?.force) {
      return { ok: true, skipped: true };
    }

    // Customer name from DB (not from extraction; advisor's contact list is canonical).
    const { data: customerData } = await admin
      .from('customers')
      .select('full_name')
      .eq('id', meeting.customer_id)
      .single();
    const customerNameFromDb =
      (customerData as { full_name: string } | null)?.full_name ?? null;

    const calculation = calculate(
      extractionRow.structured_data as Parameters<typeof calculate>[0],
      { customerNameFromDb },
    );

    if (existingCalc) {
      await admin
        .from('calculations')
        .update({
          results: calculation,
          calculator_version: calculation.calculator_version,
        })
        .eq('id', (existingCalc as { id: string }).id);
    } else {
      await admin.from('calculations').insert({
        meeting_id: meetingId,
        extraction_id: extractionRow.id,
        results: calculation,
        calculator_version: calculation.calculator_version,
      });
    }

    await logEvent({
      type: 'calculation.completed',
      data: { meeting_id: meetingId },
      advisorId,
      tenantId: MOCK_TENANT_ID,
    });

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await setMeetingStatus(meetingId, 'failed').catch(() => null);
    return { ok: false, error: message };
  }
}

// ─── runStepGenerate ──────────────────────────────────────────────────────────
// AI narrative + react-pdf render + Storage upload + offers row → status='ready'.

export async function runStepGenerate(
  meetingId: string,
  opts?: StepOpts,
): Promise<StepResult> {
  try {
    const advisorId = await currentAdvisorId();
    const meeting = await requireMeeting(meetingId, advisorId);

    const admin = supabaseAdmin();
    const [extractionRes, calcRes, customerRes, advisorRes] = await Promise.all([
      admin
        .from('extractions')
        .select('id, structured_data')
        .eq('meeting_id', meetingId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),
      admin
        .from('calculations')
        .select('id, results')
        .eq('meeting_id', meetingId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),
      admin.from('customers').select('full_name').eq('id', meeting.customer_id).single(),
      admin.from('advisors').select('full_name, email').eq('id', advisorId).single(),
    ]);

    if (!extractionRes.data) {
      throw new Error('PDF vyžaduje extrakci.');
    }
    if (!calcRes.data) {
      throw new Error('PDF vyžaduje výpočet.');
    }

    const { data: existingOffer } = await admin
      .from('offers')
      .select('id, pdf_url')
      .eq('meeting_id', meetingId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    const existingOfferRow = existingOffer as { id: string; pdf_url: string | null } | null;
    if (existingOfferRow?.pdf_url && !opts?.force) {
      await setMeetingStatus(meetingId, 'ready');
      return { ok: true, skipped: true };
    }

    await setMeetingStatus(meetingId, 'generating');

    const extractionData = (extractionRes.data as ExtractionRow).structured_data as Parameters<
      typeof generateOfferNarrative
    >[0]['extraction'];
    const calculation = (calcRes.data as { results: unknown }).results as Parameters<
      typeof generateOfferNarrative
    >[0]['calculation'];

    const narrative = await generateOfferNarrative({
      extraction: extractionData,
      calculation,
    });

    const customerName = (customerRes.data as { full_name: string } | null)?.full_name ?? null;
    const advisorRow = advisorRes.data as { full_name: string; email: string } | null;

    const pdfBuffer = await generateOfferPdfBuffer({
      customer: {
        full_name: customerName,
        age: extractionData.customer.age,
        occupation: extractionData.customer.occupation,
        marital_status: extractionData.customer.marital_status,
        has_children: extractionData.customer.has_children,
        children_count: extractionData.customer.children_count,
      },
      advisor: {
        full_name: advisorRow?.full_name ?? 'Poradce',
        email: advisorRow?.email ?? '',
      },
      tenant: { name: '4FIN HOLDING' },
      extraction: extractionData,
      calculation,
      narrative,
      generatedAt: new Date(),
    });

    const { publicUrl } = await uploadOfferPdf({ advisorId, meetingId, buffer: pdfBuffer });

    if (existingOfferRow) {
      await admin
        .from('offers')
        .update({ pdf_url: publicUrl, generated_text: narrative, model: 'gpt-4o-mini' })
        .eq('id', existingOfferRow.id);
    } else {
      await admin.from('offers').insert({
        tenant_id: MOCK_TENANT_ID,
        advisor_id: advisorId,
        customer_id: meeting.customer_id,
        meeting_id: meetingId,
        pdf_url: publicUrl,
        generated_text: narrative,
        model: 'gpt-4o-mini',
        status: 'draft',
      });
    }

    await setMeetingStatus(meetingId, 'ready');

    await logEvent({
      type: 'pdf.generated',
      data: { meeting_id: meetingId, pdf_url: publicUrl },
      advisorId,
      tenantId: MOCK_TENANT_ID,
    });

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await setMeetingStatus(meetingId, 'failed').catch(() => null);
    return { ok: false, error: message };
  }
}

// ─── runFullPipeline ──────────────────────────────────────────────────────────
// Orchestrátor — sekvenčně volá všech 6 kroků. Pokud kterýkoli krok selže, stop.

export async function runFullPipeline(input: {
  meetingId: string;
  liveTranscriptText?: string;
}): Promise<void> {
  const { meetingId, liveTranscriptText } = input;

  const steps: Array<() => Promise<StepResult>> = [
    () => runStepTranscribe(meetingId, { liveTranscriptText }),
    () => runStepReconcile(meetingId),
    () => runStepCleanup(meetingId),
    () => runStepExtract(meetingId),
    () => runStepCalculate(meetingId),
    () => runStepGenerate(meetingId),
  ];

  for (const step of steps) {
    const result = await step();
    if (!result.ok) {
      throw new Error(result.error);
    }
  }
}

// ─── retryPipeline ────────────────────────────────────────────────────────────

export async function retryPipeline(meetingId: string): Promise<void> {
  await runFullPipeline({ meetingId });
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
    cleaned_text: string | null;
    cleanup_corrections: unknown;
    language: string;
    whisper_model: string | null;
    whisper_tokens: number | null;
    whisper_latency_ms: number | null;
    reconcile_model: string | null;
    reconcile_tokens: number | null;
    reconcile_latency_ms: number | null;
    cleanup_model: string | null;
    cleanup_tokens: number | null;
    cleanup_latency_ms: number | null;
  } | null;
  extraction: {
    id: string;
    structured_data: unknown;
    model: string | null;
    tokens_used: number | null;
    latency_ms: number | null;
  } | null;
  calculation: { id: string; results: unknown; calculator_version: string | null } | null;
  offer: { id: string; pdf_url: string | null; status: string; model: string | null } | null;
}

export async function getMeetingFull(meetingId: string): Promise<MeetingFull | null> {
  const advisorId = await currentAdvisorId();
  const admin = supabaseAdmin();

  const { data: meeting, error: meetingError } = await admin
    .from('meetings')
    .select('id, status, audio_url, capture_method, scheduled_at, recorded_at, created_at, customer_id')
    .eq('id', meetingId)
    .eq('advisor_id', advisorId)
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

  const [customerRes, transcriptRes, extractionRes] = await Promise.all([
    admin.from('customers').select('id, full_name').eq('id', m.customer_id).single(),
    admin
      .from('transcripts')
      .select(
        'id, text, live_text, whisper_text, cleaned_text, cleanup_corrections, language, whisper_model, whisper_tokens, whisper_latency_ms, reconcile_model, reconcile_tokens, reconcile_latency_ms, cleanup_model, cleanup_tokens, cleanup_latency_ms',
      )
      .eq('meeting_id', meetingId)
      .single(),
    admin
      .from('extractions')
      .select('id, structured_data, model, tokens_used, latency_ms')
      .eq('meeting_id', meetingId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),
  ]);

  const extractionId = (extractionRes.data as { id: string } | null)?.id ?? null;

  const calculationRes = extractionId
    ? await admin
        .from('calculations')
        .select('id, results, calculator_version')
        .eq('extraction_id', extractionId)
        .single()
    : { data: null };

  const offerRes = await admin
    .from('offers')
    .select('id, pdf_url, status, model')
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
    extraction: extractionRes.data as MeetingFull['extraction'] | null,
    calculation: calculationRes.data as MeetingFull['calculation'] | null,
    offer: offerRes.data as MeetingFull['offer'] | null,
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
  const advisorId = await currentAdvisorId();
  const admin = supabaseAdmin();

  const { data, error } = await admin
    .from('meetings')
    .select('id, status, created_at, customers(full_name)')
    .eq('advisor_id', advisorId)
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
