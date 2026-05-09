'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sun,
  Mic,
  Users,
  FileText,
  User,
  Mail,
  Shield,
  CalendarDays,
  Inbox,
  LayoutGrid,
  BookOpen,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/cn';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  quarter?: string;
}

const mainNav: NavItem[] = [
  { label: 'Dnes', href: '/dashboard', icon: Sun },
  { label: 'Schůzky', href: '/schuzky', icon: Mic },
  { label: 'Zákazníci', href: '/zakaznici', icon: Users },
  { label: 'Nabídky', href: '/nabidky', icon: FileText },
];

const settingsNav: NavItem[] = [
  { label: 'Profil', href: '/profil', icon: User },
];

const comingSoonNav: NavItem[] = [
  { label: 'Newsletter', href: '/newsletter', icon: Mail, quarter: 'Q3 2026' },
  { label: 'Pojištění', href: '/pojisteni', icon: Shield, quarter: 'Q2 2026' },
  { label: 'Kalendář', href: '/kalendar', icon: CalendarDays, quarter: 'Q3 2026' },
  { label: 'Inbox', href: '/inbox', icon: Inbox, quarter: 'Q3 2026' },
  { label: 'CRM', href: '/crm', icon: LayoutGrid, quarter: 'Q4 2026' },
  { label: 'Knowledge base', href: '/knowledge-base', icon: BookOpen, quarter: 'Q4 2026' },
];

function NavLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-[15px] font-medium transition-colors',
        isActive
          ? 'bg-bg-tertiary text-text-primary'
          : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary',
      )}
    >
      <span className="flex items-center gap-3">
        <Icon className="h-4 w-4 shrink-0" />
        {item.label}
      </span>
      {item.quarter && (
        <Badge variant="quarter" className="text-[11px] shrink-0">
          {item.quarter}
        </Badge>
      )}
    </Link>
  );
}

export function Sidebar() {
  return (
    <aside className="flex h-full w-60 flex-col border-r border-border-subtle bg-bg-primary px-4 py-6">
      {/* Wordmark */}
      <div className="mb-8 px-3">
        <span className="text-xl font-semibold text-text-primary tracking-tight">Anna</span>
      </div>

      {/* Main navigation */}
      <nav className="flex flex-col gap-0.5">
        <p className="mb-1 px-3 text-xs font-medium text-text-tertiary uppercase tracking-wider">
          Práce
        </p>
        {mainNav.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </nav>

      {/* Settings navigation */}
      <nav className="mt-6 flex flex-col gap-0.5">
        <p className="mb-1 px-3 text-xs font-medium text-text-tertiary uppercase tracking-wider">
          Nastavení
        </p>
        {settingsNav.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </nav>

      {/* Separator */}
      <div className="my-6 h-px bg-border-subtle" />

      {/* Coming soon navigation */}
      <nav className="flex flex-col gap-0.5">
        <p className="mb-1 px-3 text-xs font-medium text-text-tertiary uppercase tracking-wider">
          Brzy
        </p>
        {comingSoonNav.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </nav>
    </aside>
  );
}
