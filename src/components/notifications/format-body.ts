/**
 * Notification bodies are stored as `"<name> · <context>"`. That ` · ` is a
 * parsing delimiter, not presentation: the account-deletion PII redaction
 * (supabase/migrations/20260606160000_account_deletion_pii_redaction.sql and
 * successors) regex-matches on `'^.*? · '` to strip deleted buyers' names,
 * and display punctuation like ", " can legitimately appear inside a name —
 * using it as the stored delimiter would risk partial redaction.
 *
 * So the stored format keeps the unambiguous dot, and the UI swaps it for
 * natural punctuation here (repo copy rule: no "·" in visible copy). Applies
 * to historical rows too. Do not "simplify" this by changing the composer in
 * supabase/functions/_shared/notifications.ts without also reworking the
 * redaction functions.
 */
export function formatNotificationBody(body: string): string {
  return body.replaceAll(' · ', ', ')
}
