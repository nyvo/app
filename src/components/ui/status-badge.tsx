import { Badge, type badgeVariants } from './badge';
import type { VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Mirrors the course_status DB enum, kept honest by reconcile_course_lifecycle.
export type CourseStatus = 'draft' | 'active' | 'upcoming' | 'completed' | 'cancelled';

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;

const config: Record<CourseStatus, { variant: BadgeVariant; label: string; className?: string }> = {
  draft:     { variant: 'neutral', label: 'Utkast' },
  upcoming:  { variant: 'info', label: 'Kommende' },
  active:    { variant: 'success', label: 'Pågår' },
  completed: { variant: 'neutral', label: 'Fullført' },
  // Cancelled is a resolved state, not an alarm — muted with strikethrough, not red.
  cancelled: { variant: 'neutral', label: 'Avlyst', className: 'line-through' },
};

interface StatusBadgeProps {
  status: CourseStatus;
  size?: 'sm' | 'md';
  customLabel?: string;
  className?: string;
}

/**
 * StatusBadge — course status only, in headers / tables / list rows.
 * Pill shape system-wide; size + color do the work of distinguishing status
 * badges from decorative meta. Modern dashboards (Stripe, Linear, Shopify,
 * GitHub) all converged on pill for status — Studio follows.
 * For signup state use SignupStatusBadge; for payment state alone, PaymentBadge.
 */
export function StatusBadge({ status, size = 'sm', customLabel, className }: StatusBadgeProps) {
  const { variant, label, className: statusClassName } = config[status];
  return (
    <Badge
      variant={variant}
      shape="pill"
      size={size}
      className={cn(statusClassName, className)}
      role="status"
      aria-label={`Status: ${customLabel || label}`}
    >
      {customLabel || label}
    </Badge>
  );
}
