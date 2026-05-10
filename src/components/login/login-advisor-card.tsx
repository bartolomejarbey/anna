import { loginAsDemoAdvisor } from '@/lib/actions/auth';
import { cn } from '@/lib/cn';

export type AvatarTint = 'cream' | 'sage' | 'ochre' | 'wine' | 'inset';

const TINT_BG: Record<AvatarTint, string> = {
  cream: 'bg-subtle',
  sage: 'bg-[var(--color-sage-bg)]',
  ochre: 'bg-[var(--color-ochre-bg)]',
  wine: 'bg-accent-muted',
  inset: 'bg-inset',
};

const TINT_STROKE: Record<AvatarTint, string> = {
  cream: 'text-secondary',
  sage: 'text-secondary',
  ochre: 'text-secondary',
  wine: 'text-accent',
  inset: 'text-tertiary',
};

interface Props {
  advisorId: string;
  name: string;
  role: string;
  tint: AvatarTint;
}

export function LoginAdvisorCard({ advisorId, name, role, tint }: Props) {
  return (
    <form action={loginAsDemoAdvisor.bind(null, advisorId)}>
      <button
        type="submit"
        className="group flex w-full items-center gap-5 rounded-[14px] border border-border-subtle bg-surface px-5 py-4 text-left transition-all duration-200 hover:-translate-y-[1px] hover:border-accent"
      >
        <div
          className={cn(
            'flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-[20px]',
            TINT_BG[tint],
          )}
          aria-hidden
        >
          <svg
            viewBox="0 0 48 24"
            width={40}
            height={20}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            className={cn('opacity-70', TINT_STROKE[tint])}
          >
            <path d="M2 12 C 8 4, 14 20, 24 12 S 40 4, 46 12" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-h3 text-primary">{name}</p>
          <p className="truncate text-body-sm text-tertiary">{role}</p>
        </div>
        <span
          aria-hidden
          className="text-[18px] text-tertiary transition-colors group-hover:text-accent"
        >
          →
        </span>
      </button>
    </form>
  );
}
