'use client';

import { useEffect, useRef, useState } from 'react';
import { animate, useMotionValue } from 'framer-motion';

interface StatCounterProps {
  value: number;
  durationMs?: number;
  className?: string;
  format?: (n: number) => string;
}

export function StatCounter({
  value,
  durationMs = 800,
  className,
  format = (n) => Math.round(n).toString(),
}: StatCounterProps) {
  const motionValue = useMotionValue(0);
  const [display, setDisplay] = useState<string>(format(0));
  const lastValueRef = useRef<number>(0);

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: durationMs / 1000,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => {
        const next = format(latest);
        if (next !== lastValueRef.current.toString()) {
          lastValueRef.current = latest;
          setDisplay(next);
        }
      },
    });
    return () => controls.stop();
  }, [value, durationMs, format, motionValue]);

  return <span className={className}>{display}</span>;
}
