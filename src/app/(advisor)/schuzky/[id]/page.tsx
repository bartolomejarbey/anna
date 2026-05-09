import { supabaseAdmin } from '@/lib/supabase/admin';
import { getMeetingFull } from '@/lib/actions/meetings';
import { MeetingStatusPill } from '@/components/meeting-status-pill';
import type { MeetingStatus } from '@/components/meeting-status-pill';
import { TranscriptViewer } from '@/components/transcript-viewer';
import { ExtractionEditor } from '@/components/extraction-editor';
import { OfferPreview } from '@/components/offer-preview';
import { EmptyState } from '@/components/ui/empty-state';
import { Card } from '@/components/ui/card';
import { Mic } from 'lucide-react';

// Pipeline statuses that are actively mid-run
const IN_PROGRESS_STATUSES = new Set([
  'transcribing',
  'reconciling',
  'extracting',
  'generating',
]);

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let meeting = null;
  let dbUnavailable = false;

  try {
    meeting = await getMeetingFull(id);
  } catch {
    dbUnavailable = true;
  }

  // DB not available yet
  if (dbUnavailable) {
    return (
      <div className="mx-auto w-full max-w-[1280px] px-8 py-12">
        <EmptyState
          icon={Mic}
          heading="Data se zobrazí po napojení na databázi"
          description="Připojení k databázi ještě nebylo nakonfigurováno. Zkuste to znovu po nastavení prostředí."
        />
      </div>
    );
  }

  // Meeting not found
  if (!meeting) {
    return (
      <div className="mx-auto w-full max-w-[1280px] px-8 py-12">
        <EmptyState
          icon={Mic}
          heading="Schůzka nenalezena"
          description="Tato schůzka neexistuje nebo nemáte přístup k jejím datům."
          action={{ label: 'Zpět na schůzky', href: '/schuzky' }}
        />
      </div>
    );
  }

  const status = meeting.status as MeetingStatus;
  const isPipeline = IN_PROGRESS_STATUSES.has(status);
  const customerName = meeting.customer?.full_name ?? 'Zákazník';

  // Signed URL for audio playback (server-rendered)
  let audioSignedUrl: string | null = null;
  if (meeting.audio_url) {
    try {
      const { data } = await supabaseAdmin()
        .storage.from('audio')
        .createSignedUrl(meeting.audio_url, 3600);
      audioSignedUrl = data?.signedUrl ?? null;
    } catch {
      // Non-fatal — audio player just won't show
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

  return (
    <div className="mx-auto w-full max-w-[1280px] px-8 py-12">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="mb-10 flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-semibold text-text-primary">{customerName}</h1>
          <p className="text-[15px] text-text-secondary">{formattedDate}</p>
        </div>
        <div className="mt-1">
          <MeetingStatusPill status={status} />
        </div>
      </div>

      {/* ── Failed state ─────────────────────────────────────────────────────── */}
      {status === 'failed' && (
        <Card variant="compact" className="mb-8 border-[color-mix(in_oklab,_var(--color-error)_30%,_transparent)]">
          <p className="text-[15px] font-medium text-error mb-2">Zpracování selhalo</p>
          <p className="text-[13px] text-text-secondary mb-4">
            Pipeline pro tuto schůzku skončil chybou. Zkuste ji spustit znovu.
          </p>
          {/* Retry button handled client-side — inline form action */}
          <form
            action={async () => {
              'use server';
              const { runFullPipeline } = await import('@/lib/actions/meetings');
              await runFullPipeline({ meetingId: id });
            }}
          >
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-border-subtle bg-bg-primary px-6 text-[15px] font-medium text-text-primary transition-colors hover:bg-bg-tertiary"
            >
              Spustit znovu
            </button>
          </form>
        </Card>
      )}

      {/* ── Pipeline progress notice ──────────────────────────────────────────── */}
      {isPipeline && (
        <Card variant="compact" className="mb-8">
          <p className="text-[15px] text-text-secondary">
            Schůzka se právě zpracovává — výsledky se zobrazí automaticky po dokončení.
          </p>
        </Card>
      )}

      {/* ── Audio player ─────────────────────────────────────────────────────── */}
      {audioSignedUrl && (
        <Card variant="compact" className="mb-8">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-text-tertiary">
            Nahrávka
          </p>
          <audio controls src={audioSignedUrl} className="w-full" />
        </Card>
      )}

      {/* ── Content sections ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-8">
        {/* Transcript */}
        {(meeting.transcript || isPipeline) && (
          <TranscriptViewer
            text={meeting.transcript?.text ?? ''}
            loadingPartial={isPipeline ? (meeting.transcript?.live_text ?? undefined) : undefined}
          />
        )}

        {/* Extraction */}
        {meeting.extraction && (
          <ExtractionEditor data={meeting.extraction.structured_data} />
        )}

        {/* Offer PDF preview */}
        {meeting.offer?.pdf_url && (
          <OfferPreview
            pdfUrl={meeting.offer.pdf_url}
            customerName={customerName}
          />
        )}

        {/* Empty state when nothing to show yet */}
        {!meeting.transcript && !meeting.extraction && !meeting.offer && !isPipeline && status !== 'failed' && (
          <EmptyState
            icon={Mic}
            heading="Schůzka ještě nebyla zpracována"
            description="Po nahrání audia spusťte pipeline pro přepis a vytvoření nabídky."
          />
        )}
      </div>
    </div>
  );
}
