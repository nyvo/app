import { Badge, type badgeVariants } from './badge';
import type { VariantProps } from 'class-variance-authority';
import type { SignupStatus, PaymentStatus } from '@/types/database';

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;

interface SignupStatusBadgeProps {
  status: SignupStatus;
  paymentStatus: PaymentStatus;
  size?: 'sm' | 'md';
  className?: string;
}

function derive(status: SignupStatus, payment: PaymentStatus): { variant: BadgeVariant; label: string } {
  if (payment === 'refunded')           return { variant: 'neutral',     label: 'Refundert' };
  // Defensive: signups are minted directly as confirmed+paid by
  // create_signup_if_available, so a live signup normally never carries
  // 'pending'/'failed' payment — but a bad row (or a future flow) shouldn't
  // silently read as "Påmeldt", so both get their own explicit state.
  if (payment === 'pending')            return { variant: 'warning',     label: 'Venter på betaling' };
  if (payment === 'failed')             return { variant: 'destructive', label: 'Betaling feilet' };
  if (status === 'cancelled')           return { variant: 'neutral',     label: 'Avbestilt' };
  if (status === 'course_cancelled')    return { variant: 'warning', label: 'Kurs avlyst' };
  // 'paid' and null (legitimate for free signups) are the common case.
  // 'external' (free-tier / in-person) is unpaid by design and also falls
  // through here; that arrangement shows in the payment details.
  if (payment === 'paid' || payment === 'external' || payment === null) {
    return { variant: 'success', label: 'Påmeldt' };
  }
  // Unrecognized payment value from the server — show it rather than lie.
  return { variant: 'neutral', label: payment };
}

/**
 * SignupStatusBadge — combined signup + payment state, derived.
 * Payment state takes precedence over signup state when there's a conflict
 * (a refunded cancellation reads as "Refundert", not "Avbestilt").
 */
export function SignupStatusBadge({ status, paymentStatus, size = 'sm', className }: SignupStatusBadgeProps) {
  const { variant, label } = derive(status, paymentStatus);
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
