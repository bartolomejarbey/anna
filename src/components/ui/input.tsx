import { cn } from '@/lib/cn';
import React from 'react';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'h-10 w-full rounded-[8px] border border-border-subtle bg-surface px-3 text-body text-primary placeholder:text-tertiary transition-colors focus:border-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = 'Input';
