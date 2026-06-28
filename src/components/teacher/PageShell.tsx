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
 * Layout doctrine (per studio-design `patterns.md` § 17.2):
 *
 *  - **Outer shell is always `max-w-6xl`** (1152px). No second outer tier.
 *    Pages do not jump horizontally between dense and sparse routes.
 *
 *  - **Inner shell** is opt-in via the `narrow` prop. The inner wrapper
 *    contains EVERYTHING — header, tabs, and children — so the title and
 *    action stay visually attached to the narrow content (rather than the
 *    header sprawling to the outer shell while the form sits centered).
 *
 *      - `narrow` omitted → `w-full` (default for data/list pages)
 *      - `narrow="centered"` → `mx-auto max-w-3xl` (self-contained form/help/
 *        payment pages with no adjacent context)
 *      - `narrow="left"` → `max-w-3xl` (narrow content alongside tabs / preview
 *        / supporting context — rarely needed at the PageShell level since most
 *        such cases handle the inner constraint inside their tab component)
 */

interface PageShellProps {
  /** Required page title — renders as h1. */
  title: string;
  /** Optional subtitle below the title — a string or a rich node (e.g. a meta row). */
  description?: ReactNode;
  /** Optional inline badge next to the title (status, count, etc). */
  badge?: ReactNode;
  /** Optional primary action right-aligned in the header row. */
  action?: ReactNode;
  /** Optional tab strip (e.g. <PageTabs>) — rendered between header and content. */
  tabs?: ReactNode;
  /**
   * Optional inner-width constraint inside the canonical outer max-w-6xl shell.
   *  - omitted   → full width (data/list pages)
   *  - 'centered'→ self-contained form/help/payment pages
   *  - 'left'    → narrow content adjacent to tabs/preview/context
   */
  narrow?: 'centered' | 'left';
  /** Set to false to skip motion wrapper (rare). */
  animate?: boolean;
  /** Override outer className if a page needs custom bottom padding etc. */
  className?: string;
  children: ReactNode;
}

const narrowClass = {
  centered: 'mx-auto max-w-3xl',
  left: 'max-w-3xl',
} as const;

export function PageShell({
  title,
  description,
  badge,
  action,
  tabs,
  narrow,
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
        'mx-auto w-full max-w-6xl px-4 pb-24 pt-6 sm:px-6 md:pb-12 lg:px-8 lg:pt-12',
        className,
      )}
    >
      <div className={cn('w-full', narrow && narrowClass[narrow])}>
        <header className={cn('mb-8', description && 'mb-10')}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap min-w-0">
              <h1 className="text-2xl font-medium text-foreground">
                {title}
              </h1>
              {badge && <span className="shrink-0">{badge}</span>}
            </div>
            {action && <div className="shrink-0">{action}</div>}
          </div>
          {description && (
            <div className="mt-2 text-base text-foreground-muted">{description}</div>
          )}
        </header>

        {tabs && <div className="mb-8">{tabs}</div>}

        {children}
      </div>
    </Container>
  );
}
