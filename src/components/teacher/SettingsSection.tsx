import type { ReactNode } from 'react';

/**
 * SettingsSection — the canonical "label + description + controls" group used
 * across the teacher settings-style pages (Studio, Innstillinger, Samarbeid).
 *
 * Pattern (validated against Linear / Stripe / Vercel settings): every group on
 * a settings page gets the SAME treatment — an h2 label, an optional one-line
 * description, then the controls (usually a <Card>). This keeps multiple
 * sections on one page clearly grouped and stops content from stacking
 * formlessly under the page title.
 *
 * Usage — stack sections in a `space-y-10` container inside a
 * `PageShell narrow="centered"`, wrapping each group's controls in a <Card>:
 *
 *   <PageShell narrow="centered" title="Innstillinger">
 *     <div className="space-y-10">
 *       <SettingsSection title="Personlig informasjon">
 *         <Card><CardContent>…fields…</CardContent></Card>
 *       </SettingsSection>
 *       …
 *     </div>
 *   </PageShell>
 *
 * Heading size matches the reference (Utbetalingskonto): text-base. The label →
 * content gap is 16px; sections are separated by the parent's larger
 * `space-y-10`, so groups read as distinct units (bigger gap between than
 * within — the rhythm that signals what belongs together).
 */
interface SettingsSectionProps {
  /** Section label — renders as h2. */
  title: string;
  /** Optional one-line description below the label. */
  description?: ReactNode;
  /** Optional right-aligned action in the section header row. */
  action?: ReactNode;
  /** The section's controls — typically a <Card>. */
  children: ReactNode;
  className?: string;
}

export function SettingsSection({
  title,
  description,
  action,
  children,
  className,
}: SettingsSectionProps) {
  return (
    <section className={className}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-medium tracking-tight text-foreground">
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-base text-foreground-muted">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
