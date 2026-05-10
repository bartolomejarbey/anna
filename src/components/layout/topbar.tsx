'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NavArrowDown } from 'iconoir-react';
import { AnnaWordmark } from '@/components/brand/anna-wordmark';
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

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointer = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  return (
    <header
      className={cn(
        'flex h-16 shrink-0 items-center justify-between border-b border-border-subtle bg-canvas px-8',
        className,
      )}
    >
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard"
          className="inline-flex items-end gap-3"
          aria-label="Anna — domů"
        >
          <AnnaWordmark size="md" animate interactive />
        </Link>
        {breadcrumb && (
          <>
            <span className="mb-1 text-tertiary" aria-hidden>
              /
            </span>
            <span className="mb-1 text-body text-secondary">{breadcrumb}</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-6">
        <button
          type="button"
          onClick={onOpenPalette}
          aria-label="Zeptej se Anny"
          className="flex items-center gap-2 rounded-[8px] border border-border-subtle bg-surface px-3 py-1.5 text-body-sm text-tertiary transition-colors hover:border-border-default hover:text-primary"
        >
          <span>Zeptej se Anny</span>
          <kbd className="font-mono text-body-sm text-tertiary">⌘K</kbd>
        </button>

        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((s) => !s)}
            className="flex items-center gap-1.5 text-body text-primary transition-colors hover:text-accent"
            title={advisor.email}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={`Profil: ${advisor.full_name}`}
          >
            <span>{advisor.full_name}</span>
            <NavArrowDown
              width={14}
              height={14}
              strokeWidth={1.5}
              className={cn('transition-transform duration-200', menuOpen && 'rotate-180')}
            />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="anna-fade-scale-in absolute right-0 top-[calc(100%+8px)] z-50 w-[220px] overflow-hidden rounded-[12px] border border-border-default bg-surface py-1.5"
            >
              <div className="px-4 pt-2 pb-2">
                <div className="text-body text-primary">{advisor.full_name}</div>
                <div className="text-body-sm text-tertiary">{advisor.email}</div>
              </div>
              <div className="my-1 h-px bg-border-subtle" aria-hidden />
              <Link
                href="/profil"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-2 text-body-sm text-primary hover:bg-subtle"
              >
                Profil
              </Link>
              <Link
                href="/login"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-2 text-body-sm text-primary hover:bg-subtle"
              >
                Změnit poradce
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
