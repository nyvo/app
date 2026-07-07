/**
 * Client-side receipt payload for free (zero-price) signups, threaded through
 * the checkout → success redirect via sessionStorage.
 *
 * `createFreeSignup` (supabase/functions/create-free-signup) only ever
 * returns `{ signupId }` — there is no server-side receipt-lookup RPC for
 * free signups (unlike the paid path's `get_signup_by_stripe_id`). Adding one
 * would need a new migration applied to the shared remote DB, which is out of
 * scope for a client-only redirect fix (see task-11 brief). CheckoutPage
 * already holds every field the receipt needs in memory at submit time, so
 * the payload is stashed in sessionStorage rather than fetched again:
 * sessionStorage (not query params) keeps the participant's email out of the
 * URL, browser history, referrer headers, and analytics; keying by signup id
 * means two concurrent checkouts in different tabs can't clobber each other's
 * entry.
 */
export interface FreeReceipt {
  signupId: string;
  courseId: string;
  courseTitle: string;
  startDate: string | null;
  timeSchedule: string | null;
  location: string | null;
  locationLat: number | null;
  locationLon: number | null;
  locationPlaceId: string | null;
  imageUrl: string | null;
  sellerName: string;
  sellerSlug: string;
  /** Already masked (k•••@example.com) — the full address is never stored. */
  participantEmailMasked: string;
  createdAt: string;
}

function storageKey(signupId: string): string {
  return `checkout:free-receipt:${signupId}`;
}

export function saveFreeReceipt(receipt: FreeReceipt): void {
  try {
    sessionStorage.setItem(storageKey(receipt.signupId), JSON.stringify(receipt));
  } catch {
    // sessionStorage can throw (private-browsing quota, storage disabled) —
    // the success page falls back to its no-recap free view when reading fails.
  }
}

export function readFreeReceipt(signupId: string | null): FreeReceipt | null {
  if (!signupId) return null;
  try {
    const raw = sessionStorage.getItem(storageKey(signupId));
    if (!raw) return null;
    return JSON.parse(raw) as FreeReceipt;
  } catch {
    return null;
  }
}

/**
 * Mirrors the server-side masking used by `get_signup_by_stripe_id` /
 * `get_signup_by_dintero_id` (`regexp_replace(email, '^(.)[^@]*@', '\1•••@')`)
 * so the free-path receipt reads identically to the paid path's masked email.
 */
export function maskEmail(email: string): string {
  return email.replace(/^(.)[^@]*@/, '$1•••@');
}
