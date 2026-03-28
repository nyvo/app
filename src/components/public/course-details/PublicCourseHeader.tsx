import React from 'react';
import { Link } from 'react-router-dom';
import { User, LogOut, BookOpen } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface PublicCourseHeaderProps {
  organizationSlug: string;
  organizationName: string;
  user: any;
  userType: string | null;
  onSignOut: () => void;
}

/**
 * Minimal Linear-style header for public course booking page
 * Clean brand initials on left, subtle label + profile on right
 */
export const PublicCourseHeader: React.FC<PublicCourseHeaderProps> = ({
  organizationSlug,
  organizationName,
  user,
  userType,
  onSignOut,
}) => {
  const studioUrl = `/studio/${organizationSlug}`;

  // Generate short initials from org name (e.g., "Kristoffer Studio" → "K/S")
  const initials = (organizationName || 'Ease')
    .split(' ')
    .filter(Boolean)
    .map(w => w[0].toUpperCase())
    .join('/');

  return (
    <header className="border-b border-zinc-200">
      <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Brand mark */}
        <Link
          to={studioUrl}
          className="flex items-center gap-2 hover:opacity-70 transition-opacity"
        >
          <span className="text-sm font-medium tracking-widest uppercase text-text-primary">
            {initials}
          </span>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-6">
          <span className="text-xs text-muted-foreground font-medium hidden sm:block">
            Booking
          </span>

          {/* Profile dropdown */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button aria-label="Brukermeny" className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center hover:bg-zinc-200 smooth-transition">
                  <User className="h-4 w-4 text-text-primary" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {userType === 'student' && (
                  <DropdownMenuItem asChild>
                    <Link
                      to="/student/dashboard"
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <BookOpen className="h-4 w-4" />
                      <span>Mine påmeldinger</span>
                    </Link>
                  </DropdownMenuItem>
                )}
                {userType === 'teacher' && (
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard" className="flex items-center gap-2 cursor-pointer">
                      <BookOpen className="h-4 w-4" />
                      <span>Oversikt</span>
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={onSignOut}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logg ut</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link
              to="/student/login"
              className="text-xs font-medium text-muted-foreground hover:text-text-primary transition-colors"
            >
              Logg inn
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
