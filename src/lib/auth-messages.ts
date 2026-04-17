/**
 * Shared Norwegian copy for auth flows.
 * Centralised to prevent wording drift between teacher and student pages.
 */

export const AUTH_VALIDATION = {
  emailRequired: 'Skriv inn e-posten din',
  emailInvalid: 'Sjekk at e-posten er riktig',
  passwordRequired: 'Skriv inn passordet ditt',
  passwordMinLength: 'Passord må være minst 10 tegn',
  passwordNewRequired: 'Skriv inn et passord',
  passwordConfirmRequired: 'Gjenta passordet',
  passwordMismatch: 'Passordene er ikke like',
  nameRequired: 'Skriv inn navnet ditt',
  studioNameRequired: 'Skriv inn navnet på studioet',
} as const

export const AUTH_ERRORS = {
  invalidCredentials: 'E-post eller passord stemmer ikke',
  emailAlreadyRegistered: 'E-posten er allerede registrert',
  generic: 'Noe gikk galt. Prøv igjen.',
  passwordNotUpdated: 'Passordet ble ikke oppdatert. Prøv igjen.',
  accountNotCreated: 'Kontoen ble ikke opprettet. Prøv igjen.',
  resendFailed: 'Kunne ikke sende e-post. Prøv igjen.',
  rateLimited: 'For mange forsøk. Vent litt før du prøver igjen.',
} as const

export const AUTH_PLACEHOLDERS = {
  email: 'navn@eksempel.no',
  password: 'Skriv inn passord',
  passwordMin: 'Minst 10 tegn',
  confirmPassword: 'Gjenta passordet',
  studioName: 'F.eks. Yoga med Ola',
  fullName: 'Ola Nordmann',
} as const

export const AUTH_HINTS = {
  passwordMinLength: 'Minst 10 tegn',
  studioNameHelper: 'Vises på din offentlige side. Du kan endre det senere.',
  checkSpam: 'Sjekk spam-mappen hvis du ikke finner den.',
  checkSpamAlt: 'Hvis du ikke ser e-posten, sjekk søppelpost.',
} as const
