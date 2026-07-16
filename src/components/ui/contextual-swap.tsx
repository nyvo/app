import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

import { cn } from '@/lib/utils'

interface ContextualSwapProps {
  active: boolean
  activeContent: ReactNode
  inactiveContent: ReactNode
  className?: string
  contentClassName?: string
}

const hiddenState = {
  opacity: 0,
  scale: 0.25,
  filter: 'blur(4px)',
}

const visibleState = {
  opacity: 1,
  scale: 1,
  filter: 'blur(0px)',
}

const transition = {
  type: 'spring' as const,
  duration: 0.3,
  bounce: 0,
}

/**
 * Motion-safe state swap that reserves space for both contents, preventing
 * label or icon changes from shifting nearby controls.
 */
function ContextualSwap({
  active,
  activeContent,
  inactiveContent,
  className,
  contentClassName,
}: ContextualSwapProps) {
  const shouldReduceMotion = useReducedMotion()
  const resolvedTransition = shouldReduceMotion ? { duration: 0 } : transition

  return (
    <span className={cn('grid', className)}>
      <motion.span
        initial={false}
        animate={active ? visibleState : hiddenState}
        transition={resolvedTransition}
        aria-hidden={!active || undefined}
        data-state={active ? 'visible' : 'hidden'}
        className={cn(
          'inline-flex items-center [grid-area:1/1]',
          !active && 'pointer-events-none',
          contentClassName,
        )}
      >
        {activeContent}
      </motion.span>
      <motion.span
        initial={false}
        animate={active ? hiddenState : visibleState}
        transition={resolvedTransition}
        aria-hidden={active || undefined}
        data-state={active ? 'hidden' : 'visible'}
        className={cn(
          'inline-flex items-center [grid-area:1/1]',
          active && 'pointer-events-none',
          contentClassName,
        )}
      >
        {inactiveContent}
      </motion.span>
    </span>
  )
}

export { ContextualSwap }
export type { ContextualSwapProps }
