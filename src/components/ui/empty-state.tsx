import Link from 'next/link';
import type { Icon } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { Button } from './button';

interface EmptyStateProps {
  icon?: Icon;
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
    <div className={cn('flex flex-col items-start py-16', className)}>
      {Icon && <Icon size={32} weight="regular" className="mb-6 text-tertiary" />}
      <h3 className="text-h2 text-primary">{heading}</h3>
      {description && (
        <p className="mt-2 max-w-[44ch] text-body text-secondary">{description}</p>
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
