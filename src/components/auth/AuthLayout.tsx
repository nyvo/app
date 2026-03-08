import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Infinity, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { authPageVariants, authPageTransition } from '@/lib/motion'
import { cn } from '@/lib/utils'
import type { AuthContext } from '@/lib/auth-routes'

interface AuthLayoutProps {
  /** Hard context boundary — never optional */
  context: AuthContext
  title: string
  subtitle?: string
  /** Back button destination. Must match context system. */
  backTo?: string
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
  backTo,
  footer,
  customContent,
  children,
}: AuthLayoutProps) {
  const isStudent = context === 'student'

  return (
    <div className={cn(
      "min-h-screen w-full text-text-primary font-geist antialiased flex flex-col selection:bg-zinc-200 selection:text-zinc-900",
      isStudent ? "theme-public bg-public-sand" : "bg-surface"
    )}>
      {/* Header */}
      <header className="w-full pt-8 pb-4 px-6 flex items-center justify-between z-50 max-w-6xl mx-auto">
        <div className="w-24">
          {backTo ? (
            <Button
              variant="outline-soft"
              size="sm"
              className="text-text-secondary hover:text-text-primary"
              asChild
            >
              <Link to={backTo}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Tilbake
              </Link>
            </Button>
          ) : null}
        </div>

        <Link to="/" className="flex items-center gap-2 select-none">
          <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center text-white">
            <Infinity className="w-3.5 h-3.5" />
          </div>
          <span className="text-lg font-medium tracking-tighter text-text-primary">
            Ease
          </span>
        </Link>

        <div className="w-24" />
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
              <h1 className="text-2xl font-medium tracking-tight text-text-primary">
                {title}
              </h1>
              {subtitle && (
                <p className="text-text-secondary text-sm">{subtitle}</p>
              )}
            </div>

            {children}
          </motion.div>
        )}
      </main>

      {/* Footer */}
      {footer && (
        <footer className="py-6 text-center border-t border-border bg-surface">
          {footer}
        </footer>
      )}
    </div>
  )
}
