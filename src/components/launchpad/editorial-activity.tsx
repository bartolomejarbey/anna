import Link from 'next/link';
import { pluralCs, relativeDateCs, type RelativeDate } from '@/lib/format-czech';
import { instrumental, accusative, withPreposition } from '@/lib/czech-declension';

interface MeetingSummary {
  id: string;
  status: string;
  date: string;
  customerName: string | null;
}

interface OfferSummary {
  id: string;
  date: string;
  customerName: string | null;
}

interface EditorialActivityProps {
  weekTotal: number;
  weekReady: number;
  latestMeeting: MeetingSummary | null;
  latestOffer: OfferSummary | null;
}

export function EditorialActivity({
  weekTotal,
  weekReady,
  latestMeeting,
  latestOffer,
}: EditorialActivityProps) {
  return (
    <div className="space-y-5">
      <p className="text-prose text-secondary">
        <WeekSentence total={weekTotal} ready={weekReady} />
      </p>
      <p className="text-prose text-secondary">
        <MeetingSentence meeting={latestMeeting} />
      </p>
      <p className="text-prose text-secondary">
        <OfferSentence offer={latestOffer} />
      </p>
    </div>
  );
}

function Num({ n }: { n: number }) {
  return <span className="font-serif italic text-[20px] leading-none tabular-nums text-primary">{n}</span>;
}

function RelDate({ rel }: { rel: RelativeDate }) {
  switch (rel.kind) {
    case 'today':
      return <>dnes</>;
    case 'yesterday':
      return <>včera</>;
    case 'days-ago':
      return (
        <>
          před <Num n={rel.n} /> dny
        </>
      );
    case 'weeks-ago':
      return rel.n === 1 ? (
        <>před týdnem</>
      ) : (
        <>
          před <Num n={rel.n} /> týdny
        </>
      );
    case 'date':
      return (
        <>
          <Num n={rel.day} />. {rel.month}
        </>
      );
  }
}

function WeekSentence({ total, ready }: { total: number; ready: number }) {
  if (total === 0) {
    return <>Tento týden tu ještě žádná schůzka. Začni nahráváním v Naslouchači.</>;
  }
  const schuzku = pluralCs(total, {
    one: 'schůzku',
    few: 'schůzky',
    other: 'schůzek',
  });
  if (ready === 0) {
    return (
      <>
        Tento týden tu máš <Num n={total} /> {schuzku} — žádná zatím není hotová.
      </>
    );
  }
  if (ready === total) {
    return (
      <>
        Tento týden tu máš <Num n={total} /> {schuzku} — všechny hotové.
      </>
    );
  }
  const hotovych = pluralCs(ready, {
    one: 'hotová',
    few: 'hotové',
    other: 'hotových',
  });
  return (
    <>
      Tento týden tu máš <Num n={total} /> {schuzku} —{' '}
      <Num n={ready} /> {hotovych}.
    </>
  );
}

function MeetingSentence({ meeting }: { meeting: MeetingSummary | null }) {
  if (!meeting) {
    return <>Anna zatím nic nezpracovala. Nahraj v Naslouchači první schůzku.</>;
  }
  const customer = meeting.customerName ?? 'zákazník';
  const rel = relativeDateCs(meeting.date);
  const prep = withPreposition(customer);
  const declined = instrumental(customer);

  if (meeting.status === 'ready') {
    return (
      <>
        Anna připravila přepis schůzky {prep}{' '}
        <Link href={`/schuzky/${meeting.id}`} className="text-primary underline-offset-4 hover:underline">
          {declined}
        </Link>
        , <RelDate rel={rel} />.
      </>
    );
  }
  if (meeting.status === 'processing') {
    return (
      <>
        Anna teď zpracovává nahrávku {prep}{' '}
        <Link href={`/schuzky/${meeting.id}`} className="text-primary underline-offset-4 hover:underline">
          {declined}
        </Link>
        .
      </>
    );
  }
  return (
    <>
      Schůzka {prep}{' '}
      <Link href={`/schuzky/${meeting.id}`} className="text-primary underline-offset-4 hover:underline">
        {declined}
      </Link>{' '}
      čeká na zpracování.
    </>
  );
}

function OfferSentence({ offer }: { offer: OfferSummary | null }) {
  if (!offer) {
    return <>Anna připraví nabídku, jakmile v Naslouchači dotáhneš schůzku.</>;
  }
  const customer = offer.customerName ?? 'zákazník';
  const rel = relativeDateCs(offer.date);
  return (
    <>
      Anna vyrobila poslední nabídku pro{' '}
      <Link href="/nabidky" className="text-primary underline-offset-4 hover:underline">
        {accusative(customer)}
      </Link>
      , <RelDate rel={rel} />.
    </>
  );
}
