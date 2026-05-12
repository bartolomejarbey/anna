import { loginAsDemoAdvisor } from '@/lib/actions/auth';
import { Avatar } from '@/components/ui/avatar';
import { CaretRight } from '@phosphor-icons/react/dist/ssr';

export type AvatarTint = 'cream' | 'sage' | 'ochre' | 'wine' | 'inset';

interface Props {
  advisorId: string;
  name: string;
  role: string;
  /** Zachováno pro zpětnou kompatibilitu — Apple varianta tint ignoruje. */
  tint?: AvatarTint;
}

export function LoginAdvisorCard({ advisorId, name, role }: Props) {
  return (
    <form action={loginAsDemoAdvisor.bind(null, advisorId)}>
      <button
        type="submit"
        className="group flex w-full items-center gap-4 rounded-[14px] border border-border-subtle bg-surface px-4 py-3.5 text-left transition-all duration-200 hover:border-border-default hover:bg-subtle/50"
      >
        <Avatar name={name} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-body font-medium text-primary">{name}</p>
          <p className="truncate text-body-sm text-tertiary">{role}</p>
        </div>
        <CaretRight
          size={14}
          weight="regular"
          className="text-tertiary transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
        />
      </button>
    </form>
  );
}
