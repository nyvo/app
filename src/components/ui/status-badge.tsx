import { Badge, type badgeVariants } from './badge';
import type { VariantProps } from 'class-variance-authority';
import type { SignupStatus } from '@/types/database';
import { cn } from '@/lib/utils';

export type { SignupStatus };
export type CourseStatus = 'draft' | 'active' | 'upcoming' | 'completed' | 'cancelled' | 'full';
export type BadgeStatus = SignupStatus | CourseStatus;

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;

const config: Record<BadgeStatus, { variant: BadgeVariant; label: string; className?: string }> = {
  confirmed:        { variant: 'success', label: 'Påmeldt' },
  // Cancelled is a resolved state, not an alarm — muted with strikethrough, not red.
  cancelled:        { variant: 'neutral', label: 'Avlyst', className: 'line-through' },
  course_cancelled: { variant: 'warning', label: 'Kurs avlyst' },
  draft:            { variant: 'neutral', label: 'Utkast' },
  active:           { variant: 'success', label: 'Pågår' },
  upcoming:         { variant: 'info', label: 'Kommende' },
  full:             { variant: 'warning', label: 'Fullt' },
  completed:        { variant: 'neutral', label: 'Fullført' },
};

interface StatusBadgeProps {
  status: BadgeStatus;
  size?: 'sm' | 'md';
  customLabel?: string;
  className?: string;
}

/**
 * StatusBadge — for course and generic signup status in tables / list rows.
 * Pill shape system-wide; size + color do the work of distinguishing status
 * badges from decorative meta. Modern dashboards (Stripe, Linear, Shopify,
 * GitHub) all converged on pill for status — Studio follows.
 * For combined signup+payment state, use SignupStatusBadge. For payment state alone, use PaymentBadge.
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
