'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';

interface NavItem {
  label: string;
  href: string;
  quarter?: string;
}

const mainNav: NavItem[] = [
  { label: 'Dnes', href: '/dashboard' },
  { label: 'Schůzky', href: '/schuzky' },
  { label: 'Zákazníci', href: '/zakaznici' },
  { label: 'Nabídky', href: '/nabidky' },
];

const settingsNav: NavItem[] = [
  { label: 'Profil', href: '/profil' },
];

const comingSoonNav: NavItem[] = [
  { label: 'Newsletter', href: '/newsletter', quarter: 'Q3 2026' },
  { label: 'Pojištění', href: '/pojisteni', quarter: 'Q2 2026' },
  { label: 'Kalendář', href: '/kalendar', quarter: 'Q3 2026' },
  { label: 'Inbox', href: '/inbox', quarter: 'Q3 2026' },
  { label: 'CRM', href: '/crm', quarter: 'Q4 2026' },
  { label: 'Knowledge base', href: '/knowledge-base', quarter: 'Q4 2026' },
];

function NavLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

  return (
    <Link
      href={item.href}
      className={cn(
        'relative flex items-center justify-between gap-3 px-4 py-2 text-body transition-colors',
        isActive
          ? 'font-medium text-primary'
          : 'text-secondary hover:bg-subtle hover:text-primary',
      )}
    >
      {isActive && (
        <span
          aria-hidden
          className="absolute left-0 top-1 bottom-1 w-[2px] bg-accent"
        />
      )}
      <span>{item.label}</span>
      {item.quarter && (
        <span className="text-body-sm text-tertiary tabular-nums">
          {item.quarter}
        </span>
      )}
    </Link>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 px-4 text-caption text-tertiary">{children}</p>
  );
}

export function Sidebar() {
  return (
    <aside className="flex h-full w-60 flex-col border-r border-border-subtle bg-canvas px-2 py-8">
      <div className="mb-12 px-4">
        <span
          className="text-primary"
          style={{ fontSize: 22, fontWeight: 500, letterSpacing: '-0.01em' }}
        >
          Anna
        </span>
      </div>

      <nav className="flex flex-col">
        <SectionLabel>Práce</SectionLabel>
        {mainNav.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </nav>

      <nav className="mt-8 flex flex-col">
        <SectionLabel>Nastavení</SectionLabel>
        {settingsNav.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </nav>

      <nav className="mt-8 flex flex-col">
        <SectionLabel>Brzy</SectionLabel>
        {comingSoonNav.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </nav>
    </aside>
  );
}
