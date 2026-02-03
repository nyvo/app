import { XCircle } from 'lucide-react';
import { StatusIndicator, type IndicatorVariant, type IndicatorSize } from './status-indicator';
import type { SignupStatus } from '@/types/dashboard';

export type { SignupStatus };
export type CourseStatus = 'active' | 'upcoming' | 'completed';
export type BadgeStatus = SignupStatus | CourseStatus;

interface StatusConfig {
  variant: IndicatorVariant;
  label: string;
  showIcon: boolean;
}

const statusConfig: Record<BadgeStatus, StatusConfig> = {
  // Signup statuses
  confirmed: {
    variant: 'neutral', // De-emphasized: default state, not an exception
    label: 'Påmeldt',
    showIcon: false,
  },
  waitlist: {
    variant: 'warning', // Clearly visible: exception requiring attention
    label: 'Venteliste',
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
  active: {
    variant: 'success',
    label: 'Pågår',
    showIcon: false,
  },
  upcoming: {
    variant: 'warning',
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
      icon={config.showIcon ? XCircle : undefined}
      ariaLabel={`Status: ${label}`}
      className={className}
    />
  );
}
