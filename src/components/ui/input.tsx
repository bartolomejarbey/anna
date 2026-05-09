import { cn } from '@/lib/cn';
import React from 'react';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'h-11 w-full rounded-lg border border-border-subtle bg-bg-primary px-4 text-[15px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent transition-colors disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = 'Input';
