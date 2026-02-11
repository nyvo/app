import React from 'react';
import { Link } from 'react-router-dom';
import { UserAvatar } from '@/components/ui/user-avatar';

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
    <div className="flex items-center gap-4 p-5 rounded-2xl border border-zinc-200 bg-surface/30">
      {/* Avatar - larger (64x64) */}
      <UserAvatar
        name={name}
        src={avatar_url}
        size="xl"
      />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="text-base font-medium text-text-primary">{name}</div>
        {role && (
          <div className="text-sm text-text-secondary mt-0.5">
            {role}
          </div>
        )}
      </div>

      {/* Profile link (if available) */}
      {profileUrl && (
        <Link
          to={profileUrl}
          className="text-sm font-medium text-text-primary hover:text-text-secondary ios-ease shrink-0"
        >
          Se profil
        </Link>
      )}
    </div>
  );
};
