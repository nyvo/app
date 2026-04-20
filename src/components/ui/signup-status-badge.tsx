import { StatusIndicator, type IndicatorVariant, type IndicatorSize } from './status-indicator';
import type { SignupStatus, PaymentStatus } from '@/types/database';

interface SignupStatusBadgeProps {
  status: SignupStatus;
  paymentStatus: PaymentStatus;
  size?: 'sm' | 'md';
  className?: string;
}

interface DerivedStatus {
  label: string;
  variant: IndicatorVariant;
}

function deriveStatus(status: SignupStatus, paymentStatus: PaymentStatus): DerivedStatus {
  if (paymentStatus === 'refunded') {
    return { label: 'Refundert', variant: 'neutral' };
  }
  if (status === 'cancelled') {
    return { label: 'Avbestilt', variant: 'neutral' };
  }
  if (status === 'course_cancelled') {
    return { label: 'Kurs avlyst', variant: 'warning' };
  }
  // status === 'confirmed'
  if (paymentStatus === 'failed') {
    return { label: 'Betaling feilet', variant: 'error' };
  }
  if (paymentStatus === 'pending') {
    return { label: 'Venter betaling', variant: 'warning' };
  }
  return { label: 'Påmeldt', variant: 'success' };
}

export function SignupStatusBadge({
  status,
  paymentStatus,
  size = 'md',
  className,
}: SignupStatusBadgeProps) {
  const { label, variant } = deriveStatus(status, paymentStatus);
  const indicatorSize: IndicatorSize = size === 'sm' ? 'sm' : 'md';

  return (
    <StatusIndicator
      variant={variant}
      mode="badge"
      size={indicatorSize}
      label={label}
      icon={undefined}
      ariaLabel={`Status: ${label}`}
      className={className}
    />
  );
}
