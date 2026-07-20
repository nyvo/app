import { describe, it, expect } from 'vitest';
import { deriveIsFree, firstInvalidField, type FormState } from './CheckoutPage';

// Strict semantics (user-ratified): the free path requires BOTH the resolved
// tier price and the course price to be zero. The free-signup edge function
// rejects any course with price > 0 and only enrolls the default tier, so a
// paid course can never be "freed" by a zero-price add-on tier.
describe('deriveIsFree', () => {
  it('requires both tier and course to be free', () => {
    expect(deriveIsFree(0, 0)).toBe(true);
    // Paid course with a 0-price tier → still the paid path.
    expect(deriveIsFree(0, 500)).toBe(false);
    // Free-priced course, but the selected tier costs money → paid path.
    expect(deriveIsFree(200, 0)).toBe(false);
  });

  it('falls back to the course price before a tier resolves', () => {
    expect(deriveIsFree(undefined, 0)).toBe(true);
    expect(deriveIsFree(undefined, 350)).toBe(false);
  });

  it('does not treat a missing course price as free', () => {
    expect(deriveIsFree(null, null)).toBe(false);
    expect(deriveIsFree(undefined, undefined)).toBe(false);
    expect(deriveIsFree(0, undefined)).toBe(false);
  });

  it('is paid for any strictly positive resolved price', () => {
    expect(deriveIsFree(1, 0)).toBe(false);
    expect(deriveIsFree(1, undefined)).toBe(false);
  });
});

// Regression for the launch smoke find (2026-07-20): an empty phone used to
// fail isValidPhone and silently block EVERY booking, even though the field
// is optional and the server accepts signups without a phone.
describe('firstInvalidField', () => {
  const valid: FormState = {
    name: 'Kari Nordmann',
    email: 'kari@example.com',
    phone: '',
    note: '',
    terms: true,
  };

  it('accepts a fully valid form with EMPTY phone (phone is optional)', () => {
    expect(firstInvalidField(valid)).toBe(null);
  });

  it('accepts a valid filled phone', () => {
    expect(firstInvalidField({ ...valid, phone: '+47 99 88 77 66' })).toBe(null);
  });

  it('rejects a filled-but-malformed phone', () => {
    expect(firstInvalidField({ ...valid, phone: 'ikke-et-nummer' })).toBe('phone');
  });

  it('still enforces the required fields in focus order', () => {
    expect(firstInvalidField({ ...valid, name: ' ' })).toBe('name');
    expect(firstInvalidField({ ...valid, email: 'ugyldig' })).toBe('email');
    expect(firstInvalidField({ ...valid, terms: false })).toBe('terms');
  });
});
