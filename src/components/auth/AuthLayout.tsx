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
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground antialiased selection:bg-muted selection:text-foreground">
      <header className="flex w-full items-center justify-center px-4 py-8 sm:px-6">
        <Link to="/" className="flex select-none items-center">
          <span className="text-base font-medium text-foreground">
            Openspot
          </span>
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
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
              <div className="mb-8 space-y-2 text-center">
                <h1 className="text-2xl font-medium tracking-tight text-foreground">
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
        <footer className="py-8 text-center">
          {footer}
        </footer>
      )}
    </div>
  )
}
