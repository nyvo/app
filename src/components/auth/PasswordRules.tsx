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

/**
 * Live password-requirement row. The check glyph is always present — pale in
 * an outline circle when unmet, on the soft success tint when met — so the unmet
 * state never reads as a selectable radio button (an empty ring did). Matches
 * the production consensus (Rocket Money, Kraken, Spotify, OKX signups):
 * a constant glyph whose color/fill carries the state.
 */
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
          met ? 'border-transparent bg-success-subtle' : 'border-border bg-transparent'
        }`}
      >
        <Check
          className={`size-2.5 transition-colors ${met ? 'text-success' : 'text-foreground-disabled'}`}
          strokeWidth={3}
        />
      </span>
      {children}
      <span className="sr-only">{met ? '(oppfylt)' : '(mangler)'}</span>
    </li>
  )
}

/** The 3-rule live checklist shown under a new-password input. */
export function PasswordRules({ password }: { password: string }) {
  return (
    // aria-live: focus stays in the password input while rules flip state, so
    // without a live region the sr-only "(oppfylt)/(mangler)" changes would
    // never be announced. Polite is safe — the list is 3 rows and a keystroke
    // flips at most one rule.
    <ul className="mt-3 space-y-2" aria-live="polite">
      {RULES.map((rule) => (
        <Rule key={rule.key} met={rule.test(password)}>
          {rule.label}
        </Rule>
      ))}
    </ul>
  )
}
