import { cn } from '@/lib/cn';

interface PageHeaderProps {
  /** Drobný kicker nad title (sekce label). */
  eyebrow?: React.ReactNode;
  /** Hlavní title — vykreslí se jako h1. */
  title: React.ReactNode;
  /** Krátký popis pod title. */
  description?: React.ReactNode;
  /** Akce vpravo (button, link). Schová se pod nadpis na mobilu. */
  actions?: React.ReactNode;
  /** Custom velikost — default h1 (40px), `hero` pro landing/dashboard. */
  variant?: 'default' | 'hero' | 'compact';
  className?: string;
}

const titleClasses: Record<NonNullable<PageHeaderProps['variant']>, string> = {
  default: 'text-h1',
  hero: 'text-hero-sm md:text-hero',
  compact: 'text-h2',
};

const wrapperPadding: Record<NonNullable<PageHeaderProps['variant']>, string> = {
  default: 'pt-12 pb-10',
  hero: 'pt-16 pb-12 md:pt-24 md:pb-16',
  compact: 'pt-8 pb-6',
};

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  variant = 'default',
  className,
}: PageHeaderProps) {
  return (
    <header className={cn(wrapperPadding[variant], className)}>
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-3">
          {eyebrow ? (
            <div className="text-caption text-tertiary">{eyebrow}</div>
          ) : null}
          <h1 className={cn(titleClasses[variant], 'text-primary')}>{title}</h1>
          {description ? (
            <p className="max-w-[60ch] text-body-lg text-secondary">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
