import Link from 'next/link';
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from './button';

interface EmptyStateProps {
  icon?: LucideIcon;
  heading: string;
  description?: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
    disabled?: boolean;
  };
  className?: string;
}

export function EmptyState({ icon: Icon, heading, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-24 text-center', className)}>
      {Icon && (
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-border-subtle bg-bg-tertiary">
          <Icon className="h-5 w-5 text-text-tertiary" />
        </div>
      )}
      <h3 className="text-xl font-semibold text-text-primary">{heading}</h3>
      {description && (
        <p className="mt-2 max-w-sm text-[15px] text-text-secondary">{description}</p>
      )}
      {action && (
        <div className="mt-8">
          {action.href ? (
            <Link href={action.href}>
              <Button disabled={action.disabled}>{action.label}</Button>
            </Link>
          ) : (
            <Button onClick={action.onClick} disabled={action.disabled}>
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
