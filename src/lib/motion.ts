import type { Variants, Transition } from 'framer-motion';

const ease: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

const prefersReducedMotion =
  typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

const dur = (ms: number) => (prefersReducedMotion ? 0 : ms / 1000);

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
};

export const pageTransition: Transition = {
  duration: dur(180),
  ease,
};

export const authPageVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export const authPageTransition: Transition = {
  duration: dur(400),
  ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
};

export const scrollVariants: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0 },
};

export const scrollStaggerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

export const scrollTransition: Transition = {
  duration: dur(600),
  ease,
};

// Onboarding step transition — direction-aware horizontal slide + crossfade.
// Custom prop = 1 (forward) or -1 (back). Apple's drawer curve decelerates
// evenly without the snap-and-settle feel of stronger ease-outs. Subtle 16px
// offset keeps it elegant. Exit is faster than enter (Emil's asymmetric
// principle) — system responds fast, new content settles in.
const stepEase: [number, number, number, number] = [0.32, 0.72, 0, 1];

export const stepVariants: Variants = {
  enter: (direction: number) => ({
    opacity: 0,
    x: 16 * direction,
  }),
  center: {
    opacity: 1,
    x: 0,
    transition: { duration: dur(220), ease: stepEase },
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: -16 * direction,
    transition: { duration: dur(160), ease: stepEase },
  }),
};
