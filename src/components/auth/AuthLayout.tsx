import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Infinity } from '@/lib/icons'
import { authPageVariants, authPageTransition } from '@/lib/motion'
import { Card } from '@/components/ui/card'

interface AuthLayoutProps {
  title: string
  subtitle?: string
  /** Footer content slot */
  footer?: React.ReactNode
  /** Replace the default heading + motion wrapper with a custom content block */
  customContent?: boolean
  children: React.ReactNode
}

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
        <Link to="/" className="flex items-center gap-2 select-none mx-auto">
          <div className="size-6 bg-primary rounded-md flex items-center justify-center text-primary-foreground">
            <Infinity className="w-3.5 h-3.5" />
          </div>
          <span className="text-base font-medium text-foreground">
            Ease
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
          <Card className="border-border bg-card p-6 sm:p-8">
            {customContent ? (
              <div className="flex flex-col items-center">
                {children}
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="mb-8 w-full space-y-2 text-center">
                  <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                    {title}
                  </h1>
                  {subtitle && (
                    <p className="text-sm text-muted-foreground">{subtitle}</p>
                  )}
                </div>

                {children}
              </div>
            )}
          </Card>
        </motion.div>
      </main>

      {footer && (
        <footer className="py-6 text-center border-t border-border bg-background">
          {footer}
        </footer>
      )}
    </div>
  )
}
