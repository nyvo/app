# Auth email templates (Supabase Auth)

Reference copies of the **GoTrue auth email templates** — the emails Supabase Auth
sends itself (sign-in codes, password reset, invite). These are **not deployed from
this repo**: the live source of truth is the project's Auth config, edited in the
Supabase dashboard (Auth → Templates) or via the management API
(`PATCH /v1/projects/<ref>/config/auth`, fields `mailer_subjects_*` and
`mailer_templates_*_content`). This directory exists so the design survives outside
the dashboard and template changes show up in review. **If you edit a template here,
push the same content to the Auth config — and vice versa.**

Not to be confused with `supabase/functions/send-email/templates/` — those are the
React Email templates for product emails (receipts, reminders, course messages),
sent via Resend.

Placeholders are Go template syntax filled by GoTrue: `{{ .Token }}` (OTP code),
`{{ .ConfirmationURL }}`, `{{ .Email }}`, `{{ .NewEmail }}`, `{{ .SiteURL }}`.

All six sendable templates share one design — the same shell as the Resend
product templates (`send-email/templates/_layout.tsx`): white card on the
app's `neutral-2` canvas (#f9f9f9), pure-neutral ramp from `src/index.css`
(#1f1f1f foreground, #717171 muted, #8e8e8e subtle), Raden wordmark, 22px
heading, 32px monospace code block, centered support footer below the card.
Reference copies reviewed 2026-07-16. Changes in this directory still need to
be copied to the live Auth config separately.

| File | Auth config fields | Subject |
| --- | --- | --- |
| `confirmation.html` | `…_subjects_confirmation` / `…_templates_confirmation_content` | `{{ .Token }} er bekreftelseskoden din` |
| `magic-link.html` | `…_subjects_magic_link` / `…_templates_magic_link_content` | `{{ .Token }} er innloggingskoden din` |
| `recovery.html` | `…_subjects_recovery` / `…_templates_recovery_content` | `{{ .Token }} er tilbakestillingskoden din` |
| `email-change.html` | `…_subjects_email_change` / `…_templates_email_change_content` | `Bekreft ny e-postadresse` |
| `invite.html` | `…_subjects_invite` / `…_templates_invite_content` | `Du er invitert til Raden` |
| `reauthentication.html` | `…_subjects_reauthentication` / `…_templates_reauthentication_content` | `{{ .Token }} er koden din` |

The seven security-notification templates (password/email/phone changed, MFA,
identity linked/unlinked) are left at Supabase defaults because their
`mailer_notifications_*_enabled` flags are all off — restyle them if any get enabled.
