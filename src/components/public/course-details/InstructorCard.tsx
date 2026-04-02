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
 * Instructor info — compact row with avatar, name, and optional link
 * Matches Linear's understated style
 */
export const InstructorCard: React.FC<InstructorCardProps> = ({ instructor }) => {
  if (!instructor) {
    return null;
  }

  const { name, role, avatar_url, profileUrl } = instructor;

  return (
    <div className="flex items-center gap-3">
      <UserAvatar
        name={name}
        src={avatar_url}
        size="md"
      />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground">{name}</div>
        {role && (
          <div className="text-xs text-muted-foreground">{role}</div>
        )}
      </div>
      {profileUrl && (
        <Link
          to={profileUrl}
          className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          Se profil
        </Link>
      )}
    </div>
  );
};
