import { cn } from '@/lib/utils';
import { AlertTriangle, XCircle, Clock } from 'lucide-react';

export type IndicatorVariant = 'success' | 'warning' | 'error' | 'neutral' | 'critical';
export type IndicatorMode = 'badge' | 'inline' | 'text-icon';
export type IndicatorSize = 'xs' | 'sm' | 'md';

interface StatusIndicatorProps {
  variant: IndicatorVariant;
  mode?: IndicatorMode;
  size?: IndicatorSize;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  showIcon?: boolean;
  count?: number;
  className?: string;
  ariaLabel?: string;
}

const variantConfig: Record<IndicatorVariant, {
  bg: string;
  text: string;
  ring: string;
  defaultIcon?: React.ComponentType<{ className?: string }>;
}> = {
  success: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    ring: 'ring-green-600/20',
  },
  warning: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    ring: 'ring-amber-600/20',
    defaultIcon: Clock,
  },
  error: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    ring: 'ring-red-600/20',
    defaultIcon: XCircle,
  },
  neutral: {
    bg: 'bg-zinc-50',
    text: 'text-zinc-600',
    ring: 'ring-zinc-500/20',
  },
  critical: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    ring: 'ring-red-600/20',
    defaultIcon: AlertTriangle,
  },
};

const modeConfig: Record<IndicatorMode, {
  borderRadius: string;
  padding: string;
  bgOpacity: string;
  showRing: boolean;
}> = {
  badge: {
    borderRadius: 'rounded-md',
    padding: 'px-2 py-0.5',
    bgOpacity: '',
    showRing: true,
  },
  inline: {
    borderRadius: 'rounded-md',
    padding: 'px-1.5 py-0.5',
    bgOpacity: '/70',
    showRing: false,
  },
  'text-icon': {
    borderRadius: '',
    padding: '',
    bgOpacity: '',
    showRing: false,
  },
};

const sizeConfig: Record<IndicatorSize, {
  fontSize: string;
  iconSize: string;
}> = {
  xs: {
    fontSize: 'text-xxs',
    iconSize: 'h-2.5 w-2.5',
  },
  sm: {
    fontSize: 'text-xs',
    iconSize: 'h-3 w-3',
  },
  md: {
    fontSize: 'text-xs',
    iconSize: 'h-3.5 w-3.5',
  },
};

/**
 * StatusIndicator - Unified component for all status, payment, and exception badges
 *
 * Replaces ad-hoc badge implementations across the Teacher Dashboard.
 * Ensures WCAG compliance by never relying on color alone.
 *
 * @example
 * // Status badge in table
 * <StatusIndicator variant="success" label="Påmeldt" />
 *
 * @example
 * // Payment badge (subtle, secondary)
 * <StatusIndicator variant="warning" mode="inline" label="Venter" />
 *
 * @example
 * // Exception badge (critical, with icon)
 * <StatusIndicator
 *   variant="critical"
 *   label="Betaling feilet"
 *   icon={AlertTriangle}
 *   ariaLabel="Krever oppmerksomhet: Betaling feilet"
 * />
 */
export function StatusIndicator({
  variant,
  mode = 'badge',
  size = 'sm',
  label,
  icon: Icon,
  showIcon = false,
  count,
  className,
  ariaLabel,
}: StatusIndicatorProps) {
  const config = variantConfig[variant];
  const modeStyles = modeConfig[mode];
  const sizeStyles = sizeConfig[size];

  // Determine which icon to display
  const DisplayIcon = Icon || (showIcon ? config.defaultIcon : undefined);
  // Critical variant should always show icons for accessibility
  const shouldShowIcon = DisplayIcon || variant === 'critical';

  // ARIA role: critical badges are alerts, others are status
  const role = variant === 'critical' ? 'alert' : 'status';
  const finalAriaLabel = ariaLabel || `Status: ${label}`;

  // Text + Icon mode (no background)
  if (mode === 'text-icon') {
    return (
      <span
        role={role}
        aria-label={finalAriaLabel}
        className={cn(
          'inline-flex items-center gap-1 font-medium',
          sizeStyles.fontSize,
          config.text,
          className
        )}
      >
        {shouldShowIcon && DisplayIcon && (
          <DisplayIcon className={sizeStyles.iconSize} aria-hidden="true" />
        )}
        {count !== undefined ? count : label}
      </span>
    );
  }

  // Badge or Inline mode (with background)
  const borderRadiusClass = modeStyles.borderRadius;

  return (
    <span
      role={role}
      aria-label={finalAriaLabel}
      className={cn(
        'inline-flex items-center gap-1 font-medium',
        config.bg + modeStyles.bgOpacity,
        modeStyles.showRing && `ring-1 ring-inset ${config.ring}`,
        borderRadiusClass,
        modeStyles.padding,
        sizeStyles.fontSize,
        config.text,
        variant === 'critical' && '',
        className
      )}
    >
      {shouldShowIcon && DisplayIcon && (
        <DisplayIcon className={sizeStyles.iconSize} aria-hidden="true" />
      )}
      {count !== undefined ? count : label}
    </span>
  );
}
