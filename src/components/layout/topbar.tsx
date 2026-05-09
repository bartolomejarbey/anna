import { Search } from 'lucide-react';
import { cn } from '@/lib/cn';

interface Advisor {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  role: 'advisor';
}

interface TopbarProps {
  advisor: Advisor;
  children?: React.ReactNode;
  className?: string;
}

export function Topbar({ advisor, children, className }: TopbarProps) {
  const initials = advisor.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <header
      className={cn(
        'flex h-16 items-center justify-between border-b border-border-subtle bg-bg-primary px-8',
        className,
      )}
    >
      {/* Page title slot */}
      <div className="flex items-center gap-4">
        {children && (
          <div className="text-lg font-semibold text-text-primary">{children}</div>
        )}
      </div>

      {/* Search (visual only) */}
      <div className="hidden md:flex items-center gap-2 h-9 rounded-lg border border-border-subtle bg-bg-tertiary px-3 w-64 text-[14px] text-text-tertiary">
        <Search className="h-4 w-4 shrink-0" />
        <span>Hledat…</span>
      </div>

      {/* Advisor avatar dropdown placeholder */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border-subtle bg-bg-tertiary text-[13px] font-medium text-text-secondary cursor-pointer"
          title={advisor.full_name}
          aria-label={`Profil: ${advisor.full_name}`}
        >
          {advisor.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={advisor.avatar_url}
              alt={advisor.full_name}
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            initials
          )}
        </div>
      </div>
    </header>
  );
}
