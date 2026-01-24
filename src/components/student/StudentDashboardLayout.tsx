import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LogOut, User, Search } from 'lucide-react';
import { getInitials } from '@/utils/stringUtils';

interface StudentDashboardLayoutProps {
  children: React.ReactNode;
}

export const StudentDashboardLayout = ({ children }: StudentDashboardLayoutProps) => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo / Home */}
          <div className="flex items-center gap-8">
            <Link to="/" className="font-geist text-xl font-bold text-text-primary tracking-tight">
              Ease
            </Link>
            
            {/* Navigation Tabs (Desktop) */}
            <nav className="hidden md:flex items-center gap-1">
              <Link 
                to="/student/dashboard" 
                className="px-3 py-2 text-sm font-medium text-text-primary bg-surface-elevated rounded-lg transition-colors"
              >
                Mine kurs
              </Link>
            </nav>
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-2 md:gap-4">
            {/* Find Courses Button - visible on all sizes */}
            <Button
              variant="outline-soft"
              size="sm"
              onClick={() => navigate('/')}
              className="gap-1.5"
            >
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Finn kurs</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 outline-none group">
                  <Avatar className="h-10 w-10 border border-gray-200 transition-colors group-hover:border-gray-300">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-surface-elevated text-sm font-medium text-text-secondary">
                      {profile?.name ? getInitials(profile.name) : '??'}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-sm">
                  <p className="font-medium text-text-primary">{profile?.name || 'Student'}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/student/profile')} className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  <span>Min profil</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-status-error-text cursor-pointer focus:text-status-error-text focus:bg-status-error-bg/10">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logg ut</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-6 sm:py-8">
        {children}
      </main>

      {/* Simple Footer */}
      <footer className="border-t border-gray-200 bg-white py-8 mt-auto">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            Trenger du hjelp? <a href="mailto:support@ease.no" className="text-text-primary underline hover:text-text-secondary transition-colors">Kontakt support</a>
          </p>
        </div>
      </footer>
    </div>
  );
};
