import { Check, Clock, X, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PaymentStatus = 'paid' | 'pending' | 'failed' | 'refunded';

interface PaymentConfig {
  text: string;
  icon: 'check' | 'clock' | 'x' | 'rotate';
  label: string;
}

const paymentConfig: Record<PaymentStatus, PaymentConfig> = {
  paid: {
    text: 'text-status-confirmed-text',
    icon: 'check',
    label: 'Betalt',
  },
  pending: {
    text: 'text-text-tertiary',
    icon: 'clock',
    label: 'Venter',
  },
  failed: {
    text: 'text-status-error-text',
    icon: 'x',
    label: 'Betaling feilet',
  },
  refunded: {
    text: 'text-muted-foreground',
    icon: 'rotate',
    label: 'Refundert',
  },
};

const iconComponents = {
  check: Check,
  clock: Clock,
  x: X,
  rotate: RotateCcw,
};

interface PaymentBadgeProps {
  status: PaymentStatus;
  size?: 'sm' | 'md';
  customLabel?: string;
  className?: string;
}

export function PaymentBadge({
  status,
  size = 'md',
  customLabel,
  className,
}: PaymentBadgeProps) {
  const config = paymentConfig[status];
  const label = customLabel || config.label;
  const Icon = iconComponents[config.icon];

  const textSize = size === 'sm' ? 'text-xxs' : 'text-xs';
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium',
        config.text,
        textSize,
        className
      )}
    >
      <Icon className={iconSize} />
      {label}
    </span>
  );
}
