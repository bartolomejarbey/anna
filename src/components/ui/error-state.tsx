import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from './button';

interface ErrorStateProps {
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ description, onRetry, className }: ErrorStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-24 text-center', className)}>
      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-[color-mix(in_oklab,_var(--color-error)_30%,_transparent)] bg-[color-mix(in_oklab,_var(--color-error)_8%,_transparent)]">
        <AlertCircle className="h-5 w-5 text-error" />
      </div>
      <h3 className="text-xl font-semibold text-text-primary">Něco se nepovedlo</h3>
      {description && (
        <p className="mt-2 max-w-sm text-[15px] text-text-secondary">{description}</p>
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
