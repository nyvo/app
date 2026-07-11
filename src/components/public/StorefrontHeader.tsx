import { useState } from 'react';
import { Link } from 'react-router-dom';

interface StorefrontHeaderProps {
  /** Studio display name. While unknown (loading, error states) the header
   *  renders an empty spacer of the same height — never the platform brand. */
  name?: string | null;
  /** Storefront slug — the lockup links back to the storefront. */
  slug?: string | null;
  logoUrl?: string | null;
}

/** «FY»-style initials: first letter of the first two words. */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join('');
}

/**
 * White-label funnel header (course detail, checkout, receipt): the studio's
 * compact lockup, centered — the buyer stays inside the studio's brand
 * through the whole funnel. The platform wordmark appears nowhere on
 * storefront-scoped pages (white-label decision, applied 2026-07-11).
 */
export function StorefrontHeader({ name, slug, logoUrl }: StorefrontHeaderProps) {
  const [logoFailed, setLogoFailed] = useState(false);

  const lockup = name ? (
    <>
      <span className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
        {logoUrl && !logoFailed ? (
          <img
            src={logoUrl}
            alt=""
            className="size-full object-cover"
            onError={() => setLogoFailed(true)}
          />
        ) : (
          <span className="text-[11px] font-medium text-foreground-muted">{initials(name)}</span>
        )}
      </span>
      <span className="truncate text-base font-medium text-foreground">{name}</span>
    </>
  ) : null;

  return (
    <header className="flex w-full items-center justify-center px-4 py-8 sm:px-6">
      {name && slug ? (
        <Link to={`/${slug}`} className="flex h-7 min-w-0 select-none items-center gap-2.5">
          {lockup}
        </Link>
      ) : (
        <span className="flex h-7 min-w-0 select-none items-center gap-2.5">{lockup}</span>
      )}
    </header>
  );
}
