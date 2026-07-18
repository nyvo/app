import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

/**
 * Shared frame for every `/dev/*` preview. Gives each page a consistent header
 * (title + "back to index" link) and a container, so the gallery reads as one
 * system and every preview is one click from the `/dev` hub.
 *
 * Previews render REAL production components fed mock/empty/error/loading props
 * — never hand-rolled copies. Wrap each state in <PreviewSection label="…">.
 */
export function DevPage({
  title,
  description,
  children,
  /** Opt out of the max-width container for full-bleed page mounts. */
  bleed = false,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  bleed?: boolean;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border-subtle bg-background/80 px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-1">
          <Link
            to="/dev"
            className="w-fit text-sm text-foreground-muted transition-colors hover:text-foreground"
          >
            ← Alle previews
          </Link>
          <h1 className="text-lg font-medium text-foreground">{title}</h1>
          {description ? (
            <p className="max-w-2xl text-sm text-foreground-muted">{description}</p>
          ) : null}
        </div>
      </header>
      {bleed ? (
        children
      ) : (
        <div className="mx-auto w-full max-w-6xl space-y-14 px-4 py-10 sm:px-6">{children}</div>
      )}
    </div>
  );
}

/**
 * One labelled state within a preview (e.g. "Med data", "Tomt", "Laster",
 * "Feil"). The neutral badge is the state's caption; children are the real
 * component in that state.
 */
export function PreviewSection({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        {/* max-w + truncate: long scenario captions must not widen the page
            past narrow preview viewports (Badge is whitespace-nowrap). */}
        <Badge variant="neutral" size="sm" className="max-w-full truncate">
          {label}
        </Badge>
        {description ? (
          <p className="text-sm text-foreground-muted">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
