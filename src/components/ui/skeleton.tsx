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
 * SkeletonText - Text line skeleton with natural text proportions
 */
interface SkeletonTextProps extends React.ComponentProps<'div'> {
  lines?: number
  widths?: ('full' | 'three-quarter' | 'half' | 'third')[]
}

const widthClasses = {
  'full': 'w-full',
  'three-quarter': 'w-3/4',
  'half': 'w-1/2',
  'third': 'w-1/3',
}

function SkeletonText({ className, lines = 1, widths, ...props }: SkeletonTextProps) {
  const defaultWidths: ('full' | 'three-quarter' | 'half' | 'third')[] =
    lines === 1 ? ['three-quarter'] :
    lines === 2 ? ['full', 'half'] :
    Array(lines).fill('full').map((_, i) => i === lines - 1 ? 'half' : 'full') as ('full' | 'three-quarter' | 'half' | 'third')[]

  const resolvedWidths = widths || defaultWidths

  return (
    <div className={cn('space-y-2', className)} {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn('h-4', widthClasses[resolvedWidths[i] || 'full'])}
        />
      ))}
    </div>
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
interface SkeletonCardProps extends React.ComponentProps<'div'> {
  variant?: 'default' | 'dark'
}

function SkeletonCard({ className, variant = 'default', ...props }: SkeletonCardProps) {
  return (
    <div
      className={cn(
        'rounded-3xl border animate-pulse',
        variant === 'dark'
          ? 'bg-gray-900 border-gray-800'
          : 'bg-white border-gray-200',
        className
      )}
      aria-hidden="true"
      {...props}
    />
  )
}

/**
 * SkeletonListItem - List item with avatar, text lines
 */
interface SkeletonListItemProps extends React.ComponentProps<'div'> {
  hasAvatar?: boolean
  lines?: 1 | 2
  hasAction?: boolean
}

function SkeletonListItem({
  className,
  hasAvatar = true,
  lines = 2,
  hasAction = false,
  ...props
}: SkeletonListItemProps) {
  return (
    <div
      className={cn('flex items-center gap-3 p-3', className)}
      aria-hidden="true"
      {...props}
    >
      {hasAvatar && <SkeletonAvatar size="md" />}
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        {lines === 2 && <Skeleton className="h-3 w-1/2" />}
      </div>
      {hasAction && <Skeleton className="h-6 w-12 rounded-md" />}
    </div>
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
      className={cn('border-b border-gray-100', className)}
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

/**
 * SkeletonStatsCard - Stats card skeleton matching StatsCards component
 */
interface SkeletonStatsCardProps extends React.ComponentProps<'div'> {
  hasIcon?: boolean
  hasTrend?: boolean
}

function SkeletonStatsCard({
  className,
  hasIcon = true,
  hasTrend = true,
  ...props
}: SkeletonStatsCardProps) {
  return (
    <div
      className={cn(
        'rounded-3xl bg-white border border-gray-200 p-6',
        className
      )}
      aria-hidden="true"
      {...props}
    >
      <div className="flex items-start justify-between mb-4">
        <Skeleton className="h-3 w-20" />
        {hasIcon && <Skeleton className="h-5 w-5 rounded-md" />}
      </div>
      <div className="space-y-2">
        <Skeleton className="h-8 w-16" />
        {hasTrend && <Skeleton className="h-3 w-24" />}
      </div>
    </div>
  )
}

/**
 * SkeletonStatsGrid - Grid of stats card skeletons
 */
interface SkeletonStatsGridProps {
  count?: number
  className?: string
}

function SkeletonStatsGrid({ count = 3, className }: SkeletonStatsGridProps) {
  return (
    <div className={cn('grid grid-cols-1 gap-4 md:grid-cols-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonStatsCard key={i} />
      ))}
    </div>
  )
}

/**
 * SkeletonCourseCard - Course list item skeleton
 */
function SkeletonCourseCard({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'rounded-3xl bg-white border border-gray-200 p-6',
        className
      )}
      aria-hidden="true"
      {...props}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="space-y-2">
          <Skeleton className="h-5 w-48" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <div className="flex items-center gap-4">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  )
}

/**
 * SkeletonCourseList - List of course card skeletons
 */
interface SkeletonCourseListProps {
  count?: number
  className?: string
}

function SkeletonCourseList({ count = 3, className }: SkeletonCourseListProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCourseCard key={i} />
      ))}
    </div>
  )
}

export {
  Skeleton,
  SkeletonText,
  SkeletonAvatar,
  SkeletonCard,
  SkeletonListItem,
  SkeletonTableRow,
  SkeletonTableRows,
  SkeletonStatsCard,
  SkeletonStatsGrid,
  SkeletonCourseCard,
  SkeletonCourseList,
}
