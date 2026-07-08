import { describe, it, expect } from 'vitest';
import { deriveIsFree } from './CheckoutPage';

// Fix 8: `isFree` is keyed to the selected tier's price, not the course price,
// so a paid course with a 0-price tier reads as free (and vice versa). Before a
// tier resolves it falls back to the course price.
describe('deriveIsFree', () => {
  it('uses the tier price when a tier is resolved', () => {
    // Paid course, but the selected tier is free → free path.
    expect(deriveIsFree(0, 500)).toBe(true);
    // Free-priced course, but the selected tier costs money → paid path.
    expect(deriveIsFree(200, 0)).toBe(false);
  });

  it('falls back to the course price before a tier resolves', () => {
    expect(deriveIsFree(undefined, 0)).toBe(true);
    expect(deriveIsFree(undefined, 350)).toBe(false);
    expect(deriveIsFree(null, null)).toBe(true);
  });

  it('treats missing prices and negatives as free', () => {
    expect(deriveIsFree(undefined, undefined)).toBe(true);
    expect(deriveIsFree(-10, 500)).toBe(true);
  });

  it('is paid only for a strictly positive resolved price', () => {
    expect(deriveIsFree(1, undefined)).toBe(false);
  });
});
