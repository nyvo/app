import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { getInitials } from '@/utils/stringUtils';

type AvatarSize = 'xxs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface UserAvatarProps {
  name?: string | null;
  email?: string | null;
  src?: string | null;
  size?: AvatarSize;
  className?: string;
  /** Extra ring/border classes for context-specific styling */
  ringClassName?: string;
}

const sizeConfig: Record<AvatarSize, { container: string; text: string; icon: string }> = {
  xxs: { container: 'h-4 w-4', text: 'text-[6px]', icon: 'h-2.5 w-2.5' },
  xs:  { container: 'h-6 w-6', text: 'text-[10px]', icon: 'h-3 w-3' },
  sm:  { container: 'h-8 w-8', text: 'text-xxs', icon: 'h-4 w-4' },
  md:  { container: 'h-9 w-9', text: 'text-xs', icon: 'h-4 w-4' },
  lg:  { container: 'h-10 w-10', text: 'text-sm', icon: 'h-5 w-5' },
  xl:  { container: 'h-16 w-16', text: 'text-xl', icon: 'h-8 w-8' },
};

/** Minimalist silhouette SVG for when no name or email is available */
function SilhouetteIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v1.2c0 .7.5 1.2 1.2 1.2h16.8c.7 0 1.2-.5 1.2-1.2v-1.2c0-3.2-6.4-4.8-9.6-4.8z" />
    </svg>
  );
}

/**
 * Unified avatar component following the Ease Design System.
 *
 * Priority:
 * 1. Image (`src`) with onerror fallback
 * 2. Initials from `name` (or `email` if name absent)
 * 3. Minimalist silhouette SVG
 */
export function UserAvatar({
  name,
  email,
  src,
  size = 'lg',
  className,
  ringClassName,
}: UserAvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const config = sizeConfig[size];

  const handleError = useCallback(() => setImgFailed(true), []);

  const initials = getInitials(name || email || null);
  const hasInitials = initials !== '?';
  const showImage = src && !imgFailed;

  if (showImage) {
    return (
      <img
        src={src}
        alt={name || email || 'Avatar'}
        onError={handleError}
        className={cn(
          'rounded-full object-cover shrink-0',
          config.container,
          ringClassName,
          className,
        )}
      />
    );
  }

  if (hasInitials) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-surface-elevated font-medium text-text-secondary shrink-0',
          config.container,
          config.text,
          ringClassName,
          className,
        )}
        aria-label={name || email || undefined}
      >
        {initials}
      </div>
    );
  }

  // Silhouette fallback — no name or email available
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-zinc-200 text-zinc-500 shrink-0',
        config.container,
        ringClassName,
        className,
      )}
      aria-label="Bruker"
    >
      <SilhouetteIcon className={config.icon} />
    </div>
  );
}
