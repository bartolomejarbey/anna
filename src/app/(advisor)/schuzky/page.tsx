import Link from 'next/link';
import { Microphone } from '@phosphor-icons/react/dist/ssr';
import { getMeetingsList } from '@/lib/actions/meetings';
import { MeetingStatusPill } from '@/components/meeting-status-pill';
import type { MeetingStatus } from '@/components/meeting-status-pill';
import { EmptyState } from '@/components/ui/empty-state';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Schůzky — Anna',
};

export default async function SchuzkyPage() {
  let meetings: { id: string; status: string; created_at: string; customer_name: string | null }[] = [];
  let dbError = false;

  try {
    meetings = await getMeetingsList();
  } catch {
    dbError = true;
  }

  return (
    <div className="mx-auto w-full max-w-[960px] px-8 py-16">
      <div className="mb-12 flex items-center justify-between">
        <h1 className="text-h1 text-primary">Schůzky</h1>
        <Link href="/schuzky/nova">
          <Button>Nová schůzka</Button>
        </Link>
      </div>

      {dbError && (
        <p className="mb-8 text-body text-secondary">
          Data se zobrazí po napojení na databázi.
        </p>
      )}

      {!dbError && meetings.length === 0 && (
        <EmptyState
          icon={Microphone}
          heading="Žádná schůzka."
          action={{ label: 'Začít schůzku', href: '/schuzky/nova' }}
        />
      )}

      {meetings.length > 0 && (
        <div className="flex flex-col gap-3">
          {meetings.map((m) => {
            const date = new Date(m.created_at).toLocaleDateString('cs-CZ', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            });

            return (
              <Link key={m.id} href={`/schuzky/${m.id}`}>
                <Card
                  variant="compact"
                  className="flex items-center justify-between transition-colors hover:border-border-default cursor-pointer"
                >
                  <div className="flex flex-col gap-1">
                    <p className="text-body font-medium text-primary">
                      {m.customer_name ?? 'Neznámý zákazník'}
                    </p>
                    <p className="text-body-sm text-tertiary">{date}</p>
                  </div>
                  <MeetingStatusPill status={m.status as MeetingStatus} />
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
