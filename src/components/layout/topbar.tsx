'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MagnifyingGlass, CaretDown } from '@phosphor-icons/react';
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
  { match: /^\/financni-plan$/, label: 'Finanční plán' },
  { match: /^\/financni-plan\/novy$/, label: 'Nový plán' },
  { match: /^\/financni-plan\/[^/]+$/, label: 'Plán' },
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
        'flex h-14 shrink-0 items-center justify-between border-b border-border-subtle bg-canvas/80 px-6 backdrop-blur-md md:px-10',
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="inline-flex items-end"
          aria-label="Anna — domů"
        >
          <AnnaWordmark size="sm" interactive />
        </Link>
        {breadcrumb ? (
          <>
            <span className="text-tertiary" aria-hidden>
              /
            </span>
            <span className="text-body-sm text-secondary">{breadcrumb}</span>
          </>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenPalette}
          aria-label="Hledat (Cmd+K)"
          className="group inline-flex h-9 items-center gap-2 rounded-full border border-border-subtle bg-surface pl-3 pr-2 text-body-sm text-tertiary transition-colors hover:border-border-default hover:text-secondary"
        >
          <MagnifyingGlass size={14} weight="regular" />
          <span className="hidden md:inline">Hledat</span>
          <kbd className="hidden rounded-md bg-subtle px-1.5 py-0.5 font-mono text-[11px] text-tertiary md:inline">
            ⌘K
          </kbd>
        </button>

        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((s) => !s)}
            className="inline-flex h-9 items-center gap-1.5 rounded-full px-2.5 text-body-sm font-medium text-primary transition-colors hover:bg-subtle"
            title={advisor.email}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={`Profil: ${advisor.full_name}`}
          >
            <span>{advisor.full_name}</span>
            <CaretDown
              size={12}
              weight="regular"
              className={cn('text-tertiary transition-transform duration-200', menuOpen && 'rotate-180')}
            />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="anna-fade-scale-in absolute right-0 top-[calc(100%+6px)] z-50 w-[240px] overflow-hidden rounded-[14px] border border-border-subtle bg-surface shadow-[0_8px_32px_rgba(0,0,0,0.08)]"
            >
              <div className="px-4 pt-3 pb-3">
                <div className="text-body text-primary">{advisor.full_name}</div>
                <div className="text-body-sm text-tertiary">{advisor.email}</div>
              </div>
              <div className="h-px bg-border-subtle" aria-hidden />
              <div className="p-1.5">
                <Link
                  href="/profil"
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-[10px] px-3 py-2 text-body-sm text-primary hover:bg-subtle"
                >
                  Profil
                </Link>
                <Link
                  href="/login"
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-[10px] px-3 py-2 text-body-sm text-primary hover:bg-subtle"
                >
                  Změnit poradce
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
