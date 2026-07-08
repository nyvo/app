/**
 * Shared Norwegian copy for auth flows.
 * Centralised to prevent wording drift between teacher and student pages.
 */

export const AUTH_VALIDATION = {
  emailRequired: 'Skriv inn e-posten din',
  emailInvalid: 'Sjekk at e-posten er riktig',
  nameRequired: 'Skriv inn navnet ditt',
  studioNameRequired: 'Skriv inn studionavn',
} as const

export const AUTH_ERRORS = {
  invalidOrExpiredCode: 'Koden er ugyldig eller utløpt',
  generic: 'Noe gikk galt – prøv igjen',
  rateLimited: 'For mange forsøk – vent litt før du prøver igjen',
} as const

// Placeholder rule (CLAUDE.md): default to no placeholder; only allow format
// hints. Most fields below are intentionally empty — the visible label does
// the job.
export const AUTH_PLACEHOLDERS = {
  email: 'E-post',
  studioName: '',
  fullName: '',
} as const
