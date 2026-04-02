import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

function SkeletonCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-lg border animate-pulse bg-muted border-border", className)}
      aria-hidden="true"
      {...props}
    />
  )
}

interface SkeletonTableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
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
      className={cn("border-b border-border", className)}
      aria-hidden="true"
      {...props}
    >
      <td className="py-4 px-6">
        <div className="flex items-center gap-3">
          {hasAvatar && <Skeleton className="size-10 rounded-full" />}
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
      </td>
      {Array.from({ length: columns - 1 }).map((_, i) => (
        <td key={i} className="py-4 px-6">
          <Skeleton className="h-4 w-24" />
        </td>
      ))}
    </tr>
  )
}

function SkeletonTableRows({
  rows = 5,
  columns = 4,
  hasAvatar = true,
  className,
}: {
  rows?: number
  columns?: number
  hasAvatar?: boolean
  className?: string
}) {
  return (
    <tbody className={className}>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonTableRow key={i} columns={columns} hasAvatar={hasAvatar} />
      ))}
    </tbody>
  )
}

export { Skeleton, SkeletonCard, SkeletonTableRow, SkeletonTableRows }
