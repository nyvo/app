import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { authPageVariants, authPageTransition } from '@/lib/motion'

interface AuthLayoutProps {
  title: string
  subtitle?: string
  /** Footer content slot */
  footer?: React.ReactNode
  /** Replace the default heading + motion wrapper with a custom content block */
  customContent?: boolean
  children: React.ReactNode
}

/**
 * Auth surface shell — centered single-column form at max-w-md.
 * Per studio-design § 21.3: no card chrome around the form, no sidebar,
 * logo top, title left-aligned, single column.
 */
export function AuthLayout({
  title,
  subtitle,
  footer,
  customContent,
  children,
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen w-full text-foreground antialiased flex flex-col bg-background selection:bg-muted selection:text-foreground">
      <header className="w-full pt-8 pb-4 px-6 flex items-center justify-center z-50 max-w-6xl mx-auto">
        <Link to="/" className="flex items-center select-none mx-auto">
          <span className="text-base font-medium text-foreground">
            Openspot
          </span>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12 sm:px-6">
        <motion.div
          variants={authPageVariants}
          initial="initial"
          animate="animate"
          transition={authPageTransition}
          className="w-full max-w-md"
        >
          {customContent ? (
            <div className="flex flex-col items-center">
              {children}
            </div>
          ) : (
            <div className="flex flex-col">
              <div className="mb-8 space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-sm text-foreground-muted">{subtitle}</p>
                )}
              </div>

              {children}
            </div>
          )}
        </motion.div>
      </main>

      {footer && (
        <footer className="py-6 text-center bg-background">
          {footer}
        </footer>
      )}
    </div>
  )
}
