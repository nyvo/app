import { XCircle } from 'lucide-react';
import { StatusIndicator, type IndicatorVariant, type IndicatorMode, type IndicatorSize } from './status-indicator';

export type PaymentStatus = 'paid' | 'pending' | 'failed' | 'refunded';
export type PaymentVisibility = 'always' | 'exceptions';

interface PaymentConfig {
  variant: IndicatorVariant;
  label: string;
  showIcon: boolean;
}

const paymentConfig: Record<PaymentStatus, PaymentConfig> = {
  paid: {
    variant: 'success',
    label: 'Betalt',
    showIcon: false,
  },
  pending: {
    variant: 'warning',
    label: 'Venter betaling',
    showIcon: false,
  },
  failed: {
    variant: 'error',
    label: 'Betaling feilet',
    showIcon: false,
  },
  refunded: {
    variant: 'neutral',
    label: 'Refundert',
    showIcon: false,
  },
};

interface PaymentBadgeProps {
  status: PaymentStatus;
  size?: 'sm' | 'md';
  mode?: IndicatorMode;
  customLabel?: string;
  className?: string;
  /**
   * Controls visibility behavior:
   * - "exceptions" (default): Renders nothing for "paid" status (silence is success)
   * - "always": Renders all statuses including "paid"
   */
  visibility?: PaymentVisibility;
}

/**
 * PaymentBadge - Displays payment status with configurable visibility
 *
 * Default behavior (visibility="exceptions"):
 * - "paid" renders NOTHING (silent success for dense teacher/admin views)
 * - Other statuses render normally (exceptions are visible)
 *
 * Alternative (visibility="always"):
 * - All statuses render, including "Betalt" for paid (useful in student-facing contexts)
 *
 * Uses StatusIndicator internally for consistency and accessibility.
 */
export function PaymentBadge({
  status,
  size = 'md',
  mode = 'badge',
  customLabel,
  className,
  visibility = 'exceptions',
}: PaymentBadgeProps) {
  // Exception-only mode: paid is silent
  if (visibility === 'exceptions' && status === 'paid') {
    return null;
  }

  const config = paymentConfig[status];
  const label = customLabel || config.label;

  // Map md/sm to StatusIndicator sizes
  const indicatorSize: IndicatorSize = size === 'sm' ? 'sm' : 'md';

  return (
    <StatusIndicator
      variant={config.variant}
      mode={mode}
      size={indicatorSize}
      label={label}
      icon={config.showIcon ? XCircle : undefined}
      ariaLabel={`Betaling: ${label}`}
      className={className}
    />
  );
}
