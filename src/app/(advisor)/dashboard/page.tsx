import Link from 'next/link';
import { currentAdvisor, currentAdvisorId } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { ToolCard } from '@/components/launchpad/tool-card';
import { AsistentToolCard } from '@/components/launchpad/asistent-tool-card';
import { NaslouchacIcon } from '@/components/icons/tools/naslouchac-icon';
import { ZakazniciIcon } from '@/components/icons/tools/zakaznici-icon';
import { NabidkyIcon } from '@/components/icons/tools/nabidky-icon';
import { ProfilIcon } from '@/components/icons/tools/profil-icon';
import { AdminIcon } from '@/components/icons/tools/admin-icon';
import { NewsletterIcon } from '@/components/icons/tools/newsletter-icon';
import { PojisteniIcon } from '@/components/icons/tools/pojisteni-icon';
import { KalendarIcon } from '@/components/icons/tools/kalendar-icon';
import { InboxIcon } from '@/components/icons/tools/inbox-icon';
import { CrmIcon } from '@/components/icons/tools/crm-icon';
import { KnowledgeIcon } from '@/components/icons/tools/knowledge-icon';
import { MeetingStatusPill } from '@/components/meeting-status-pill';
import type { MeetingStatus } from '@/components/meeting-status-pill';

export const metadata = { title: 'Anna' };

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

function timeBasedGreeting(): string {
  const fmt = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    hourCycle: 'h23',
    timeZone: 'Europe/Prague',
  });
  const hour = parseInt(fmt.format(new Date()), 10);
  if (hour >= 5 && hour < 12) return 'Dobré ráno';
  if (hour >= 12 && hour < 18) return 'Dobré odpoledne';
  if (hour >= 18 && hour < 22) return 'Dobrý večer';
  return 'Pozdě večer';
}

type CustomerJoin = { full_name: string } | { full_name: string }[] | null;

function joinName(c: CustomerJoin): string | null {
  if (!c) return null;
  if (Array.isArray(c)) return c[0]?.full_name ?? null;
  return c.full_name ?? null;
}

