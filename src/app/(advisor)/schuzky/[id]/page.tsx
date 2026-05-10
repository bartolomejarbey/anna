import { Microphone } from '@phosphor-icons/react/dist/ssr';
import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  getMeetingFull,
  retryPipeline,
  runStepTranscribe,
  runStepReconcile,
  runStepCleanup,
  runStepExtract,
  runStepCalculate,
  runStepGenerate,
  type MeetingFull,
} from '@/lib/actions/meetings';
import { MeetingStatusPill, type MeetingStatus } from '@/components/meeting-status-pill';
import { TranscriptViewer } from '@/components/transcript-viewer';
import { ExtractionEditor } from '@/components/extraction-editor';
import { OfferPreview } from '@/components/offer-preview';
import {
  PipelineStepRow,
  type StepStatus,
} from '@/components/pipeline/pipeline-step-row';
import {
  CleanupCorrectionsDiff,
  type CleanupCorrection,
} from '@/components/pipeline/cleanup-corrections-diff';
import { EmptyState } from '@/components/ui/empty-state';
import { Card } from '@/components/ui/card';

// ---------------------------------------------------------------------------
// Per-step status derivation from MeetingFull state.
// ---------------------------------------------------------------------------

function deriveStepStatus(meeting: MeetingFull) {
  const t = meeting.transcript;
  const status = meeting.status as MeetingStatus;
  const failed = status === 'failed';

  const transcribeDone = !!t?.whisper_text;
  const reconcileDone = !!t?.reconcile_model;
  const cleanupDone = !!t?.cleaned_text;
  const extractDone = !!meeting.extraction;
  const calculateDone = !!meeting.calculation;
  const generateDone = !!meeting.offer?.pdf_url;

  function step(
    done: boolean,
    runningStatus: MeetingStatus,
    prevDone: boolean,
  ): StepStatus {
    if (done) return 'done';
    if (status === runningStatus) return 'running';
    if (failed && prevDone) return 'error';
    return 'pending';
  }

  return {
    transcribe: step(transcribeDone, 'transcribing', true),
    reconcile: step(reconcileDone, 'reconciling', transcribeDone),
    cleanup: step(cleanupDone, 'cleaning', reconcileDone),
    extract: step(extractDone, 'extracting', cleanupDone),
    // calculate sdílí 'generating' status — done je own signál (calculations row).
    calculate: calculateDone
      ? ('done' as StepStatus)
      : status === 'generating'
        ? ('running' as StepStatus)
        : failed && extractDone
          ? ('error' as StepStatus)
          : ('pending' as StepStatus),
    generate: step(generateDone, 'generating', calculateDone),
  };
}

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let meeting: MeetingFull | null = null;
  let dbUnavailable = false;

  try {
    meeting = await getMeetingFull(id);
  } catch {
    dbUnavailable = true;
  }

  if (dbUnavailable) {
    return (
      <div className="mx-auto w-full max-w-[960px] px-8 py-16">
        <EmptyState
          icon={Microphone}
          heading="Data se zobrazí po napojení na databázi."
        />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="mx-auto w-full max-w-[960px] px-8 py-16">
        <EmptyState
          icon={Microphone}
          heading="Schůzka nenalezena."
          action={{ label: 'Zpět na schůzky', href: '/schuzky' }}
        />
      </div>
    );
  }

  const meetingId = meeting.id;
  const customerName = meeting.customer?.full_name ?? 'Zákazník';
  const status = meeting.status as MeetingStatus;

  // Audio signed URL for player
  let audioSignedUrl: string | null = null;
  if (meeting.audio_url) {
    try {
      const { data } = await supabaseAdmin()
        .storage.from('audio')
        .createSignedUrl(meeting.audio_url, 3600);
      audioSignedUrl = data?.signedUrl ?? null;
    } catch {
      // Non-fatal
    }
  }

  const meetingDate = meeting.recorded_at ?? meeting.created_at;
  const formattedDate = new Date(meetingDate).toLocaleDateString('cs-CZ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Bound rerun server actions, scoped to this meeting.
  async function rerunTranscribe() {
    'use server';
    await runStepTranscribe(meetingId, { force: true });
    revalidatePath(`/schuzky/${meetingId}`);
  }
  async function rerunReconcile() {
    'use server';
    await runStepReconcile(meetingId, { force: true });
    revalidatePath(`/schuzky/${meetingId}`);
  }
  async function rerunCleanup() {
    'use server';
    await runStepCleanup(meetingId, { force: true });
    revalidatePath(`/schuzky/${meetingId}`);
  }
  async function rerunExtract() {
    'use server';
    await runStepExtract(meetingId, { force: true });
    revalidatePath(`/schuzky/${meetingId}`);
  }
  async function rerunCalculate() {
    'use server';
    await runStepCalculate(meetingId, { force: true });
    revalidatePath(`/schuzky/${meetingId}`);
  }
  async function rerunGenerate() {
    'use server';
    await runStepGenerate(meetingId, { force: true });
    revalidatePath(`/schuzky/${meetingId}`);
  }
  async function rerunFullPipeline() {
    'use server';
    try {
      await retryPipeline(meetingId);
    } finally {
      revalidatePath(`/schuzky/${meetingId}`);
    }
  }

  const stepStatus = deriveStepStatus(meeting);
  const cleanupCorrections =
    (meeting.transcript?.cleanup_corrections as CleanupCorrection[] | null) ?? null;

  return (
    <div className="mx-auto w-full max-w-[1100px] px-8 py-16">
      {/* Header */}
      <div className="mb-12 flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-h1 text-primary">{customerName}</h1>
          <p className="text-body-sm text-tertiary">{formattedDate}</p>
        </div>
        <div className="mt-1">
          <MeetingStatusPill status={status} />
        </div>
      </div>

      {/* Audio */}
      {audioSignedUrl && (
        <Card variant="compact" className="mb-12">
          <p className="mb-3 text-caption text-tertiary">Nahrávka</p>
          <audio controls src={audioSignedUrl} className="w-full" />
        </Card>
      )}

      {/* Pipeline 6 steps */}
      <section className="mb-12">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-caption text-tertiary">Pipeline</h2>
          {status !== 'ready' && (
            <form action={rerunFullPipeline}>
              <button
                type="submit"
                className="inline-flex h-9 items-center justify-center rounded-[8px] bg-accent px-4 text-body-sm font-medium text-accent-text transition-opacity hover:opacity-90 active:scale-[0.98]"
              >
                {status === 'failed' ? 'Spustit znovu' : 'Spustit zpracování'}
              </button>
            </form>
          )}
        </div>
        <Card>
          <PipelineStepRow
            number={1}
            label="Transkripce"
            description="Whisper-1 → český text z audia"
            status={stepStatus.transcribe}
            meta={{
              model: meeting.transcript?.whisper_model,
              latencyMs: meeting.transcript?.whisper_latency_ms,
              tokens: meeting.transcript?.whisper_tokens,
            }}
            rerunAction={rerunTranscribe}
          />
          <PipelineStepRow
            number={2}
            label="Sjednocení přepisu"
            description="GPT-4o-mini sloučí Whisper + živé titulky"
            status={stepStatus.reconcile}
            meta={{
              model: meeting.transcript?.reconcile_model,
              latencyMs: meeting.transcript?.reconcile_latency_ms,
              tokens: meeting.transcript?.reconcile_tokens,
            }}
            rerunAction={rerunReconcile}
          />
          <PipelineStepRow
            number={3}
            label="Cleanup českých překlepů"
            description="GPT-4o-mini opraví diakritiku, jména a značky"
            status={stepStatus.cleanup}
            meta={{
              model: meeting.transcript?.cleanup_model,
              latencyMs: meeting.transcript?.cleanup_latency_ms,
              tokens: meeting.transcript?.cleanup_tokens,
            }}
            rerunAction={rerunCleanup}
          />
          <PipelineStepRow
            number={4}
            label="Extrakce"
            description="GPT-4o → strukturovaná data zákazníka"
            status={stepStatus.extract}
            meta={{
              model: meeting.extraction?.model,
              latencyMs: meeting.extraction?.latency_ms,
              tokens: meeting.extraction?.tokens_used,
            }}
            rerunAction={rerunExtract}
          />
          <PipelineStepRow
            number={5}
            label="Výpočet zajištění"
            description="EFA + důchod + cashflow podle 4FIN metodiky"
            status={stepStatus.calculate}
            meta={{
              model: meeting.calculation?.calculator_version,
            }}
            rerunAction={rerunCalculate}
          />
          <PipelineStepRow
            number={6}
            label="PDF nabídka"
            description="AI narrative + react-pdf"
            status={stepStatus.generate}
            meta={{
              model: meeting.offer?.model,
            }}
            rerunAction={rerunGenerate}
          />
        </Card>
      </section>

      {/* Cleanup diff */}
      {cleanupCorrections && cleanupCorrections.length > 0 && (
        <section className="mb-12">
          <CleanupCorrectionsDiff corrections={cleanupCorrections} />
        </section>
      )}

      {/* Outputs */}
      <div className="flex flex-col gap-8">
        {meeting.transcript && (
          <TranscriptViewer
            text={meeting.transcript.text ?? ''}
            cleanedText={meeting.transcript.cleaned_text ?? null}
            language={meeting.transcript.language}
          />
        )}

        {meeting.extraction && (
          <ExtractionEditor data={meeting.extraction.structured_data} />
        )}

        {meeting.offer?.pdf_url && (
          <OfferPreview pdfUrl={meeting.offer.pdf_url} customerName={customerName} />
        )}

        {!meeting.transcript && !meeting.extraction && !meeting.offer && status !== 'failed' && (
          <div className="flex flex-col items-start py-16">
            <Microphone size={32} weight="regular" className="mb-6 text-tertiary" />
            <h3 className="text-h2 text-primary">Anna se k téhle schůzce ještě nedostala.</h3>
            <p className="mt-2 max-w-[44ch] text-body text-secondary">
              Pipeline ještě nezačal — spusť ho tlačítkem nahoře.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
