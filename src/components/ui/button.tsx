'use client';

import { cn } from '@/lib/cn';
import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-accent-text hover:bg-accent-hover',
  secondary:
    'border border-border-default bg-transparent text-primary hover:bg-subtle',
  ghost:
    'text-primary hover:bg-subtle',
  danger:
    'bg-error text-white hover:opacity-90',
};

const sizeClasses: Record<ButtonSize, string> = {
  default: 'h-9 px-4 text-body-sm',
  sm: 'h-8 px-3 text-body-sm',
  lg: 'h-11 px-6 text-body',
  icon: 'h-9 w-9',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'default', className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-1.5 rounded-full font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40',
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        style={{ transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
