import { cn } from '@/lib/cn';

interface LoadingStateProps {
  text?: string;
  className?: string;
}

export function LoadingState({ text, className }: LoadingStateProps) {
  return (
    <div className={cn('flex flex-col gap-3 py-8', className)}>
      <div className="skeleton h-3 w-full" />
      <div className="skeleton h-3 w-4/5" />
      <div className="skeleton h-3 w-3/5" />
      {text && <p className="mt-2 text-body-sm text-tertiary">{text}</p>}
    </div>
  );
}
