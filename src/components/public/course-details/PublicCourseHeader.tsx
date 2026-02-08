import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, User, LogOut, BookOpen, Leaf } from 'lucide-react';
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
 * Public course detail page header
 * Sticky navbar with back button and profile dropdown
 */
export const PublicCourseHeader: React.FC<PublicCourseHeaderProps> = ({
  organizationSlug,
  organizationName,
  user,
  userType,
  onSignOut,
}) => {
  const studioUrl = `/studio/${organizationSlug}`;

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-zinc-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link
          to={studioUrl}
          className="flex items-center gap-2 cursor-pointer hover:opacity-70 transition-opacity"
        >
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground">
            <Leaf className="h-4 w-4" />
          </div>
          <span className="text-sm font-medium tracking-tight text-text-primary">
            {organizationName || 'Ease'}
          </span>
        </Link>

        {/* Actions */}
        <div className="flex items-center gap-4 text-sm">
          {/* Back button (desktop only) */}
          <Link
            to={studioUrl}
            className="hidden sm:flex items-center gap-1 text-muted-foreground hover:text-text-primary transition-colors text-xs font-medium ios-ease"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Tilbake til timeplan
          </Link>

          {/* Divider */}
          <div className="h-4 w-px bg-zinc-200 hidden sm:block"></div>

          {/* Profile dropdown */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-8 h-8 rounded-full bg-surface-elevated flex items-center justify-center hover:bg-zinc-200 transition-colors">
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
                      <span>Dashboard</span>
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
              to="/login"
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
