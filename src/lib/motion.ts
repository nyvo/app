import type { Variants, Transition } from 'framer-motion';

// Shared easing curve (smooth, professional - similar to Linear/Cluely)
const ease: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

// Check for reduced motion preference
const prefersReducedMotion =
  typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

// Duration helper that respects reduced motion
const dur = (ms: number) => (prefersReducedMotion ? 0 : ms / 1000);

// ============================================
// PAGE CONTENT TRANSITION
// ============================================
// Cross-fade + tiny translateY (4px), 180ms
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
};

export const pageTransition: Transition = {
  duration: dur(180),
  ease,
};

// ============================================
// TAB CONTENT TRANSITION
// ============================================
// Fast fade + tiny translateY (3px), 140ms - feels instant
export const tabVariants: Variants = {
  initial: { opacity: 0, y: 3 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -3 },
};

export const tabTransition: Transition = {
  duration: dur(140),
  ease,
};

// ============================================
// AUTH PAGE TRANSITION
// ============================================
// Snappy fade-up for single-form auth pages, 500ms
export const authPageVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export const authPageTransition: Transition = {
  duration: dur(500),
  ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
};
