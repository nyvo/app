import type { ReactNode } from 'react';

/**
 * SettingsRows / SettingsRow — the shared horizontal "label column left,
 * controls right" settings layout (Graphite / Gorgias settings pattern).
 *
 * Design rationale (locked in Phase 2 of the teacher-dashboard design pass):
 *
 *  - Every settings-style page already sits on PageShell's `max-w-6xl` (1152px)
 *    outer shell. "Narrow" is NOT handled by shrinking the shell — it's handled
 *    HERE, at content level: a fixed 220px label column + a control column
 *    CAPPED at 42rem (672px), the whole thing LEFT-aligned. Total content is
 *    ~940px, so inputs never balloon across the wide shell.
 *  - Sections are separated by `divide-border-subtle` — one step quieter than
 *    the louder `divide-border`; grouped settings don't need hard rules between
 *    them.
 *  - The section title is `text-base font-medium` — deliberately stepped DOWN
 *    from the old `text-lg` (which competed with the page h1). An optional
 *    one-line muted description sits under it; use it sparingly, only where it
 *    adds real information.
 *  - Mobile collapses to a single column (label stacks above the controls).
 *
 * Usage:
 *
 *   <SettingsRows>
 *     <SettingsRow id="image" title="Bilde" description="Vises på kurskortet.">
 *       …controls…
 *     </SettingsRow>
 *     <SettingsRow title="Detaljer">…controls…</SettingsRow>
 *   </SettingsRows>
 */

interface SettingsRowsProps {
  children: ReactNode;
}

export function SettingsRows({ children }: SettingsRowsProps) {
  return <div className="divide-y divide-border-subtle">{children}</div>;
}

interface SettingsRowProps {
  /** Optional anchor id — enables deep-linking / scroll-to (scroll-mt-24). */
  id?: string;
  /** Section label — renders as h2. */
  title: string;
  /** Optional one-line description below the label. Use sparingly. */
  description?: ReactNode;
  /** The section's controls. */
  children: ReactNode;
}

export function SettingsRow({ id, title, description, children }: SettingsRowProps) {
  return (
    <section
      id={id}
      className="grid gap-4 py-8 first:pt-0 last:pb-0 scroll-mt-24 md:grid-cols-[220px_minmax(0,42rem)] md:gap-12"
    >
      <div>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {description && <p className="mt-1 text-sm text-foreground-muted">{description}</p>}
      </div>
      <div className="min-w-0 space-y-6">{children}</div>
    </section>
  );
}
