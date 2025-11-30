import { cn } from '@/lib/utils';

interface Participant {
  name: string;
  avatar?: string;
  initials?: string;
}

interface ParticipantAvatarProps {
  participant: Participant;
  size?: 'sm' | 'md' | 'lg';
  showPhoto?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xxs',
  md: 'h-9 w-9 text-xs',
  lg: 'h-10 w-10 text-xs',
};

export function ParticipantAvatar({
  participant,
  size = 'md',
  showPhoto = true,
  className,
}: ParticipantAvatarProps) {
  const initials = participant.initials || participant.name.substring(0, 2).toUpperCase();

  if (showPhoto && participant.avatar) {
    return (
      <img
        src={participant.avatar}
        className={cn(
          'rounded-full object-cover border border-border group-hover:border-ring',
          sizeClasses[size],
          className
        )}
        alt={participant.name}
      />
    );
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-surface-elevated font-medium text-text-secondary ring-1 ring-border',
        sizeClasses[size],
        className
      )}
    >
      {initials}
    </div>
  );
}
