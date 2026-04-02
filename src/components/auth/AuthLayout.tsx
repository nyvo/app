import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Infinity } from 'lucide-react'
import { authPageVariants, authPageTransition } from '@/lib/motion'
import { cn } from '@/lib/utils'
import type { AuthContext } from '@/lib/auth-routes'

interface AuthLayoutProps {
  /** Hard context boundary — never optional */
  context: AuthContext
  title: string
  subtitle?: string
  /** Footer content slot */
  footer?: React.ReactNode
  /** Replace the default heading + motion wrapper with a custom content block */
  customContent?: boolean
  children: React.ReactNode
}

/**
 * Shared auth page shell. Provides consistent layout, branding, and motion
 * across teacher and student auth flows.
 *
 * Does NOT: make routing decisions, check auth state, redirect,
 * or render context-dependent UI.
 */
export function AuthLayout({
  context,
  title,
  subtitle,
  footer,
  customContent,
  children,
}: AuthLayoutProps) {
  const isStudent = context === 'student'

  return (
    <div className={cn(
      "min-h-screen w-full text-foreground antialiased flex flex-col selection:bg-surface-muted selection:text-foreground",
      isStudent ? "bg-background" : "bg-background"
    )}>
      {/* Header */}
      <header className="w-full pt-8 pb-4 px-6 flex items-center justify-center z-50 max-w-6xl mx-auto">
        <Link to="/" className="flex items-center gap-2 select-none mx-auto">
          <div className="size-6 bg-primary rounded-md flex items-center justify-center text-primary-foreground">
            <Infinity className="w-3.5 h-3.5" />
          </div>
          <span className="type-title text-foreground">
            Ease
          </span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 w-full max-w-sm mx-auto py-12">
        {customContent ? (
          <motion.div
            variants={authPageVariants}
            initial="initial"
            animate="animate"
            transition={authPageTransition}
            className="w-full flex flex-col items-center"
          >
            {children}
          </motion.div>
        ) : (
          <motion.div
            variants={authPageVariants}
            initial="initial"
            animate="animate"
            transition={authPageTransition}
            className="w-full flex flex-col items-center"
          >
            <div className="text-center mb-8 space-y-2 w-full">
              <h1 className="type-heading-1 text-foreground">
                {title}
              </h1>
              {subtitle && (
                <p className="type-body text-muted-foreground">{subtitle}</p>
              )}
            </div>

            {children}
          </motion.div>
        )}
      </main>

      {/* Footer */}
      {footer && (
        <footer className="py-6 text-center border-t border-border bg-background">
          {footer}
        </footer>
      )}
    </div>
  )
}
