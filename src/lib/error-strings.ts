/**
 * Canonical user-facing fallback error strings.
 *
 * Single source of truth so the same message can't drift across services,
 * hooks, and components. Import these instead of re-typing the literal — a
 * future wording change then lands in exactly one place.
 */

/** Generic "something failed, try again" fallback. Also `friendlyError`'s default. */
export const GENERIC_ERROR = 'Noe gikk galt – prøv igjen'

/** Non-Error thrown value we couldn't classify. */
export const UNKNOWN_ERROR = 'Ukjent feil'

/** An operation exceeded its timeout (see `withTimeout`). */
export const TIMEOUT_ERROR = 'Dette tok for lang tid. Prøv igjen.'
