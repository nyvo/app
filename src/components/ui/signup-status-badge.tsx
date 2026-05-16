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
  if (status === 'cancelled')           return { variant: 'neutral',     label: 'Avbestilt' };
  if (status === 'course_cancelled')    return { variant: 'warning',     label: 'Kurs avlyst' };
  if (payment === 'failed')             return { variant: 'destructive', label: 'Betaling feilet' };
  if (payment === 'pending')            return { variant: 'warning',     label: 'Venter betaling' };
  return { variant: 'success', label: 'Påmeldt' };
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
