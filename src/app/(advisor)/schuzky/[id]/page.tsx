import { Microphone } from '@phosphor-icons/react/dist/ssr';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getMeetingFull, retryPipeline } from '@/lib/actions/meetings';
import { MeetingStatusPill } from '@/components/meeting-status-pill';
import type { MeetingStatus } from '@/components/meeting-status-pill';
import { TranscriptViewer } from '@/components/transcript-viewer';
import { ExtractionEditor } from '@/components/extraction-editor';
import { OfferPreview } from '@/components/offer-preview';
import { EmptyState } from '@/components/ui/empty-state';
import { Card } from '@/components/ui/card';

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

  const status = meeting.status as MeetingStatus;
  const isPipeline = IN_PROGRESS_STATUSES.has(status);
  const customerName = meeting.customer?.full_name ?? 'Zákazník';

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

  return (
    <div className="mx-auto w-full max-w-[960px] px-8 py-16">
      <div className="mb-12 flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-h1 text-primary">{customerName}</h1>
          <p className="text-body-sm text-tertiary">{formattedDate}</p>
        </div>
        <div className="mt-1">
          <MeetingStatusPill status={status} />
        </div>
      </div>

      {status === 'failed' && (
        <Card variant="compact" className="mb-8 border-[color-mix(in_oklab,_var(--color-error)_30%,_transparent)]">
          <p className="text-body font-medium text-error mb-2">Zpracování selhalo</p>
          <p className="text-body-sm text-secondary mb-4">
            Pipeline pro tuto schůzku skončil chybou.
          </p>
          <form action={retryPipeline.bind(null, id)}>
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-[8px] border border-border-default bg-transparent px-4 text-body font-medium text-primary transition-colors hover:bg-subtle active:scale-[0.98]"
            >
              Spustit znovu
            </button>
          </form>
        </Card>
      )}

      {isPipeline && (
        <div className="mb-8">
          <p className="text-body text-secondary mb-3">Zpracovává se</p>
          <div className="flex flex-col gap-2">
            <div className="skeleton h-3 w-full" />
            <div className="skeleton h-3 w-4/5" />
            <div className="skeleton h-3 w-3/5" />
          </div>
        </div>
      )}

      {audioSignedUrl && (
        <Card variant="compact" className="mb-8">
          <p className="mb-3 text-caption text-tertiary">Nahrávka</p>
          <audio controls src={audioSignedUrl} className="w-full" />
        </Card>
      )}

      <div className="flex flex-col gap-8">
        {(meeting.transcript || isPipeline) && (
          <TranscriptViewer
            text={meeting.transcript?.text ?? ''}
            loadingPartial={isPipeline ? (meeting.transcript?.live_text ?? undefined) : undefined}
          />
        )}

        {meeting.extraction && (
          <ExtractionEditor data={meeting.extraction.structured_data} />
        )}

        {meeting.offer?.pdf_url && (
          <OfferPreview pdfUrl={meeting.offer.pdf_url} customerName={customerName} />
        )}

        {!meeting.transcript && !meeting.extraction && !meeting.offer && !isPipeline && status !== 'failed' && (
          <div className="flex flex-col items-start py-16">
            <Microphone size={32} weight="regular" className="mb-6 text-tertiary" />
            <h3 className="text-h2 text-primary">Anna se k téhle schůzce ještě nedostala.</h3>
            <p className="mt-2 max-w-[44ch] text-body text-secondary">Pipeline ještě nezačal.</p>
            <form action={retryPipeline.bind(null, id)} className="mt-8">
              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center rounded-[8px] bg-accent px-4 text-body font-medium text-accent-text transition-opacity hover:opacity-90 active:scale-[0.98]"
              >
                Spustit zpracování
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
