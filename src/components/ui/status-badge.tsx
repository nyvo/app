import { XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SignupStatus } from '@/types/dashboard';

export type { SignupStatus };
export type CourseStatus = 'active' | 'upcoming' | 'completed';
export type BadgeStatus = SignupStatus | CourseStatus;

interface StatusConfig {
  bg: string;
  text: string;
  dot: string;
  label: string | ((pos?: number) => string);
  icon?: 'x-circle';
}

const statusConfig: Record<BadgeStatus, StatusConfig> = {
  // Signup statuses
  confirmed: {
    bg: 'bg-status-confirmed-bg',
    text: 'text-status-confirmed-text',
    dot: 'bg-status-confirmed-text',
    label: 'Påmeldt',
  },
  waitlist: {
    bg: 'bg-status-waitlist-bg',
    text: 'text-status-waitlist-text',
    dot: 'bg-warning',
    label: (pos?: number) => `Venteliste #${pos || 1}`,
  },
  cancelled: {
    bg: 'bg-status-cancelled-bg',
    text: 'text-status-cancelled-text',
    dot: '',
    label: 'Avbestilt',
    icon: 'x-circle',
  },
  // Course statuses
  active: {
    bg: 'bg-status-confirmed-bg',
    text: 'text-status-confirmed-text',
    dot: 'bg-status-confirmed-text',
    label: 'Pågår',
  },
  upcoming: {
    bg: 'bg-status-waitlist-bg',
    text: 'text-status-waitlist-text',
    dot: 'bg-status-waitlist-text',
    label: 'Planlagt',
  },
  completed: {
    bg: 'bg-surface-elevated',
    text: 'text-muted-foreground',
    dot: 'bg-muted-foreground',
    label: 'Fullført',
  },
};

interface StatusBadgeProps {
  status: BadgeStatus;
  size?: 'sm' | 'md';
  customLabel?: string;
  waitlistPosition?: number;
  className?: string;
}

export function StatusBadge({
  status,
  size = 'md',
  customLabel,
  waitlistPosition,
  className
}: StatusBadgeProps) {
  const config = statusConfig[status];
  const label = customLabel || (typeof config.label === 'function' ? config.label(waitlistPosition) : config.label);

  const sizeClasses = size === 'sm'
    ? 'px-2 py-0.5 text-xxs'
    : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        config.bg,
        config.text,
        sizeClasses,
        className
      )}
    >
      {config.icon === 'x-circle' ? (
        <XCircle className={size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
      ) : (
        <span className={cn('h-1.5 w-1.5 rounded-full', config.dot)} />
      )}
      {label}
    </span>
  );
}
