import React from 'react';

export interface InstructorCardProps {
  instructor: {
    name: string;
    role?: string | null;
    avatar_url?: string | null;
    profileUrl?: string;
  } | null;
}

/**
 * Instructor information card with avatar and credentials
 * Displays instructor name, role/credentials, and optional profile link
 * Matches design from original HTML with larger avatar and role subtitle
 */
export const InstructorCard: React.FC<InstructorCardProps> = ({ instructor }) => {
  if (!instructor) {
    return null;
  }

  const { name, role, avatar_url, profileUrl } = instructor;

  return (
    <div className="flex items-center gap-4 p-5 rounded-xl border border-gray-200 bg-surface/30">
      {/* Avatar - larger (64x64) */}
      <div className="w-16 h-16 rounded-full bg-gray-200 overflow-hidden shrink-0">
        {avatar_url ? (
          <img
            src={avatar_url}
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text-tertiary font-medium text-xl">
            {name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="text-base font-medium text-text-primary">{name}</div>
        {role && (
          <div className="text-sm text-muted-foreground mt-0.5">
            {role}
          </div>
        )}
      </div>

      {/* Profile link (if available) */}
      {profileUrl && (
        <a
          href={profileUrl}
          className="text-sm font-medium text-text-primary hover:text-muted-foreground ios-ease shrink-0"
        >
          View Profile
        </a>
      )}
    </div>
  );
};
