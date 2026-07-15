import { describe, expect, it } from 'vitest';
import { buttonVariants } from './button';

describe('button motion', () => {
  it('uses shared asymmetric press timing and preserves popup press behavior', () => {
    const classes = buttonVariants();

    expect(classes).toContain('motion-press');
    expect(classes).toContain('active:not-aria-[haspopup]:translate-y-px');
    expect(classes).not.toContain('duration-150 ease-out');
  });
});
