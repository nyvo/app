import { cn } from '@/lib/utils';
import { AlertTriangle, XCircle, Clock } from 'lucide-react';

export type IndicatorVariant = 'success' | 'warning' | 'error' | 'neutral' | 'critical' | 'info';
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
  defaultIcon?: React.ComponentType<{ className?: string }>;
}> = {
  success: {
    bg: 'bg-status-confirmed-bg',
    text: 'text-status-confirmed-text',
  },
  warning: {
    bg: 'bg-status-warning-bg',
    text: 'text-status-warning-text',
    defaultIcon: Clock,
  },
  error: {
    bg: 'bg-status-error-bg',
    text: 'text-status-error-text',
    defaultIcon: XCircle,
  },
  neutral: {
    bg: 'bg-status-cancelled-bg',
    text: 'text-status-cancelled-text',
  },
  critical: {
    bg: 'bg-status-error-bg',
    text: 'text-status-error-text',
    defaultIcon: AlertTriangle,
  },
  info: {
    bg: 'bg-status-info-bg',
    text: 'text-status-info-text',
  },
};

const sizeConfig: Record<IndicatorSize, {
  typography: string;
  iconSize: string;
  padding: string;
}> = {
  xs: {
    typography: 'text-xs font-medium tracking-wide',
    iconSize: 'h-2.5 w-2.5',
    padding: 'px-1.5 py-px',
  },
  sm: {
    typography: 'text-xs font-medium tracking-wide',
    iconSize: 'h-3 w-3',
    padding: 'px-2 py-0.5',
  },
  md: {
    typography: 'text-xs font-medium',
    iconSize: 'h-3.5 w-3.5',
    padding: 'px-2.5 py-0.5',
  },
};

/**
 * StatusIndicator - Unified component for all status, payment, and exception badges.
 *
 * Uses semantic typography classes and design system tokens.
 * Ensures WCAG compliance by never relying on color alone.
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
  const sizeStyles = sizeConfig[size];

  const DisplayIcon = Icon || (showIcon ? config.defaultIcon : undefined);
  const shouldShowIcon = DisplayIcon || variant === 'critical';

  const role = variant === 'critical' ? 'alert' : 'status';
  const finalAriaLabel = ariaLabel || `Status: ${label}`;

  // Text + Icon mode (no background)
  if (mode === 'text-icon') {
    return (
      <span
        role={role}
        aria-label={finalAriaLabel}
        className={cn(
          'inline-flex items-center gap-1',
          sizeStyles.typography,
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
  return (
    <span
      role={role}
      aria-label={finalAriaLabel}
      className={cn(
        'inline-flex items-center gap-1 rounded-md',
        mode === 'inline' ? `${config.bg}/70` : config.bg,
        sizeStyles.padding,
        sizeStyles.typography,
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