export default async function DashboardPage() {
  const advisor = await currentAdvisor();
  const advisorId = await currentAdvisorId();

  const firstName = advisor?.full_name?.split(' ')[0] ?? 'poradce';
  const greetingName = vocative(firstName);
  const greeting = timeBasedGreeting();
  const showAdminTile = advisor?.role === 'super_admin' || advisor?.role === 'tenant_admin';

  const sb = supabaseAdmin();
  // eslint-disable-next-line react-hooks/purity -- server component, runs once per request
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [latestMeetingRes, latestOfferRes, weekActivityRes] = await Promise.all([
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
      .select('id, customer:customers(full_name), created_at')
      .eq('advisor_id', advisorId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    sb
      .from('meetings')
      .select('id, status', { count: 'exact', head: false })
      .eq('advisor_id', advisorId)
      .gte('created_at', sevenDaysAgo),
  ]);

  const latestMeetingRaw = latestMeetingRes.data as
    | { id: string; status: string; recorded_at: string | null; created_at: string; customer: CustomerJoin }
    | null;
  const latestMeeting = latestMeetingRaw
    ? {
        id: latestMeetingRaw.id,
        status: latestMeetingRaw.status,
        date: latestMeetingRaw.recorded_at ?? latestMeetingRaw.created_at,
        customerName: joinName(latestMeetingRaw.customer),
      }
    : null;

  const latestOfferRaw = latestOfferRes.data as
    | { id: string; created_at: string; customer: CustomerJoin }
    | null;
  const latestOffer = latestOfferRaw
    ? {
        id: latestOfferRaw.id,
        date: latestOfferRaw.created_at,
        customerName: joinName(latestOfferRaw.customer),
      }
    : null;

  const weekMeetings = weekActivityRes.data ?? [];
  const weekTotal = weekMeetings.length;
  const weekReady = weekMeetings.filter((m) => m.status === 'ready').length;

  return (
    <div className="mx-auto w-full max-w-[1280px] px-8 pt-24 pb-32">
      {/* Section 1 — Hero greeting */}
      <header className="mb-24">
        <h1 className="text-display text-primary">
          {greeting}, {greetingName}
        </h1>
      </header>

      {/* Section 2 — Tvoje aktivita */}
      <section className="mb-24">
        <h2 className="mb-6 text-caption text-tertiary">Tvoje aktivita</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <ActivityWeekCard total={weekTotal} ready={weekReady} />
          <ActivityLatestMeetingCard meeting={latestMeeting} />
          <ActivityLatestOfferCard offer={latestOffer} />
        </div>
      </section>

      {/* Section 3 — Tvoje nástroje */}
      <section className="mb-24">
        <h2 className="mb-6 text-caption text-tertiary">Tvoje nástroje</h2>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          <ToolCard
            title="Naslouchač"
            description="Nahrát schůzku, dostat přepis a strukturovanou nabídku."
            icon={<NaslouchacIcon />}
            href="/schuzky/nova"
            featured
          />
          <ToolCard
            title="Zákazníci"
            description="Tvoje zákaznická síť — kontakty, schůzky, nabídky."
            icon={<ZakazniciIcon />}
            href="/zakaznici"
          />
          <ToolCard
            title="Nabídky"
            description="PDF nabídky vytvořené z nahraných schůzek."
            icon={<NabidkyIcon />}
            href="/nabidky"
          />
          <ToolCard
            title="Profil"
            description="Tvoje branding — barva, logo, kontaktní údaje."
            icon={<ProfilIcon />}
            href="/profil"
          />
          <AsistentToolCard />
          {showAdminTile && (
            <ToolCard
              title="Admin"
              description="Statistiky používání, audit, fine-tune data."
              icon={<AdminIcon />}
              href="/admin"
            />
          )}
        </div>
      </section>

      {/* Section 4 — Brzy dostupné */}
      <section>
        <h2 className="mb-6 text-caption text-tertiary">Brzy dostupné</h2>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          <ToolCard
            title="Newsletter"
            description="Posílej zákazníkům personalizované zprávy."
            icon={<NewsletterIcon />}
            disabled
            badge="Q3 2026"
          />
          <ToolCard
            title="Pojištění"
            description="Direct API integrace s pojišťovnami."
            icon={<PojisteniIcon />}
            disabled
            badge="Q2 2026"
          />
          <ToolCard
            title="Kalendář"
            description="Plánování schůzek napříč zákazníky."
            icon={<KalendarIcon />}
            disabled
            badge="Q3 2026"
          />
          <ToolCard
            title="Inbox"
            description="Sjednocený inbox pro všechny komunikační kanály."
            icon={<InboxIcon />}
            disabled
            badge="Q3 2026"
          />
          <ToolCard
            title="CRM"
            description="Pipeline a deal management pro tvoji síť."
            icon={<CrmIcon />}
            disabled
            badge="Q4 2026"
          />
          <ToolCard
            title="Knowledge base"
            description="Tvoje znalostní databáze — produkty, pravidla, scripty."
            icon={<KnowledgeIcon />}
            disabled
            badge="Q4 2026"
          />
        </div>
      </section>
    </div>
  );
}

function ActivityShell({ caption, children }: { caption: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-[12px] border border-border-subtle bg-surface p-6">
      <span className="text-caption text-tertiary">{caption}</span>
      {children}
    </div>
  );
}

function ActivityShellLink({
  caption,
  href,
  children,
}: {
  caption: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-3 rounded-[12px] border border-border-subtle bg-surface p-6 transition-colors hover:border-border-default"
    >
      <span className="text-caption text-tertiary">{caption}</span>
      {children}
    </Link>
  );
}

function ActivityWeekCard({ total, ready }: { total: number; ready: number }) {
  return (
    <ActivityShell caption="Tento týden">
      <span className="text-stat text-primary">{total}</span>
      <span className="text-body-sm text-secondary">
        {total === 0 ? 'žádná schůzka' : `${ready} ze ${total} hotových`}
      </span>
    </ActivityShell>
  );
}

function ActivityLatestMeetingCard({
  meeting,
}: {
  meeting: { id: string; status: string; date: string; customerName: string | null } | null;
}) {
  if (!meeting) {
    return (
      <ActivityShell caption="Posl. schůzka">
        <span className="text-h3 text-tertiary">Zatím žádná</span>
        <span className="text-body-sm text-tertiary">Začni nahráváním v Naslouchači.</span>
      </ActivityShell>
    );
  }
  return (
    <ActivityShellLink caption="Posl. schůzka" href={`/schuzky/${meeting.id}`}>
      <span className="text-h3 text-primary">{meeting.customerName ?? 'Zákazník'}</span>
      <div className="flex items-center justify-between">
        <span className="text-body-sm text-tertiary">
          {new Date(meeting.date).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long' })}
        </span>
        <MeetingStatusPill status={meeting.status as MeetingStatus} />
      </div>
    </ActivityShellLink>
  );
}

function ActivityLatestOfferCard({
  offer,
}: {
  offer: { id: string; date: string; customerName: string | null } | null;
}) {
  if (!offer) {
    return (
      <ActivityShell caption="Posl. nabídka">
        <span className="text-h3 text-tertiary">Zatím žádná</span>
        <span className="text-body-sm text-tertiary">Vygeneruje se po dokončení schůzky.</span>
      </ActivityShell>
    );
  }
  return (
    <ActivityShellLink caption="Posl. nabídka" href="/nabidky">
      <span className="text-h3 text-primary">{offer.customerName ?? 'Zákazník'}</span>
      <span className="text-body-sm text-tertiary">
        {new Date(offer.date).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long' })}
      </span>
    </ActivityShellLink>
  );
}
