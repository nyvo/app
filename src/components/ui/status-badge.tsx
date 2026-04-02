import { StatusIndicator, type IndicatorVariant, type IndicatorSize } from './status-indicator';
import type { SignupStatus } from '@/types/dashboard';

export type { SignupStatus };
export type CourseStatus = 'draft' | 'active' | 'upcoming' | 'completed';
export type BadgeStatus = SignupStatus | CourseStatus;

interface StatusConfig {
  variant: IndicatorVariant;
  label: string;
  showIcon: boolean;
}

const statusConfig: Record<BadgeStatus, StatusConfig> = {
  // Signup statuses
  confirmed: {
    variant: 'success',
    label: 'Påmeldt',
    showIcon: false,
  },
  cancelled: {
    variant: 'neutral',
    label: 'Avbestilt',
    showIcon: false,
  },
  course_cancelled: {
    variant: 'neutral',
    label: 'Kurs avlyst',
    showIcon: false,
  },
  // Course statuses
  draft: {
    variant: 'neutral',
    label: 'Utkast',
    showIcon: false,
  },
  active: {
    variant: 'success',
    label: 'Pågår',
    showIcon: false,
  },
  upcoming: {
    variant: 'success',
    label: 'Kommende',
    showIcon: false,
  },
  completed: {
    variant: 'neutral',
    label: 'Fullført',
    showIcon: false,
  },
};

interface StatusBadgeProps {
  status: BadgeStatus;
  size?: 'sm' | 'md';
  customLabel?: string;
  className?: string;
}

/**
 * StatusBadge - Displays signup and course status
 *
 * Uses StatusIndicator internally for consistency and accessibility.
 * Maintains backward compatible API.
 *
 * Key change from previous version: Uses rounded-md instead of rounded-full
 * for a modern, calm SaaS aesthetic.
 */
export function StatusBadge({
  status,
  size = 'md',
  customLabel,
  className
}: StatusBadgeProps) {
  const config = statusConfig[status];
  const label = customLabel || config.label;

  // Map md/sm to StatusIndicator sizes
  const indicatorSize: IndicatorSize = size === 'sm' ? 'sm' : 'md';

  return (
    <StatusIndicator
      variant={config.variant}
      mode="badge"
      size={indicatorSize}
      label={label}
      icon={undefined}
      ariaLabel={`Status: ${label}`}
      className={className}
    />
  );
}
