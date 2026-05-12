import { User, Briefcase } from '@phosphor-icons/react/dist/ssr';
import type { PlanData } from '@/lib/calculator/finplan/types';
import { SectionFrame } from '../ui/section-frame';

interface Props {
  customerName: string;
  plan: PlanData;
}

const TODAY_FMT = new Intl.DateTimeFormat('cs-CZ', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export function ClientHeader({ customerName, plan }: Props) {
  const { client, efaInputs } = plan;
  const displayName = customerName || client.name || 'Zákazník';
  const employmentLabel =
    efaInputs.employmentType === 'employee' ? 'Zaměstnání' : 'Podnikání · OSVČ';

  return (
    <SectionFrame kicker="Klient" icon={User} first>
      <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <h1 className="text-h1 text-primary">{displayName}</h1>
          <div className="mt-4 flex flex-wrap items-baseline gap-3 text-body text-secondary">
            {client.age ? <span>{client.age} let</span> : null}
            {client.family ? (
              <>
                <span className="text-tertiary">·</span>
                <span>{client.family}</span>
              </>
            ) : null}
            <span className="text-tertiary">·</span>
            <span className="inline-flex items-center gap-1.5">
              <Briefcase size={14} weight="regular" />
              {employmentLabel}
            </span>
          </div>
          {client.address ? (
            <div className="mt-2 text-body-sm text-tertiary">{client.address}</div>
          ) : null}
        </div>

        <div className="text-right text-body-sm text-tertiary">
          Finanční plán
          <br />
          {TODAY_FMT.format(new Date())}
        </div>
      </div>
    </SectionFrame>
  );
}
