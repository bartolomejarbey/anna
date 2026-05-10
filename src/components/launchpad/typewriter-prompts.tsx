'use client';

import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

export function TypewriterPrompts({ prompts }: { prompts: readonly string[] }) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return <span>{prompts[0]}</span>;
  }

  return <TypewriterAnimated prompts={prompts} />;
}

function TypewriterAnimated({ prompts }: { prompts: readonly string[] }) {
  const [idx, setIdx] = useState(0);
  const [text, setText] = useState('');
  const [phase, setPhase] = useState<'typing' | 'pause' | 'delete'>('typing');

  useEffect(() => {
    const current = prompts[idx];
    let t: ReturnType<typeof setTimeout> | undefined;

    if (phase === 'typing') {
      if (text.length < current.length) {
        t = setTimeout(() => setText(current.slice(0, text.length + 1)), 40);
      } else {
        t = setTimeout(() => setPhase('pause'), 100);
      }
    } else if (phase === 'pause') {
      t = setTimeout(() => setPhase('delete'), 2400);
    } else if (phase === 'delete') {
      if (text.length > 0) {
        t = setTimeout(() => setText(text.slice(0, -1)), 25);
      } else {
        t = setTimeout(() => {
          setPhase('typing');
          setIdx((i) => (i + 1) % prompts.length);
        }, 100);
      }
    }
    return () => clearTimeout(t);
  }, [text, phase, idx, prompts]);

  return (
    <span className="inline-flex items-center">
      <span>{text}</span>
      <span
        className="ml-1 inline-block h-[28px] w-[2px] animate-pulse bg-accent"
        aria-hidden
      />
    </span>
  );
}
