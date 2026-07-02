import { Check } from '@/lib/icons'

/**
 * Password requirements — a single source of truth shared by AuthPage (sign-up)
 * and the settings Passord row, so the rules and their copy can't drift apart.
 */
const RULES = [
  { key: 'length', label: 'Minst 8 tegn', test: (p: string) => p.length >= 8 },
  { key: 'number', label: 'Minst ett tall', test: (p: string) => /\d/.test(p) },
  { key: 'special', label: 'Minst ett spesialtegn', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
] as const

/** True when the password satisfies every requirement. */
export function isPasswordValid(password: string): boolean {
  return RULES.every((rule) => rule.test(password))
}

/** Live password-requirement row — neutral filled disc when met, empty ring when not. */
function Rule({ met, children }: { met: boolean; children: React.ReactNode }) {
  return (
    <li
      className={`flex items-center gap-2.5 text-sm transition-colors ${
        met ? 'text-foreground' : 'text-foreground-muted'
      }`}
    >
      <span
        aria-hidden="true"
        className={`flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors ${
          met ? 'border-foreground bg-foreground' : 'border-border bg-transparent'
        }`}
      >
        {met && <Check className="size-2.5 text-background" strokeWidth={3} />}
      </span>
      {children}
    </li>
  )
}

/** The 3-rule live checklist shown under a new-password input. */
export function PasswordRules({ password }: { password: string }) {
  return (
    <ul className="mt-3 space-y-2">
      {RULES.map((rule) => (
        <Rule key={rule.key} met={rule.test(password)}>
          {rule.label}
        </Rule>
      ))}
    </ul>
  )
}
