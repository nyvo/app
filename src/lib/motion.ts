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

export const tabVariants: Variants = {
  initial: { opacity: 0, y: 3 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -3 },
};

export const tabTransition: Transition = {
  duration: dur(140),
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

export const slideVariants: Variants = {
  enter: { opacity: 0, x: 24 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
};

export const slideTransition: Transition = {
  duration: dur(200),
  ease,
};

export const slideTransitionFast: Transition = {
  duration: dur(80),
  ease,
};
