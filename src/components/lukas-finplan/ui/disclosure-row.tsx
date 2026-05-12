'use client';

import { useState } from 'react';
import { CaretRight } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  label: string;
  /** Drobný popisek pod label (např. "Krytí pro příjmy rodiny · 12 let"). */
  helper?: string;
  /** Hodnota napravo (např. "1 200 000 Kč" nebo "Není třeba zajistit"). */
  value: string;
  /** Detail panel — odhalí se po kliknutí. */
  children: React.ReactNode;
  /** Klikatelnost vypnout (např. pokud není co rozkliknout). */
  disabled?: boolean;
}

export function DisclosureRow({
  label,
  helper,
  value,
  children,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        aria-expanded={open}
        className={`flex w-full items-baseline justify-between gap-4 py-4 text-left transition-colors ${
          disabled
            ? 'cursor-default'
            : 'cursor-pointer hover:bg-bg-subtle/50 -mx-3 px-3 rounded-[8px]'
        }`}
      >
        <div className="flex min-w-0 items-baseline gap-2">
          {!disabled ? (
            <motion.span
              animate={{ rotate: open ? 90 : 0 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="flex h-4 w-4 flex-shrink-0 self-center text-tertiary"
            >
              <CaretRight size={14} weight="regular" />
            </motion.span>
          ) : null}
          <div className="min-w-0">
            <div className="text-body text-primary">{label}</div>
            {helper ? (
              <div className="text-body-sm text-tertiary">{helper}</div>
            ) : null}
          </div>
        </div>
        <div className="whitespace-nowrap text-body text-primary tabular-nums">
          {value}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && !disabled ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="pb-5 pl-6 pr-2 pt-1">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

interface BreakdownLineProps {
  label: string;
  value?: string;
  emphasis?: boolean;
}

export function BreakdownLine({ label, value, emphasis }: BreakdownLineProps) {
  return (
    <div
      className={`flex items-baseline justify-between gap-3 text-body-sm ${
        emphasis ? 'border-t border-border-subtle pt-2 mt-1' : ''
      }`}
    >
      <div className={emphasis ? 'font-medium text-primary' : 'text-secondary'}>
        {label}
      </div>
      {value ? (
        <div
          className={`whitespace-nowrap tabular-nums ${
            emphasis ? 'font-medium text-primary' : 'text-primary'
          }`}
        >
          {value}
        </div>
      ) : null}
    </div>
  );
}
