import { Badge, type badgeVariants } from './badge';
import type { VariantProps } from 'class-variance-authority';
import type { SignupStatus } from '@/types/database';

export type { SignupStatus };
export type CourseStatus = 'draft' | 'active' | 'upcoming' | 'completed' | 'cancelled' | 'full';
export type BadgeStatus = SignupStatus | CourseStatus;

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;

const config: Record<BadgeStatus, { variant: BadgeVariant; label: string }> = {
  confirmed:        { variant: 'success', label: 'Påmeldt' },
  cancelled:        { variant: 'neutral', label: 'Avlyst' },
  course_cancelled: { variant: 'warning', label: 'Kurs avlyst' },
  draft:            { variant: 'neutral', label: 'Utkast' },
  active:           { variant: 'success', label: 'Pågår' },
  upcoming:         { variant: 'neutral', label: 'Kommende' },
  full:             { variant: 'neutral', label: 'Fullt' },
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
  const { variant, label } = config[status];
  return (
    <Badge
      variant={variant}
      shape="pill"
      size={size}
      className={className}
      role="status"
      aria-label={`Status: ${customLabel || label}`}
    >
      {customLabel || label}
    </Badge>
  );
}
