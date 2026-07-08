import { describe, it, expect, vi, beforeEach } from 'vitest';

const invoke = vi.fn();
vi.mock('@/lib/supabase', () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => invoke(...args) } },
}));

import { createStripeCheckoutSession } from './billing';

/** A FunctionsHttpError shape: generic message + a Response on `context`. */
function edgeError(status: number, body: unknown) {
  return {
    name: 'FunctionsHttpError',
    message: 'Edge Function returned a non-2xx status code',
    context: { status, json: async () => body } as unknown as Response,
  };
}

describe('createStripeCheckoutSession error handling', () => {
  beforeEach(() => invoke.mockReset());

  it('surfaces the server body message from a non-2xx response', async () => {
    invoke.mockResolvedValue({
      data: null,
      error: edgeError(409, { error: 'Studioet har allerede Pro.' }),
    });
    const { url, error } = await createStripeCheckoutSession('seller-1', 'month');
    expect(url).toBeNull();
    expect(error?.message).toBe('Studioet har allerede Pro.');
  });

  it('falls back to a Norwegian message for a network error (no HTTP body)', async () => {
    invoke.mockResolvedValue({ data: null, error: { message: 'Failed to fetch' } });
    const { error } = await createStripeCheckoutSession('seller-1', 'month');
    // A raw "Failed to fetch" must never reach the toast.
    expect(error?.message).not.toContain('Failed to fetch');
    expect(error?.message).toBe('Sjekk nettforbindelsen og prøv igjen.');
  });

  it('returns the checkout url on success', async () => {
    invoke.mockResolvedValue({ data: { url: 'https://checkout' }, error: null });
    const { url, error } = await createStripeCheckoutSession('seller-1', 'month');
    expect(url).toBe('https://checkout');
    expect(error).toBeNull();
  });
});
