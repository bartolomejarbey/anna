import { Pulse } from '@phosphor-icons/react/dist/ssr';
import { createAdminClient } from '@/lib/supabase/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';

interface QueryBuilder {
  select(columns: string, opts?: { count?: 'exact'; head?: boolean }): QueryBuilder;
  order(column: string, opts?: { ascending?: boolean }): QueryBuilder;
  limit(n: number): QueryBuilder;
  gte(col: string, val: string): QueryBuilder;
  lt(col: string, val: string): QueryBuilder;
  then: Promise<{ data: unknown; error: { message: string } | null; count: number | null }>['then'];
}

interface AdminDb {
  from(table: string): QueryBuilder;
}

function getDb(): AdminDb {
  return createAdminClient() as unknown as AdminDb;
}

function formatRelative(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMin < 1) return 'právě teď';
  if (diffMin < 60) return `před ${diffMin} min`;
  if (diffHours < 24) return `před ${diffHours} hod`;
  return `před ${diffDays} dny`;
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  'meeting.created': 'Vytvořena schůzka',
  'audio.uploaded': 'Nahráno audio',
  'transcription.started': 'Spuštěna transkripce',
  'transcription.completed': 'Dokončena transkripce',
  'reconciliation.completed': 'Sjednoceny přepisy',
  'extraction.completed': 'Vytažena data',
  'calculation.completed': 'Spočítán plán',
  'pdf.generated': 'Vytvořeno PDF',
  'pipeline.failed': 'Pipeline selhal',
  meeting_started: 'Zahájena schůzka',
  extraction_completed: 'Vytažena data',
  offer_signed: 'Podepsána nabídka',
  pdf_generated: 'Vytvořeno PDF',
};

function labelForEventType(eventType: string): string {
  return EVENT_TYPE_LABELS[eventType] ?? eventType;
}

interface MeetingCountResult {
  count: number | null;
  todayIso: string;
  error?: string;
}

async function fetchMeetingsToday(): Promise<MeetingCountResult> {
  const todayIso = new Date().toISOString().slice(0, 10);
  try {
    const db = getDb();
    const result = await db
      .from('meetings')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', `${todayIso}T00:00:00.000Z`)
      .lt('created_at', `${todayIso}T23:59:59.999Z`);

    const { count, error } = result as { count: number | null; error: { message: string } | null };
    if (error) throw new Error(error.message);
    return { count, todayIso };
  } catch (e) {
    return {
      count: null,
      todayIso,
      error: e instanceof Error ? e.message : 'Neznámá chyba',
    };
  }
}

interface ActivityEvent {
  id: string;
  event_type: string;
  created_at: string;
  advisor_name: string | null;
}

interface ActivityResult {
  events: ActivityEvent[];
  error?: string;
}

type RawEventRow = {
  id: string;
  event_type: string;
  created_at: string;
  advisors: { full_name: string } | Array<{ full_name: string }> | null;
};

async function fetchRecentActivity(): Promise<ActivityResult> {
  try {
    const db = getDb();
    const result = await db
      .from('analytics_events')
      .select('id, event_type, created_at, advisors(full_name)')
      .order('created_at', { ascending: false })
      .limit(10);

    const { data, error } = result as { data: RawEventRow[] | null; error: { message: string } | null };
    if (error) throw new Error(error.message);

    const events: ActivityEvent[] = (data ?? []).map((row) => {
      const advisorRaw = row.advisors;
      let advisorName: string | null = null;
      if (Array.isArray(advisorRaw) && advisorRaw.length > 0) {
        advisorName = advisorRaw[0].full_name ?? null;
      } else if (advisorRaw && !Array.isArray(advisorRaw)) {
        advisorName = advisorRaw.full_name ?? null;
      }
      return {
        id: row.id,
        event_type: row.event_type,
        created_at: row.created_at,
        advisor_name: advisorName,
      };
    });

    return { events };
  } catch (e) {
    return {
      events: [],
      error: e instanceof Error ? e.message : 'Neznámá chyba',
    };
  }
}

export default async function AdminPage() {
  const [meetingResult, activityResult] = await Promise.all([
    fetchMeetingsToday(),
    fetchRecentActivity(),
  ]);

  return (
    <div>
      <h1 className="text-h1 text-primary mb-12">Admin</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <p className="text-caption text-tertiary">Schůzek dnes</p>
          </CardHeader>
          <CardContent>
            {meetingResult.error ? (
              <p className="text-body-sm text-secondary">
                Data se zobrazí po napojení na databázi.
              </p>
            ) : (
              <>
                <p className="text-display text-primary">{meetingResult.count ?? 0}</p>
                <p className="mt-2 text-body-sm text-tertiary">od {meetingResult.todayIso}</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Poslední aktivita</CardTitle>
          </CardHeader>
          <CardContent>
            {activityResult.error ? (
              <p className="text-body-sm text-secondary">
                Data se zobrazí po napojení na databázi.
              </p>
            ) : activityResult.events.length === 0 ? (
              <EmptyState
                icon={Pulse}
                heading="Žádná aktivita."
                className="py-4"
              />
            ) : (
              <ul className="divide-y divide-border-subtle">
                {activityResult.events.map((event) => (
                  <li key={event.id} className="flex items-center justify-between py-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-body-sm font-medium text-primary">
                        {labelForEventType(event.event_type)}
                      </span>
                      {event.advisor_name && (
                        <span className="text-body-sm text-tertiary">{event.advisor_name}</span>
                      )}
                    </div>
                    <span className="ml-4 shrink-0 text-body-sm text-tertiary">
                      {formatRelative(new Date(event.created_at))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
