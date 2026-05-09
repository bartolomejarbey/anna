import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

interface LoadingStateProps {
  text?: string;
  className?: string;
}

export function LoadingState({ text = 'Načítáme…', className }: LoadingStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-24 gap-4', className)}>
      <Loader2 className="h-6 w-6 animate-spin text-text-tertiary" />
      {text && <p className="text-[15px] text-text-secondary">{text}</p>}
    </div>
  );
}
