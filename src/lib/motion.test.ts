import { describe, expect, it } from 'vitest';
import {
  EASE_DRAWER,
  EASE_IN_OUT,
  EASE_OUT,
  scrollTransition,
  stepVariants,
} from './motion';

describe('motion tokens', () => {
  it('exports the canonical easing curves', () => {
    expect(EASE_OUT).toEqual([0.23, 1, 0.32, 1]);
    expect(EASE_IN_OUT).toEqual([0.77, 0, 0.175, 1]);
    expect(EASE_DRAWER).toEqual([0.32, 0.72, 0, 1]);
  });

  it('keeps normal durations available for MotionConfig reduced motion handling', () => {
    expect(scrollTransition.duration).toBe(0.6);
    expect(stepVariants.center).toMatchObject({
      transition: { duration: 0.22, ease: EASE_DRAWER },
    });
    const exit = stepVariants.exit;
    expect(typeof exit).toBe('function');
    if (typeof exit !== 'function') return;
    expect(exit(1, {}, {})).toMatchObject({
      transition: { duration: 0.16, ease: EASE_DRAWER },
    });
  });
});
