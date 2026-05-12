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
import { Button } from '@/components/ui/button';
import { PageShell } from '@/components/ui/page-shell';

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
      <PageShell>
        <EmptyState
          icon={Microphone}
          heading="Data se zobrazí po napojení na databázi."
        />
      </PageShell>
    );
  }

  if (!meeting) {
    return (
      <PageShell>
        <EmptyState
          icon={Microphone}
          heading="Schůzka nenalezena."
          action={{ label: 'Zpět na schůzky', href: '/schuzky' }}
        />
      </PageShell>
    );
  }

  const meetingId = meeting.id;
  const customerName = meeting.customer?.full_name ?? 'Zákazník';
  const status = meeting.status as MeetingStatus;

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
    <PageShell>
      <header className="flex items-start justify-between gap-4 pb-10 pt-12">
        <div className="flex flex-col gap-2">
          <span className="text-caption text-tertiary">Schůzka</span>
          <h1 className="text-h1 text-primary">{customerName}</h1>
          <p className="text-body-sm text-tertiary">{formattedDate}</p>
        </div>
        <div className="mt-1">
          <MeetingStatusPill status={status} />
        </div>
      </header>

      {audioSignedUrl && (
        <Card variant="compact" className="mb-12">
          <p className="mb-3 text-caption text-tertiary">Nahrávka</p>
          <audio controls src={audioSignedUrl} className="w-full" />
        </Card>
      )}

      <section className="mb-12">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-caption text-tertiary">Pipeline</h2>
          {status !== 'ready' && (
            <form action={rerunFullPipeline}>
              <Button size="sm" type="submit">
                {status === 'failed' ? 'Spustit znovu' : 'Spustit zpracování'}
              </Button>
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

      {cleanupCorrections && cleanupCorrections.length > 0 && (
        <section className="mb-12">
          <CleanupCorrectionsDiff corrections={cleanupCorrections} />
        </section>
      )}

      <div className="flex flex-col gap-8 pb-20">
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
          <EmptyState
            icon={Microphone}
            heading="Anna se k téhle schůzce ještě nedostala."
            description="Pipeline ještě nezačal — spusť ho tlačítkem nahoře."
          />
        )}
      </div>
    </PageShell>
  );
}
