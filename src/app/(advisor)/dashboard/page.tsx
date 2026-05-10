import { currentAdvisor, currentAdvisorId } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { ToolCard } from '@/components/launchpad/tool-card';
import { AsistentToolCard } from '@/components/launchpad/asistent-tool-card';
import {
  MotionSection,
  MotionSectionGroup,
} from '@/components/launchpad/dashboard-motion';
import { PlatformBackdrop } from '@/components/launchpad/platform-backdrop';
import { CornerAccent } from '@/components/launchpad/corner-accent';
import { HeroBlock } from '@/components/launchpad/hero-block';
import { EditorialActivity } from '@/components/launchpad/editorial-activity';
import { PageWave } from '@/components/launchpad/page-wave';
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
    <div className="relative mx-auto w-full max-w-[1280px] px-8 pt-24 pb-32">
      <PlatformBackdrop />
      <CornerAccent position="tr" />
      <CornerAccent position="bl" />

      {/* Section 1 — Hero scenic moment */}
      <HeroBlock greeting={greeting} name={greetingName} />

      <MotionSectionGroup className="relative z-10">
        {/* Section 2 — Editorial activity sentences */}
        <MotionSection className="mb-24">
          <span className="anna-section-rule mb-5 block" aria-hidden />
          <h2 className="mb-6 text-h2 text-primary">Dnes na Anně</h2>
          <EditorialActivity
            weekTotal={weekTotal}
            weekReady={weekReady}
            latestMeeting={latestMeeting}
            latestOffer={latestOffer}
          />
        </MotionSection>

        {/* Section 3 — Nástroje */}
        <MotionSection className="mb-24">
          <span className="anna-section-rule mb-5 block" aria-hidden />
          <h2 className="mb-6 text-h2 text-primary">Nástroje na Anně</h2>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            <ToolCard
              title="Naslouchač"
              description="Nahrávka schůzky, přepis a strukturovaná nabídka."
              icon={<NaslouchacIcon />}
              href="/schuzky/nova"
              variant="featured"
            />
            <ToolCard
              title="Zákazníci"
              description="Kontakty, schůzky a nabídky na jednom místě."
              icon={<ZakazniciIcon />}
              href="/zakaznici"
              variant="growth"
            />
            <ToolCard
              title="Nabídky"
              description="PDF nabídky vytvořené z nahraných schůzek."
              icon={<NabidkyIcon />}
              href="/nabidky"
              variant="value"
            />
            <ToolCard
              title="Profil"
              description="Barva, logo, kontaktní údaje."
              icon={<ProfilIcon />}
              href="/profil"
              variant="value"
            />
            <AsistentToolCard />
            {showAdminTile && (
              <ToolCard
                title="Admin"
                description="Statistiky, audit, data pro fine-tuning."
                icon={<AdminIcon />}
                href="/admin"
                variant="growth"
              />
            )}
          </div>
        </MotionSection>

        {/* Section 4 — Anna roste */}
        <MotionSection>
          <span className="anna-section-rule mb-5 block" aria-hidden />
          <h2 className="mb-6 text-h2 text-primary">Anna roste</h2>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            <ToolCard
              title="Newsletter"
              description="Posílej zákazníkům personalizované zprávy."
              icon={<NewsletterIcon />}
              variant="disabled"
              badge="Q3 2026"
            />
            <ToolCard
              title="Pojištění"
              description="Přímé napojení na pojišťovny."
              icon={<PojisteniIcon />}
              variant="disabled"
              badge="Q2 2026"
            />
            <ToolCard
              title="Kalendář"
              description="Plánování schůzek se zákazníky."
              icon={<KalendarIcon />}
              variant="disabled"
              badge="Q3 2026"
            />
            <ToolCard
              title="Inbox"
              description="E-maily, SMS a chaty na jednom místě."
              icon={<InboxIcon />}
              variant="disabled"
              badge="Q3 2026"
            />
            <ToolCard
              title="CRM"
              description="Obchodní pipeline a správa příležitostí."
              icon={<CrmIcon />}
              variant="disabled"
              badge="Q4 2026"
            />
            <ToolCard
              title="Knowledge base"
              description="Produkty, pravidla, skripty."
              icon={<KnowledgeIcon />}
              variant="disabled"
              badge="Q4 2026"
            />
          </div>
        </MotionSection>

        <PageWave />
      </MotionSectionGroup>
    </div>
  );
}

