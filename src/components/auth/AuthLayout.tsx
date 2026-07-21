import { Link } from 'react-router-dom'

import { UpNextLogo } from '@/components/ui/upnext-logo'

interface AuthLayoutProps {
  title: string
  subtitle?: string
  /** Footer content slot */
  footer?: React.ReactNode
  /** Replace the default heading + motion wrapper with a custom content block */
  customContent?: boolean
  /** Notice slot rendered above the logo (e.g. in-app-browser nudge) */
  banner?: React.ReactNode
  children: React.ReactNode
}

/**
 * Auth surface shell — centered single-column form at max-w-md.
 * Per studio-design § 21.3: no card chrome around the form, no sidebar,
 * logo mark directly above the form (not a page header), single column.
 */
export function AuthLayout({
  title,
  subtitle,
  footer,
  customContent,
  banner,
  children,
}: AuthLayoutProps) {
  return (
    <div className="flex min-h-dvh w-full flex-col bg-background text-foreground antialiased selection:bg-muted selection:text-foreground">
      <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-2 duration-300">
          {banner}
          <div className="mb-6 flex justify-center">
            <Link to="/" aria-label="UpNext">
              <UpNextLogo />
            </Link>
          </div>
          {customContent ? (
            // min-height keeps multi-step flows (identify → password → code) from
            // re-centering as content height changes; `relative` anchors a step's
            // floating back arrow so it doesn't push the heading down.
            <div className="relative flex min-h-96 flex-col items-center">
              {children}
            </div>
          ) : (
            <div className="flex flex-col">
              <div className="mb-8 space-y-2 text-center">
                <h1 className="text-2xl font-medium text-foreground">
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-base text-foreground-muted">{subtitle}</p>
                )}
              </div>

              {children}
            </div>
          )}
        </div>
      </main>

      {footer && (
        <footer className="py-8 text-center">
          {footer}
        </footer>
      )}
    </div>
  )
}
