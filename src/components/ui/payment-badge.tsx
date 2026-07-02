import { Badge, type badgeVariants } from './badge';
import type { VariantProps } from 'class-variance-authority';
import type { PaymentStatus } from '@/types/database';

export type { PaymentStatus };
export type PaymentVisibility = 'always' | 'exceptions';

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;

const config: Record<PaymentStatus, { variant: BadgeVariant; label: string }> = {
  paid:     { variant: 'success',     label: 'Betalt' },
  pending:  { variant: 'warning',     label: 'Venter betaling' },
  failed:   { variant: 'destructive', label: 'Betaling feilet' },
  refunded: { variant: 'neutral',     label: 'Refundert' },
  // Historical only: the off-platform payment path is deleted (all paid
  // bookings go through Stripe) and 'external' can no longer be minted. The
  // entry stays because the DB enum keeps the value for old rows.
  external: { variant: 'neutral',     label: 'Betales direkte' },
};

interface PaymentBadgeProps {
  status: PaymentStatus;
  size?: 'sm' | 'md';
  customLabel?: string;
  className?: string;
  /**
   * Controls visibility:
   * - "exceptions" (default): renders NOTHING when status is "paid" — silent success in admin views
   * - "always": renders all statuses including "Betalt" — use in student-facing confirmations
   */
  visibility?: PaymentVisibility;
}

/**
 * PaymentBadge — for payment status in teacher/admin contexts.
 * Defaults to silent on "paid" so problem states stand out in dense lists.
 */
export function PaymentBadge({
  status,
  size = 'sm',
  customLabel,
  className,
  visibility = 'exceptions',
}: PaymentBadgeProps) {
  if (visibility === 'exceptions' && status === 'paid') return null;

  const { variant, label } = config[status];
  return (
    <Badge
      variant={variant}
      shape="pill"
      size={size}
      className={className}
      role="status"
      aria-label={`Betaling: ${customLabel || label}`}
    >
      {customLabel || label}
    </Badge>
  );
}
