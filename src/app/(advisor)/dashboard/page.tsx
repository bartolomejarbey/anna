import Link from 'next/link';
import { currentAdvisor, currentAdvisorId } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { MeetingStatusPill } from '@/components/meeting-status-pill';
import type { MeetingStatus } from '@/components/meeting-status-pill';

export const metadata = { title: 'Dnes — Anna' };

const VOCATIVE: Record<string, string> = {
  Karel: 'Karle',
  Petra: 'Petro',
  Tomáš: 'Tomáši',
  Eva: 'Evo',
  Martin: 'Martine',
  Bartoloměj: 'Bartoloměji',
};

function vocative(firstName: string): string {
  return VOCATIVE[firstName] ?? firstName;
}

export default async function DashboardPage() {
  const advisor = await currentAdvisor();
  const advisorId = await currentAdvisorId();

  const firstName = advisor?.full_name?.split(' ')[0] ?? 'poradce';
  const greetingName = vocative(firstName);

  const sb = supabaseAdmin();
  // eslint-disable-next-line react-hooks/purity -- server component, runs once per request
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [latestMeetingRes, recentOffersRes, weekActivityRes] = await Promise.all([
    sb
      .from('meetings')
      .select('id, status, recorded_at, created_at, customer:customers(full_name)')
      .eq('advisor_id', advisorId)
      .order('recorded_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    sb
      .from('offers')
      .select('id, generated_text, customer:customers(full_name), created_at')
      .eq('advisor_id', advisorId)
      .order('created_at', { ascending: false })
      .limit(3),
    sb
      .from('meetings')
      .select('id, status', { count: 'exact', head: false })
      .eq('advisor_id', advisorId)
      .gte('created_at', sevenDaysAgo),
  ]);

  type CustomerJoin = { full_name: string } | { full_name: string }[] | null;
  function joinName(c: CustomerJoin): string | null {
    if (!c) return null;
    if (Array.isArray(c)) return c[0]?.full_name ?? null;
    return c.full_name ?? null;
  }
  const latestMeetingRaw = latestMeetingRes.data as
    | { id: string; status: string; recorded_at: string | null; created_at: string; customer: CustomerJoin }
    | null;
  const latestMeeting = latestMeetingRaw
    ? {
        id: latestMeetingRaw.id,
        status: latestMeetingRaw.status,
        recorded_at: latestMeetingRaw.recorded_at,
        created_at: latestMeetingRaw.created_at,
        customerName: joinName(latestMeetingRaw.customer),
      }
    : null;
  const recentOffers = ((recentOffersRes.data ?? []) as {
    id: string;
    generated_text: string | null;
    customer: CustomerJoin;
    created_at: string;
  }[]).map((o) => ({ id: o.id, customerName: joinName(o.customer) }));
  const weekMeetings = weekActivityRes.data ?? [];
  const weekTotal = weekMeetings.length;
  const weekReady = weekMeetings.filter((m) => m.status === 'ready').length;

  return (
    <div className="mx-auto w-full max-w-[960px] px-8 py-16">
      <h1 className="text-display text-primary mb-12">Dobrý den, {greetingName}</h1>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Poslední schůzka</CardTitle>
          </CardHeader>
          <CardContent>
            {latestMeeting ? (
              <Link
                href={`/schuzky/${latestMeeting.id}`}
                className="flex flex-col gap-3"
              >
                <span className="text-body font-medium text-primary">
                  {latestMeeting.customerName ?? 'Zákazník'}
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-body-sm text-tertiary">
                    {new Date(latestMeeting.recorded_at ?? latestMeeting.created_at).toLocaleDateString(
                      'cs-CZ',
                      { day: 'numeric', month: 'long' },
                    )}
                  </span>
                  <MeetingStatusPill status={latestMeeting.status as MeetingStatus} />
                </div>
              </Link>
            ) : (
              <p className="text-body-sm text-tertiary">Zatím žádná.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Poslední nabídky</CardTitle>
          </CardHeader>
          <CardContent>
            {recentOffers.length === 0 ? (
              <p className="text-body-sm text-tertiary">Zatím žádná.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {recentOffers.map((o) => (
                  <li key={o.id} className="text-body-sm text-secondary">
                    {o.customerName ?? 'Zákazník'}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Týden</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="flex flex-col gap-2 text-body-sm">
              <div className="flex items-center justify-between">
                <dt className="text-tertiary">Schůzek</dt>
                <dd className="font-medium text-primary">{weekTotal}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-tertiary">Hotových</dt>
                <dd className="font-medium text-primary">{weekReady}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
