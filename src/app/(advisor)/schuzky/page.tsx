import Link from 'next/link';
import { Mic } from 'lucide-react';
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
    <div className="mx-auto w-full max-w-[1280px] px-8 py-12">
      {/* Header */}
      <div className="mb-10 flex items-center justify-between">
        <h1 className="text-4xl font-semibold text-text-primary">Schůzky</h1>
        <Link href="/schuzky/nova">
          <Button>Nová schůzka</Button>
        </Link>
      </div>

      {/* DB not available */}
      {dbError && (
        <div className="mb-8 rounded-xl border border-border-subtle bg-bg-tertiary px-6 py-4">
          <p className="text-[15px] text-text-secondary">
            Data se zobrazí po napojení na databázi.
          </p>
        </div>
      )}

      {/* Empty state */}
      {!dbError && meetings.length === 0 && (
        <EmptyState
          icon={Mic}
          heading="Zatím tu nemáte žádnou schůzku."
          description="Zahajte svoji první schůzku s naslouchačem kliknutím níže."
          action={{
            label: 'Nová schůzka',
            href: '/schuzky/nova',
          }}
        />
      )}

      {/* Meeting list */}
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
                  className="flex items-center justify-between transition-colors hover:bg-bg-secondary cursor-pointer"
                >
                  <div className="flex flex-col gap-1">
                    <p className="text-[15px] font-medium text-text-primary">
                      {m.customer_name ?? 'Neznámý zákazník'}
                    </p>
                    <p className="text-[13px] text-text-tertiary">{date}</p>
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
