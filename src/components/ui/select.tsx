'use client';

import * as RadixSelect from '@radix-ui/react-select';
import { CaretDown, CaretUp, Check } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';

export const Select = RadixSelect.Root;
export const SelectGroup = RadixSelect.Group;
export const SelectValue = RadixSelect.Value;

interface SelectTriggerProps extends React.ComponentPropsWithoutRef<typeof RadixSelect.Trigger> {
  className?: string;
}

export function SelectTrigger({ className, children, ...props }: SelectTriggerProps) {
  return (
    <RadixSelect.Trigger
      className={cn(
        'flex h-11 w-full items-center justify-between rounded-[12px] border border-border-subtle bg-surface px-4 text-body text-primary placeholder:text-tertiary focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/15 data-[placeholder]:text-tertiary transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
      <RadixSelect.Icon>
        <CaretDown size={14} weight="regular" className="text-tertiary" />
      </RadixSelect.Icon>
    </RadixSelect.Trigger>
  );
}

interface SelectContentProps extends React.ComponentPropsWithoutRef<typeof RadixSelect.Content> {
  className?: string;
}

export function SelectContent({ className, children, position = 'popper', ...props }: SelectContentProps) {
  return (
    <RadixSelect.Portal>
      <RadixSelect.Content
        className={cn(
          'relative z-50 min-w-[8rem] overflow-hidden rounded-[14px] border border-border-subtle bg-surface shadow-[0_8px_32px_rgba(0,0,0,0.08)]',
          position === 'popper' && 'data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1',
          className,
        )}
        position={position}
        {...props}
      >
        <RadixSelect.ScrollUpButton className="flex items-center justify-center py-1 text-tertiary">
          <CaretUp size={14} weight="regular" />
        </RadixSelect.ScrollUpButton>
        <RadixSelect.Viewport className="p-1.5">{children}</RadixSelect.Viewport>
        <RadixSelect.ScrollDownButton className="flex items-center justify-center py-1 text-tertiary">
          <CaretDown size={14} weight="regular" />
        </RadixSelect.ScrollDownButton>
      </RadixSelect.Content>
    </RadixSelect.Portal>
  );
}

interface SelectItemProps extends React.ComponentPropsWithoutRef<typeof RadixSelect.Item> {
  className?: string;
}

export function SelectItem({ className, children, ...props }: SelectItemProps) {
  return (
    <RadixSelect.Item
      className={cn(
        'relative flex w-full cursor-default select-none items-center rounded-[10px] py-2 pl-8 pr-3 text-body text-primary outline-none focus:bg-subtle data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
      )}
      {...props}
    >
      <span className="absolute left-2 flex h-4 w-4 items-center justify-center">
        <RadixSelect.ItemIndicator>
          <Check size={14} weight="regular" className="text-accent" />
        </RadixSelect.ItemIndicator>
      </span>
      <RadixSelect.ItemText>{children}</RadixSelect.ItemText>
    </RadixSelect.Item>
  );
}

export function SelectLabel({ className, children, ...props }: React.ComponentPropsWithoutRef<typeof RadixSelect.Label>) {
  return (
    <RadixSelect.Label
      className={cn('py-1.5 pl-8 pr-3 text-caption text-tertiary', className)}
      {...props}
    >
      {children}
    </RadixSelect.Label>
  );
}

export function SelectSeparator({ className, ...props }: React.ComponentPropsWithoutRef<typeof RadixSelect.Separator>) {
  return (
    <RadixSelect.Separator
      className={cn('-mx-1 my-1 h-px bg-border-subtle', className)}
      {...props}
    />
  );
}
