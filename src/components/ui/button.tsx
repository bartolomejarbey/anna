'use client';

import { cn } from '@/lib/cn';
import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'default' | 'sm' | 'icon';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-bg-primary hover:bg-accent-hover',
  secondary:
    'border border-border-subtle bg-bg-primary text-text-primary hover:bg-bg-tertiary',
  ghost:
    'text-text-primary hover:bg-bg-tertiary',
  danger:
    'border border-[color-mix(in_oklab,_var(--color-error)_30%,_transparent)] text-error hover:bg-[color-mix(in_oklab,_var(--color-error)_8%,_transparent)]',
};

const sizeClasses: Record<ButtonSize, string> = {
  default: 'h-11 px-6 text-[15px]',
  sm: 'h-9 px-4 text-sm',
  icon: 'h-11 w-11',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'default', className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-xl font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
