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
  primary: 'bg-accent text-accent-text hover:opacity-90',
  secondary: 'border border-border-default bg-transparent text-primary hover:bg-subtle',
  ghost: 'text-primary hover:bg-subtle',
  danger: 'border border-[color-mix(in_oklab,_var(--color-error)_30%,_transparent)] text-error hover:bg-error-bg',
};

const sizeClasses: Record<ButtonSize, string> = {
  default: 'h-10 px-4 text-body',
  sm: 'h-8 px-3 text-body-sm',
  icon: 'h-10 w-10',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'default', className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-[8px] font-medium transition-all focus:outline-none focus-visible:border-accent active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40',
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
