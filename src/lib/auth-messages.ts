/**
 * Shared Norwegian copy for auth flows.
 * Centralised to prevent wording drift between teacher and student pages.
 */

// --- Validation ---
export const AUTH_VALIDATION = {
  emailRequired: 'Skriv inn e-posten din',
  emailInvalid: 'Sjekk at e-posten er riktig',
  passwordRequired: 'Skriv inn passordet ditt',
  passwordMinLength: 'Passord må være minst 8 tegn',
  passwordNewRequired: 'Skriv inn et passord',
  passwordConfirmRequired: 'Gjenta passordet',
  passwordMismatch: 'Passordene er ikke like',
  nameRequired: 'Skriv inn navnet ditt',
  studioNameRequired: 'Skriv inn navnet på studioet',
} as const

// --- Error responses ---
export const AUTH_ERRORS = {
  invalidCredentials: 'E-post eller passord stemmer ikke',
  emailAlreadyRegistered: 'E-posten er allerede registrert',
  generic: 'Noe gikk galt. Prøv igjen.',
  passwordNotUpdated: 'Passordet ble ikke oppdatert. Prøv igjen.',
  accountCreatedOrgFailed: 'Kontoen ble opprettet, men studioet kunne ikke opprettes. Prøv å logge inn.',
  accountNotCreated: 'Kontoen ble ikke opprettet. Prøv igjen.',
  orgNotCreated: 'Kunne ikke opprette studioet. Prøv igjen.',
  resendFailed: 'Kunne ikke sende e-post. Prøv igjen.',
  rateLimited: 'For mange forsøk. Vent litt før du prøver igjen.',
} as const

// --- Placeholders ---
export const AUTH_PLACEHOLDERS = {
  email: 'navn@eksempel.no',
  password: '••••••••',
  passwordMin: 'Minst 8 tegn',
  confirmPassword: 'Gjenta passordet',
  studioName: 'F.eks. Yoga med Ola',
  fullName: 'Ola Nordmann',
} as const

// --- Hints ---
export const AUTH_HINTS = {
  passwordMinLength: 'Minst 8 tegn',
  studioNameHelper: 'Vises på din offentlige side. Du kan endre det senere.',
  checkSpam: 'Sjekk spam-mappen hvis du ikke finner den.',
  checkSpamAlt: 'Hvis du ikke ser e-posten, sjekk søppelpost.',
} as const
