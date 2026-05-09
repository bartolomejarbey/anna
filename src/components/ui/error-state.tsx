import { WarningCircle } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { Button } from './button';

interface ErrorStateProps {
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ description, onRetry, className }: ErrorStateProps) {
  return (
    <div className={cn('flex flex-col items-start py-16', className)}>
      <WarningCircle size={32} weight="regular" className="mb-6 text-error" />
      <h3 className="text-h2 text-primary">Něco se nepovedlo</h3>
      {description && (
        <p className="mt-2 max-w-[44ch] text-body text-secondary">{description}</p>
      )}
      {onRetry && (
        <div className="mt-8">
          <Button variant="secondary" onClick={onRetry}>
            Zkusit znovu
          </Button>
        </div>
      )}
    </div>
  );
}
