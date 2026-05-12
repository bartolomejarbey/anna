import Link from 'next/link';
import { CaretRight } from '@phosphor-icons/react/dist/ssr';
import { cn } from '@/lib/cn';

interface ListRowProps {
  /** Levá strana — primární obsah (title + meta). */
  primary: React.ReactNode;
  /** Sekundární řádek pod primary (timestamps, status). */
  secondary?: React.ReactNode;
  /** Pravý slot (badge, value, action). */
  trailing?: React.ReactNode;
  /** Pokud má položka odkaz, vykreslí se jako Link a přidá caret. */
  href?: string;
  /** Klikatelná položka bez odkazu (např. selection). */
  onClick?: () => void;
  /** Stmavit jako disabled. */
  disabled?: boolean;
  className?: string;
}

/**
 * Apple-style list item. Žádný border na samotné položce — separátory řeší rodič
 * (`divide-y divide-border-subtle` na ul).
 */
export function ListRow({
  primary,
  secondary,
  trailing,
  href,
  onClick,
  disabled,
  className,
}: ListRowProps) {
  const inner = (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0 flex-1">
        <div className="text-body text-primary">{primary}</div>
        {secondary ? (
          <div className="mt-1 text-body-sm text-tertiary">{secondary}</div>
        ) : null}
      </div>
      {trailing ? (
        <div className="flex flex-shrink-0 items-center gap-3 text-body-sm text-secondary tabular-nums">
          {trailing}
        </div>
      ) : null}
      {href ? (
        <CaretRight size={14} weight="regular" className="flex-shrink-0 text-tertiary" />
      ) : null}
    </div>
  );

  const base = cn(
    'block w-full py-5 transition-colors',
    href || onClick
      ? 'cursor-pointer hover:bg-subtle -mx-3 px-3 rounded-[12px]'
      : '',
    disabled ? 'opacity-50 pointer-events-none' : '',
    className,
  );

  if (href) {
    return (
      <Link href={href} className={base}>
        {inner}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(base, 'text-left')}>
        {inner}
      </button>
    );
  }

  return <div className={base}>{inner}</div>;
}
