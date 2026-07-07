import { Badge, type badgeVariants } from './badge';
import type { VariantProps } from 'class-variance-authority';
import type { SignupStatus, PaymentStatus } from '@/types/database';

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;

interface SignupStatusBadgeProps {
  status: SignupStatus;
  paymentStatus: PaymentStatus;
  /** True when the refund was partial (price adjustment) — the booking stays
   *  confirmed and keeps its spot, so it must not read as a departed
   *  "Refundert" signup. Matches ParticipantDetailDrawer's isPartiallyRefunded. */
  refundIsPartial?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

function derive(
  status: SignupStatus,
  payment: PaymentStatus,
  refundIsPartial?: boolean,
): { variant: BadgeVariant; label: string } {
  if (payment === 'refunded') {
    // A partial refund keeps the booking confirmed — the neutral "Refundert"
    // reads as departed, so it gets its own quiet, non-competing label.
    if (refundIsPartial) return { variant: 'subtle', label: 'Delvis refundert' };
    return { variant: 'neutral', label: 'Refundert' };
  }
  if (status === 'cancelled')           return { variant: 'neutral',     label: 'Avbestilt' };
  if (status === 'course_cancelled')    return { variant: 'warning', label: 'Kurs avlyst' };
  // Signups are minted directly as confirmed+paid by create_signup_if_available
  // (card rows only after the charge is captured; a failed capture cancels the row
  // in the same step). So 'pending' and 'failed' never reach a live signup — no
  // branch for them. 'external' (free-tier / in-person) is unpaid by design and
  // falls through to "Påmeldt"; that arrangement shows in the payment details.
  return { variant: 'success', label: 'Påmeldt' };
}

/**
 * SignupStatusBadge — combined signup + payment state, derived.
 * Payment state takes precedence over signup state when there's a conflict
 * (a refunded cancellation reads as "Refundert", not "Avbestilt").
 */
export function SignupStatusBadge({ status, paymentStatus, refundIsPartial, size = 'sm', className }: SignupStatusBadgeProps) {
  const { variant, label } = derive(status, paymentStatus, refundIsPartial);
  return (
    <Badge
      variant={variant}
      shape="pill"
      size={size}
      className={className}
      role="status"
      aria-label={`Status: ${label}`}
    >
      {label}
    </Badge>
  );
}
