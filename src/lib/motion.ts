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
// Snappy fade-up for single-form auth pages, 400ms
export const authPageVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export const authPageTransition: Transition = {
  duration: dur(400),
  ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
};

// ============================================
// SCROLL-REVEAL TRANSITION (Landing page)
// ============================================
// Gentle fade-up for below-the-fold content, 600ms
export const scrollVariants: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0 },
};

export const scrollFadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
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

// ============================================
// WIZARD STEP TRANSITION
// ============================================
// Slide-in for multi-step flows (WelcomeFlow, etc.)
export const slideVariants: Variants = {
  enter: { opacity: 0, x: 24 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
};

export const slideTransition: Transition = {
  duration: dur(200),
  ease,
};

// Faster variant for keyboard-initiated step changes
export const slideTransitionFast: Transition = {
  duration: dur(80),
  ease,
};


