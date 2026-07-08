import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

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

const sizeConfig: Record<AvatarSize, { container: string; icon: string }> = {
  xxs: { container: 'size-4', icon: 'size-2.5' },
  xs:  { container: 'size-6', icon: 'size-3' },
  sm:  { container: 'size-8', icon: 'size-4' },
  md:  { container: 'size-9', icon: 'size-4' },
  lg:  { container: 'size-10', icon: 'size-5' },
  xl:  { container: 'size-16', icon: 'size-8' },
};

/** Neutral User silhouette — used as the only fallback when no image is set. */
function UserIcon({ className }: { className?: string }) {
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
 * Unified avatar primitive. Image with neutral User-icon fallback — Studio
 * forbids initials placeholders (no per-user chromatic noise; the icon reads
 * as "anonymous user" without imposing identity). Always neutral chrome:
 * `bg-muted` + `text-foreground-muted` icon.
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
  const showImage = src && !imgFailed;
  const ariaLabel = name || email || 'Bruker';

  if (showImage) {
    return (
      <img
        src={src}
        alt={ariaLabel}
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

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-muted text-foreground-muted shrink-0',
        config.container,
        ringClassName,
        className,
      )}
      role="img"
      aria-label={ariaLabel}
    >
      <UserIcon className={config.icon} />
    </div>
  );
}
