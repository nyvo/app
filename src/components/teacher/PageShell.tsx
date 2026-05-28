import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { pageTransition, pageVariants } from '@/lib/motion';
import { cn } from '@/lib/utils';

/**
 * Shared page shell for teacher-facing dashboard pages. Owns the outer
 * container width, horizontal padding, top/bottom spacing, page header
 * (title + optional description / status badge / primary action), and the
 * spacing between header → tabs → content.
 *
 * Width tiers (decided 2026-05-27):
 *  - `data`: full shell width — list pages, dashboards, tables, grids
 *  - `form`: max-w-3xl inner content — settings, profile, single-column forms
 *
 * The outer shell always uses the same max-w-7xl dashboard rail so page
 * titles/tabs do not jump horizontally between dense and sparse pages.
 * Pages with wide tabs but narrow tab content (e.g. Studio · Profil) keep
 * `width="data"` and constrain the inner tab content separately.
 */

type Width = 'data' | 'form';

interface PageShellProps {
  /** Inner content cap. `data` = full shell width, `form` = max-w-3xl. */
  width?: Width;
  /** Required page title — renders as h1. */
  title: string;
  /** Optional one-line subtitle below the title. */
  description?: string;
  /** Optional inline badge next to the title (status, count, etc). */
  badge?: ReactNode;
  /** Optional primary action right-aligned in the header row. */
  action?: ReactNode;
  /** Optional tab strip (e.g. <PageTabs>) — rendered between header and content. */
  tabs?: ReactNode;
  /** Set to false to skip motion wrapper (rare). */
  animate?: boolean;
  /** Override outer className if a page needs custom bottom padding etc. */
  className?: string;
  children: ReactNode;
}

const contentWidthClass: Record<Width, string> = {
  data: 'w-full',
  form: 'max-w-3xl',
};

export function PageShell({
  width = 'data',
  title,
  description,
  badge,
  action,
  tabs,
  animate = true,
  className,
  children,
}: PageShellProps) {
  const Container = animate ? motion.div : 'div';
  const motionProps = animate
    ? {
        variants: pageVariants,
        initial: 'initial' as const,
        animate: 'animate' as const,
        transition: pageTransition,
      }
    : {};

  return (
    <Container
      {...motionProps}
      className={cn(
        'mx-auto w-full max-w-7xl px-4 pb-24 pt-6 sm:px-6 md:pb-12 lg:px-8 lg:pt-12',
        className,
      )}
    >
      <div className={cn('w-full', contentWidthClass[width])}>
        <header className={cn('mb-8', description && 'mb-10')}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-baseline gap-3 flex-wrap min-w-0">
              <h1 className="text-2xl font-medium tracking-tight text-foreground">
                {title}
              </h1>
              {badge && <span className="shrink-0">{badge}</span>}
            </div>
            {action && <div className="shrink-0">{action}</div>}
          </div>
          {description && (
            <p className="mt-2 text-base text-foreground-muted">{description}</p>
          )}
        </header>

        {tabs && <div className="mb-8">{tabs}</div>}

        {children}
      </div>
    </Container>
  );
}
