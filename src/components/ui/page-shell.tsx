import { cn } from '@/lib/cn';

interface PageShellProps {
  /** Maximální šířka obsahu. `narrow` = 720px (čtené stránky), `default` = 1024px, `wide` = 1280px (tables). */
  width?: 'narrow' | 'default' | 'wide';
  className?: string;
  children: React.ReactNode;
}

const widthClasses: Record<NonNullable<PageShellProps['width']>, string> = {
  narrow: 'max-w-[720px]',
  default: 'max-w-[1024px]',
  wide: 'max-w-[1280px]',
};

/**
 * Hlavní obal každé stránky uvnitř AdvisorShellu nebo customer flow.
 * Drží jednotnou horizontal padding + max-width.
 */
export function PageShell({ width = 'default', className, children }: PageShellProps) {
  return (
    <div className={cn('mx-auto w-full px-6 md:px-10', widthClasses[width], className)}>
      {children}
    </div>
  );
}
