'use client';

import { motion, type Variants } from 'framer-motion';

const HERO_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

const SECTION_CONTAINER: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.04, delayChildren: 0.1 },
  },
};

const SECTION_ITEM: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

export function MotionHero({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.header
      className={className}
      initial="hidden"
      animate="visible"
      variants={HERO_VARIANTS}
    >
      {children}
    </motion.header>
  );
}

export function MotionSectionGroup({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={SECTION_CONTAINER}
    >
      {children}
    </motion.div>
  );
}

export function MotionSection({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.section className={className} variants={SECTION_ITEM}>
      {children}
    </motion.section>
  );
}
