import { cn } from '@/lib/cn';
import React from 'react';

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          'min-h-[88px] w-full resize-y rounded-[8px] border border-border-subtle bg-surface px-3 py-2 text-body text-primary placeholder:text-tertiary transition-colors focus:border-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />
    );
  },
);

Textarea.displayName = 'Textarea';
