import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Skeleton component for loading states
 * Uses design system tokens - bg-surface-elevated for consistent theming
 *
 * Usage:
 *   <Skeleton className="h-4 w-32" /> - Text line
 *   <Skeleton className="h-10 w-10 rounded-full" /> - Avatar
 *   <Skeleton className="h-[200px] w-full rounded-xl" /> - Card
 */
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn('bg-surface-elevated animate-pulse rounded-md', className)}
      aria-hidden="true"
      {...props}
    />
  )
}

/**
 * SkeletonAvatar - Circular skeleton for avatars
 */
interface SkeletonAvatarProps extends React.ComponentProps<'div'> {
  size?: 'sm' | 'md' | 'lg'
}

const avatarSizes = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
}

function SkeletonAvatar({ className, size = 'md', ...props }: SkeletonAvatarProps) {
  return (
    <Skeleton
      className={cn('rounded-full', avatarSizes[size], className)}
      {...props}
    />
  )
}

/**
 * SkeletonCard - Card-shaped skeleton matching design system cards
 */
function SkeletonCard({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'rounded-2xl border animate-pulse bg-white border-zinc-200',
        className
      )}
      aria-hidden="true"
      {...props}
    />
  )
}

/**
 * SkeletonTableRow - Table row skeleton matching our table design
 */
interface SkeletonTableRowProps extends React.ComponentProps<'tr'> {
  columns?: number
  hasAvatar?: boolean
}

function SkeletonTableRow({
  className,
  columns = 4,
  hasAvatar = true,
  ...props
}: SkeletonTableRowProps) {
  return (
    <tr
      className={cn('border-b border-zinc-100', className)}
      aria-hidden="true"
      {...props}
    >
      {/* First column - participant with avatar */}
      <td className="py-4 px-6">
        <div className="flex items-center gap-3">
          {hasAvatar && <SkeletonAvatar size="md" />}
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
      </td>
      {/* Remaining columns */}
      {Array.from({ length: columns - 1 }).map((_, i) => (
        <td key={i} className="py-4 px-6">
          <Skeleton className="h-4 w-24" />
        </td>
      ))}
    </tr>
  )
}

/**
 * SkeletonTableRows - Multiple table row skeletons
 */
interface SkeletonTableRowsProps {
  rows?: number
  columns?: number
  hasAvatar?: boolean
  className?: string
}

function SkeletonTableRows({
  rows = 5,
  columns = 4,
  hasAvatar = true,
  className
}: SkeletonTableRowsProps) {
  return (
    <tbody className={className}>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonTableRow key={i} columns={columns} hasAvatar={hasAvatar} />
      ))}
    </tbody>
  )
}

export {
  Skeleton,
  SkeletonCard,
  SkeletonTableRow,
  SkeletonTableRows,
}
