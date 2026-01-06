import type { Variants, Transition } from 'framer-motion';

// Shared easing curve (smooth, professional - similar to Linear/Cluely)
const ease: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

// Check for reduced motion preference
export const prefersReducedMotion =
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
// LIST ITEM TRANSITION
// ============================================
// Opacity + 2px translate, 150ms - no stagger, no spring
export const listItemVariants: Variants = {
  initial: { opacity: 0, y: 2 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0 },
};

export const listItemTransition: Transition = {
  duration: dur(150),
  ease,
};

// ============================================
// DRAWER/MODAL TRANSITION
// ============================================
// Slide in from right + fade, 260ms
export const drawerVariants: Variants = {
  initial: { opacity: 0, x: '100%' },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: '100%' },
};

export const drawerTransition: Transition = {
  duration: dur(260),
  ease,
};

// ============================================
// FADE ONLY (for simple content swaps)
// ============================================
export const fadeVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const fadeTransition: Transition = {
  duration: dur(150),
  ease,
};
