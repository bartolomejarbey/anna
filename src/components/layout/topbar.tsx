'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NavArrowDown } from 'iconoir-react';
import { cn } from '@/lib/cn';

interface Advisor {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  role: 'advisor' | 'tenant_admin' | 'super_admin';
}

interface TopbarProps {
  advisor: Advisor;
  onOpenPalette: () => void;
  className?: string;
}

const PAGE_TITLES: Array<{ match: RegExp; label: string }> = [
  { match: /^\/schuzky\/nova$/, label: 'Nová schůzka' },
  { match: /^\/schuzky\/[^/]+$/, label: 'Schůzka' },
  { match: /^\/schuzky$/, label: 'Schůzky' },
  { match: /^\/zakaznici\/[^/]+$/, label: 'Zákazník' },
  { match: /^\/zakaznici$/, label: 'Zákazníci' },
  { match: /^\/nabidky$/, label: 'Nabídky' },
  { match: /^\/profil$/, label: 'Profil' },
  { match: /^\/admin$/, label: 'Admin' },
  { match: /^\/newsletter$/, label: 'Newsletter' },
  { match: /^\/pojisteni$/, label: 'Pojištění' },
  { match: /^\/kalendar$/, label: 'Kalendář' },
  { match: /^\/inbox$/, label: 'Inbox' },
  { match: /^\/crm$/, label: 'CRM' },
  { match: /^\/knowledge-base$/, label: 'Knowledge base' },
];

function pageTitleFor(pathname: string): string | null {
  const found = PAGE_TITLES.find((p) => p.match.test(pathname));
  return found?.label ?? null;
}

export function Topbar({ advisor, onOpenPalette, className }: TopbarProps) {
  const pathname = usePathname();
  const isHome = pathname === '/' || pathname === '/dashboard';
  const breadcrumb = isHome ? null : pageTitleFor(pathname);

  return (
    <header
      className={cn(
        'flex h-16 shrink-0 items-center justify-between border-b border-border-subtle bg-canvas px-8',
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="text-h3 font-medium text-primary tracking-tight transition-colors hover:text-accent"
        >
          Anna
        </Link>
        {breadcrumb && (
          <>
            <span className="text-tertiary" aria-hidden>/</span>
            <span className="text-body text-secondary">{breadcrumb}</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-6">
        <button
          type="button"
          onClick={onOpenPalette}
          aria-label="Otevřít vyhledávání"
          className="flex items-center gap-2 rounded-[8px] border border-border-subtle bg-surface px-3 py-1.5 text-body-sm text-tertiary transition-colors hover:border-border-default hover:text-primary"
        >
          <span>Hledat</span>
          <kbd className="font-mono text-body-sm text-tertiary">⌘K</kbd>
        </button>
        <button
          type="button"
          className="flex items-center gap-1.5 text-body text-primary transition-colors hover:text-accent"
          title={advisor.email}
          aria-label={`Profil: ${advisor.full_name}`}
        >
          <span>{advisor.full_name}</span>
          <NavArrowDown width={14} height={14} strokeWidth={1.5} />
        </button>
      </div>
    </header>
  );
}
