import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/ui/user-avatar';
import { LogOut, User, Search, MessageCircle } from 'lucide-react';

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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-background border-b border-border sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo / Home */}
          <div className="flex items-center gap-8">
            <Link to="/" className="type-title text-foreground">
              Ease
            </Link>
            
            {/* Navigation Tabs (Desktop) */}
            <nav className="hidden md:flex items-center gap-1" aria-label="Studentnavigasjon">
              <Link
                to="/student/dashboard"
                className="type-label rounded-lg bg-surface-muted px-3 py-2 text-foreground transition-colors"
              >
                Mine kurs
              </Link>
              <Link
                to="/student/messages"
                className="type-label flex items-center gap-1.5 rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
              >
                <MessageCircle className="h-4 w-4" />
                Meldinger
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
                <button className="flex items-center gap-2 outline-none group" aria-label="Kontomeny">
                  <UserAvatar
                    name={profile?.name}
                    email={user?.email}
                    src={profile?.avatar_url}
                    size="lg"
                    ringClassName="border border-border transition-colors group-hover:border-input"
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="type-label text-foreground">{profile?.name || 'Deltaker'}</p>
                  <p className="type-meta truncate text-muted-foreground">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/student/profile')} className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  <span>Min profil</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-primary cursor-pointer focus:text-primary">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logg ut</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-6 sm:py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 mt-auto">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="type-meta text-muted-foreground">
            Trenger du hjelp? <a href="mailto:support@ease.no" className="underline hover:text-muted-foreground smooth-transition">Kontakt oss</a>
          </p>
        </div>
      </footer>
    </div>
  );
};
