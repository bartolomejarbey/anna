import Link from 'next/link';
import { Microphone } from '@phosphor-icons/react/dist/ssr';
import { getMeetingsList } from '@/lib/actions/meetings';
import { MeetingStatusPill } from '@/components/meeting-status-pill';
import type { MeetingStatus } from '@/components/meeting-status-pill';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { PageShell } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/ui/page-header';
import { ListRow } from '@/components/ui/list-row';

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
    <PageShell>
      <PageHeader
        title="Schůzky"
        description="Nahrané akviziční schůzky se zákazníky."
        actions={
          <Link href="/schuzky/nova">
            <Button>Nová schůzka</Button>
          </Link>
        }
      />

      {dbError && (
        <p className="mb-8 text-body text-secondary">
          Data se zobrazí po napojení na databázi.
        </p>
      )}

      {!dbError && meetings.length === 0 && (
        <EmptyState
          icon={Microphone}
          heading="Žádná schůzka."
          description="Začni novou nahrávkou — Anna ji přepíše a vytáhne data."
          action={{ label: 'Začít schůzku', href: '/schuzky/nova' }}
        />
      )}

      {meetings.length > 0 && (
        <ul className="divide-y divide-border-subtle">
          {meetings.map((m) => {
            const date = new Date(m.created_at).toLocaleDateString('cs-CZ', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            });

            return (
              <li key={m.id}>
                <ListRow
                  href={`/schuzky/${m.id}`}
                  primary={m.customer_name ?? 'Neznámý zákazník'}
                  secondary={date}
                  trailing={<MeetingStatusPill status={m.status as MeetingStatus} />}
                />
              </li>
            );
          })}
        </ul>
      )}
    </PageShell>
  );
}
