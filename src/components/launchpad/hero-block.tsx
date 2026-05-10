'use client';

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const SESSION_KEY = 'anna-hero-played';

interface HeroBlockProps {
  greeting: string;
  name: string;
  tagline?: string;
}

const EASE = [0.16, 1, 0.3, 1] as const;

export function HeroBlock({
  greeting,
  name,
  tagline = 'Tvůj prostor na Anně.',
}: HeroBlockProps) {
  const reducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<'pending' | 'static' | 'animate'>('pending');

  useEffect(() => {
    if (reducedMotion === null) return;
    let next: 'static' | 'animate' = 'static';
    if (!reducedMotion) {
      const params = new URLSearchParams(window.location.search);
      const skip = params.get('fast') === '1';
      const played = sessionStorage.getItem(SESSION_KEY);
      if (!skip && !played) {
        sessionStorage.setItem(SESSION_KEY, '1');
        next = 'animate';
      }
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot mount decision: syncs browser-only state (sessionStorage, URL, prefers-reduced-motion) into render
    setPhase(next);
  }, [reducedMotion]);

  const animate = phase === 'animate';
  const decided = phase !== 'pending';

  const greetingWords = `${greeting},`.split(' ');
  const nameWords = name.split(' ');
  const totalWords = greetingWords.length + nameWords.length;
  const lineDelay = 0.55 + (totalWords - 1) * 0.12;

  if (!decided || !animate) {
    return (
      <header className="relative z-10 mb-32">
        <HeroDots />
        <h1 className="text-hero-serif text-primary">
          <span className="block">{greetingWords.join(' ')}</span>
          <span className="block -ml-4">{name}</span>
        </h1>
        <span className="anna-hero-line mt-7 block" aria-hidden />
        <p className="font-serif italic text-[22px] leading-[1.4] tracking-[-0.005em] text-secondary mt-6">{tagline}</p>
      </header>
    );
  }

  let wordIndex = 0;
  return (
    <motion.header className="relative z-10 mb-32" initial="hidden" animate="visible">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.7, ease: EASE }}
      >
        <HeroDots />
      </motion.div>
      <h1 className="text-hero-serif text-primary">
        <span className="block">
          {greetingWords.map((word, i) => {
            const idx = wordIndex++;
            const isLast = i === greetingWords.length - 1;
            return (
              <motion.span
                key={`g-${i}`}
                className="inline-block"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: idx * 0.12, ease: EASE }}
              >
                {word}
                {!isLast && ' '}
              </motion.span>
            );
          })}
        </span>
        <span className="block -ml-4">
          {nameWords.map((word, i) => {
            const idx = wordIndex++;
            const isLast = i === nameWords.length - 1;
            return (
              <motion.span
                key={`n-${i}`}
                className="inline-block"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: idx * 0.12, ease: EASE }}
              >
                {word}
                {!isLast && ' '}
              </motion.span>
            );
          })}
        </span>
      </h1>
      <motion.span
        className="anna-hero-line mt-7 block"
        style={{ transformOrigin: 'left center' }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.5, delay: lineDelay, ease: EASE }}
        aria-hidden
      />
      <motion.p
        className="font-serif italic text-[22px] leading-[1.4] tracking-[-0.005em] text-secondary mt-6"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: lineDelay + 0.18, ease: EASE }}
      >
        {tagline}
      </motion.p>
    </motion.header>
  );
}

function HeroDots() {
  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width="100%"
      height="280"
      viewBox="0 0 1216 280"
      preserveAspectRatio="none"
      aria-hidden
    >
      {/* 14 dots scattered, half wine half warmbrown — capped at 0.45 per spec */}
      <circle cx="58" cy="34" r="2" fill="var(--color-warmbrown)" opacity="0.42" />
      <circle cx="142" cy="86" r="2.5" fill="var(--color-accent)" opacity="0.45" />
      <circle cx="232" cy="48" r="2" fill="var(--color-warmbrown)" opacity="0.45" />
      <circle cx="318" cy="142" r="3" fill="var(--color-accent)" opacity="0.40" />
      <circle cx="406" cy="62" r="2.5" fill="var(--color-warmbrown)" opacity="0.42" />
      <circle cx="498" cy="186" r="2.5" fill="var(--color-accent)" opacity="0.45" />
      <circle cx="592" cy="38" r="2" fill="var(--color-warmbrown)" opacity="0.45" />
      <circle cx="684" cy="118" r="2.5" fill="var(--color-warmbrown)" opacity="0.38" />
      <circle cx="778" cy="218" r="2" fill="var(--color-accent)" opacity="0.40" />
      <circle cx="868" cy="74" r="3" fill="var(--color-accent)" opacity="0.42" />
      <circle cx="962" cy="148" r="2.5" fill="var(--color-warmbrown)" opacity="0.45" />
      <circle cx="1052" cy="44" r="2" fill="var(--color-warmbrown)" opacity="0.45" />
      <circle cx="1132" cy="198" r="2.5" fill="var(--color-accent)" opacity="0.40" />
      <circle cx="1182" cy="92" r="2" fill="var(--color-warmbrown)" opacity="0.42" />
      {/* wine tick marks — secondary motif */}
      <rect x="246" y="220" width="1" height="10" fill="var(--color-accent)" opacity="0.42" />
      <rect x="722" y="252" width="1" height="10" fill="var(--color-accent)" opacity="0.38" />
      <rect x="1098" y="138" width="1" height="10" fill="var(--color-accent)" opacity="0.40" />
    </svg>
  );
}
