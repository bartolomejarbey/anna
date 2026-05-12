'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';

interface TabItem {
  label: string;
  href: string;
  /** Volitelně badge/counter vpravo od labelu. */
  badge?: React.ReactNode;
}

interface TabsProps {
  items: TabItem[];
  className?: string;
}

/**
 * Apple-style segmented tabs — underline pod aktivním itemem, žádné pozadí.
 * Aktivita se odvozuje z `pathname`.
 */
export function Tabs({ items, className }: TabsProps) {
  const pathname = usePathname();

  return (
    <div className={cn('flex items-center gap-1 border-b border-border-subtle', className)}>
      {items.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== '/' && pathname?.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'relative inline-flex items-center gap-1.5 px-3 py-3 text-body-sm font-medium transition-colors',
              isActive ? 'text-primary' : 'text-tertiary hover:text-secondary',
            )}
          >
            {item.label}
            {item.badge ? <span>{item.badge}</span> : null}
            {isActive ? (
              <span className="absolute inset-x-3 -bottom-px h-px bg-primary" />
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}
