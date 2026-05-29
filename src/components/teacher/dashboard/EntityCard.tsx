import { Link } from 'react-router-dom'
import { ExternalLink } from '@/lib/icons'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface EntityCardAction {
  key: string
  label: string
  /** Internal route — renders as `<Link>`. */
  to?: string
  onClick?: () => void
}

interface EntityCardProps {
  title: string
  subtitle?: string
  /** Tertiary line below the subtitle, e.g. "Sist endret 5. feb 2026". */
  meta?: string
  imageUrl?: string | null
  imageAlt?: string
  /** Pill actions rendered along the bottom. Studio bans icons in text-bearing buttons — label only. */
  actions?: EntityCardAction[]
  /** External href — renders an icon-only "open in new tab" button in the bottom-right. */
  externalHref?: string
  externalLabel?: string
  /**
   * If set, the entire card becomes a clickable `<Link>` to this route and the
   * footer (actions + external link) is suppressed — the whole card IS the
   * affordance. Use this for the compact variant in narrow columns or grids.
   */
  to?: string
  className?: string
}

/**
 * Generic dashboard entity card — title + subtitle + meta on the right of a
 * square image, with optional pill actions and an external-link icon along
 * the bottom. Modeled on Hashnode's workspace card but with the image moved
 * to the leading edge so the title aligns to a consistent column.
 */
export function EntityCard({
  title,
  subtitle,
  meta,
  imageUrl,
  imageAlt,
  actions,
  externalHref,
  externalLabel = 'Åpne i ny fane',
  to,
  className,
}: EntityCardProps) {
  const hasFooter = !to && ((actions && actions.length > 0) || !!externalHref)

  const body = (
    <>
      <div className="flex items-start gap-4">
        <div className="size-12 shrink-0 overflow-hidden rounded-md bg-muted">
          {imageUrl ? (
            <img src={imageUrl} alt={imageAlt ?? ''} className="size-full object-cover" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-medium text-foreground">{title}</h3>
          {subtitle && (
            <p className="truncate text-base text-foreground-muted">{subtitle}</p>
          )}
          {meta && <p className="mt-3 text-base text-foreground-muted">{meta}</p>}
        </div>
      </div>
    </>
  )

  if (to) {
    return (
      <Link
        to={to}
        className={cn(
          'block rounded-xl border border-border bg-background p-6 no-underline outline-none transition-colors duration-150',
          'hover:border-foreground/15 focus-visible:ring-2 focus-visible:ring-foreground/15',
          className,
        )}
      >
        {body}
      </Link>
    )
  }

  return (
    <section className={cn('rounded-xl border border-border bg-background p-6', className)}>
      {body}

      {hasFooter && (
        <>
          <div className="-mx-6 mt-6 border-t border-border" aria-hidden="true" />
          <div className="mt-6 flex items-center gap-2">
            {actions?.map((action) =>
            action.to ? (
              <Button key={action.key} asChild variant="secondary">
                <Link to={action.to}>{action.label}</Link>
              </Button>
            ) : (
              <Button
                key={action.key}
                type="button"
                variant="secondary"
                onClick={action.onClick}
              >
                {action.label}
              </Button>
            ),
          )}
            {externalHref && (
              <a
                href={externalHref}
                target="_blank"
                rel="noreferrer noopener"
                aria-label={externalLabel}
                className="ml-auto inline-flex size-8 items-center justify-center rounded-full text-foreground-muted outline-none transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-foreground/15"
              >
                <ExternalLink className="size-4" />
              </a>
            )}
          </div>
        </>
      )}
    </section>
  )
}
