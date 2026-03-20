/**
 * Maps raw database / API errors to user-friendly Norwegian messages.
 *
 * Usage:
 *   import { friendlyError } from '@/lib/error-messages'
 *   toast.error(friendlyError(error))
 */

interface ErrorLike {
  message?: string
  code?: string
}

/** Constraint name → user message */
const CONSTRAINT_MESSAGES: Record<string, string> = {
  unique_active_signup_per_course_email:
    'Denne e-postadressen er allerede påmeldt dette kurset.',
}

/** PostgreSQL error code → user message */
const PG_CODE_MESSAGES: Record<string, string> = {
  '23505': 'Finnes allerede. Prøv igjen med andre opplysninger.',  // unique_violation
  '23503': 'Noe mangler. Prøv å laste siden på nytt.',             // foreign_key_violation
  '23514': 'Sjekk at alt er fylt ut riktig.',                      // check_violation
}

/** Substring patterns in error messages → user message */
const MESSAGE_PATTERNS: [RegExp, string][] = [
  [/duplicate key.*unique_active_signup_per_course_email/i,
    'Denne e-postadressen er allerede påmeldt dette kurset.'],
  [/duplicate key/i,
    'Finnes allerede. Prøv igjen med andre opplysninger.'],
  [/violates foreign key/i,
    'Noe mangler. Prøv å laste siden på nytt.'],
  [/rate limit|too many requests/i,
    'For mange forsøk. Vent litt før du prøver igjen.'],
  [/network|fetch|timeout|ECONNREFUSED/i,
    'Sjekk nettforbindelsen og prøv på nytt.'],
  [/row-level security/i,
    'Du har ikke tilgang. Prøv å logge inn på nytt.'],
  [/JWT expired|invalid token/i,
    'Økten din har utløpt. Logg inn på nytt.'],
  // Stripe payment errors
  [/card_declined|Your card was declined/i,
    'Kortet ble avvist. Prøv et annet kort.'],
  [/insufficient_funds/i,
    'Ikke nok dekning på kortet. Prøv et annet kort.'],
  [/expired_card/i,
    'Kortet har utløpt. Bruk et gyldig kort.'],
  [/incorrect_cvc/i,
    'Feil CVC-kode. Sjekk kortet og prøv igjen.'],
  [/processing_error/i,
    'Betalingen kunne ikke behandles. Prøv igjen.'],
  [/payment_intent_authentication_failure|authentication_required/i,
    'Betalingsgodkjenning mislyktes. Prøv igjen.'],
  [/payment_method_not_available/i,
    'Betalingsmetoden er ikke tilgjengelig. Prøv en annen.'],
]

const GENERIC_FALLBACK = 'Noe gikk galt. Prøv igjen.'

/**
 * Convert a raw error into a user-friendly Norwegian message.
 *
 * @param error  - The error object (Supabase PostgrestError, Error, or string)
 * @param fallback - Optional custom fallback message
 */
export function friendlyError(error: unknown, fallback?: string): string {
  if (!error) return fallback ?? GENERIC_FALLBACK

  const msg = typeof error === 'string' ? error : (error as ErrorLike).message ?? ''
  const code = typeof error === 'string' ? undefined : (error as ErrorLike).code

  // 1. Check constraint name in message
  for (const [constraint, userMsg] of Object.entries(CONSTRAINT_MESSAGES)) {
    if (msg.includes(constraint)) return userMsg
  }

  // 2. Check PostgreSQL error code
  if (code && PG_CODE_MESSAGES[code]) {
    // Still check for specific constraint names even when matched by code
    for (const [constraint, userMsg] of Object.entries(CONSTRAINT_MESSAGES)) {
      if (msg.includes(constraint)) return userMsg
    }
    return PG_CODE_MESSAGES[code]
  }

  // 3. Check message patterns
  for (const [pattern, userMsg] of MESSAGE_PATTERNS) {
    if (pattern.test(msg)) return userMsg
  }

  return fallback ?? GENERIC_FALLBACK
}
