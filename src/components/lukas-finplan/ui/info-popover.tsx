'use client';

import { useEffect, useRef, useState } from 'react';
import { Question } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  /** A11y label for the trigger. */
  label: string;
  /** Popover content (plain text or rich). */
  children: React.ReactNode;
  /** Velikost ikony — default 14. */
  size?: number;
}

export function InfoPopover({ label, children, size = 14 }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <span ref={ref} className="relative inline-flex">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-tertiary transition-colors hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      >
        <Question size={size} weight="regular" />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            className="absolute left-0 top-7 z-30 w-[280px] rounded-[12px] border border-border-default bg-surface px-4 py-3 text-body-sm text-secondary leading-relaxed md:w-[320px]"
          >
            {children}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </span>
  );
}
