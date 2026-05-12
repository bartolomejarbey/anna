import { WarningCircle } from '@phosphor-icons/react/dist/ssr';
import { cn } from '@/lib/cn';
import { Button } from './button';

interface ErrorStateProps {
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ description, onRetry, className }: ErrorStateProps) {
  return (
    <div className={cn('flex flex-col items-center text-center py-20', className)}>
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-[color-mix(in_oklab,_var(--color-error)_10%,_transparent)]">
        <WarningCircle size={24} weight="regular" className="text-error" />
      </div>
      <h3 className="text-h2 text-primary">Něco se nepovedlo</h3>
      {description && (
        <p className="mt-3 max-w-[44ch] text-body text-secondary">{description}</p>
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
