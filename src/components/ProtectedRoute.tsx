import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, type UserType } from '@/contexts/AuthContext';
import { Loader2, Infinity } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Spinner } from '@/components/ui/spinner';

// Reusable loading screen component
function LoadingScreen({ message = 'Laster' }: { message?: string }) {
  return (
    <div className="min-h-screen w-full bg-surface flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="xl" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

// Generate URL-friendly slug from organization name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[æ]/g, 'ae')
    .replace(/[ø]/g, 'o')
    .replace(/[å]/g, 'a')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Check if slug is available
async function checkSlugAvailable(slug: string): Promise<boolean> {
  const { data } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();
  return !data;
}

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireOrganization?: boolean;
  requiredUserType?: UserType;
}

export function ProtectedRoute({ children, requireOrganization = true, requiredUserType }: ProtectedRouteProps) {
  const { user, isLoading, isInitialized, currentOrganization, createOrganization, signOut, userType } = useAuth();
  const location = useLocation();
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);
  const [orgCreationError, setOrgCreationError] = useState<string | null>(null);
  const orgCreationAttempted = useRef(false);

  // State for inline org creation form
  const [orgName, setOrgName] = useState('');
  const [orgNameError, setOrgNameError] = useState<string | null>(null);
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);

  // Handle pending organization creation after signup
  useEffect(() => {
    if (!user || currentOrganization || orgCreationAttempted.current || isCreatingOrg) return;

    const pendingOrgData = localStorage.getItem('pendingOrganization');
    if (!pendingOrgData) return;

    orgCreationAttempted.current = true;
    setIsCreatingOrg(true);

    const createPendingOrg = async () => {
      try {
        const { name, slug } = JSON.parse(pendingOrgData);

        // Check slug availability before creating
        const isAvailable = await checkSlugAvailable(slug);
        if (!isAvailable) {
          setOrgCreationError('Dette navnet er opptatt. Velg et annet.');
          return;
        }

        const { error } = await createOrganization(name, slug);
        if (error) {
          setOrgCreationError(error.message);
        }
      } catch {
        setOrgCreationError('Kunne ikke opprette organisasjonen');
      } finally {
        localStorage.removeItem('pendingOrganization');
        setIsCreatingOrg(false);
      }
    };

    createPendingOrg();
  }, [user, currentOrganization, createOrganization, isCreatingOrg]);

  // Handle inline org creation
  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!orgName.trim()) {
      setOrgNameError('Skriv inn et navn');
      return;
    }

    const slug = generateSlug(orgName);
    if (!slug) {
      setOrgNameError('Skriv inn et gyldig navn');
      return;
    }

    setIsCheckingSlug(true);
    setOrgNameError(null);

    try {
      // Check slug availability
      const isAvailable = await checkSlugAvailable(slug);
      if (!isAvailable) {
        setOrgNameError('Dette navnet er opptatt');
        setIsCheckingSlug(false);
        return;
      }

      setIsCreatingOrg(true);
      const { error } = await createOrganization(orgName.trim(), slug);
      if (error) {
        setOrgCreationError(error.message);
      }
    } catch {
      setOrgCreationError('Kunne ikke opprette organisasjonen');
    } finally {
      setIsCheckingSlug(false);
      setIsCreatingOrg(false);
    }
  };

  // Loading states - return null to avoid double loader (App Suspense handles it)
  if (isLoading || !isInitialized) {
    return null;
  }

  if (!user) {
    // Redirect to appropriate login page based on required user type
    const loginPath = requiredUserType === 'student' ? '/student/login' : '/login';
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  // Check if user type matches requirement
  if (requiredUserType && userType !== requiredUserType) {
    // Wrong user type - redirect to appropriate dashboard
    const redirectPath = userType === 'student' ? '/student/dashboard' : '/teacher';
    return <Navigate to={redirectPath} replace />;
  }

  if (isCreatingOrg || (requireOrganization && !currentOrganization && localStorage.getItem('pendingOrganization'))) {
    return <LoadingScreen message="Setter opp kontoen din" />;
  }

  // Error state (from pending org creation)
  if (orgCreationError) {
    return (
      <div className="min-h-screen w-full bg-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 max-w-md text-center px-4">
          <p className="text-sm text-destructive">{orgCreationError}</p>
          <button
            onClick={() => {
              orgCreationAttempted.current = false;
              setOrgCreationError(null);
            }}
            className="text-sm text-text-secondary underline hover:text-text-primary ios-ease"
          >
            Prøv på nytt
          </button>
        </div>
      </div>
    );
  }

  // No organization state - show inline form
  if (requireOrganization && !currentOrganization) {
    return (
      <div className="min-h-screen w-full bg-surface flex items-center justify-center">
        <div className="w-full max-w-sm px-4">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center text-white shadow-sm">
                <Infinity className="w-4 h-4" />
              </div>
              <span className="text-xl font-semibold tracking-tight text-text-primary">Ease</span>
            </div>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
            <div className="text-center mb-6">
              <h1 className="text-lg font-semibold text-text-primary mb-1">
                Opprett ditt studio
              </h1>
              <p className="text-sm text-muted-foreground">
                Du trenger et studio for å komme i gang.
              </p>
            </div>

            <form onSubmit={handleCreateOrg} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="orgName" className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Navn på studioet
                </label>
                <input
                  type="text"
                  id="orgName"
                  value={orgName}
                  onChange={(e) => {
                    setOrgName(e.target.value);
                    setOrgNameError(null);
                  }}
                  className={`
                    w-full h-11 px-3.5 rounded-lg border bg-input-bg text-sm text-text-primary placeholder:text-text-tertiary
                    transition-all outline-none
                    ${orgNameError
                      ? 'border-destructive focus:border-destructive focus:ring-4 focus:ring-destructive/20'
                      : 'border-border hover:border-ring focus:border-ring focus:ring-4 focus:ring-border/30 focus:bg-white'
                    }
                  `}
                  placeholder="Mitt Yogastudio"
                />
                {orgNameError && (
                  <p className="text-xs text-destructive">{orgNameError}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isCheckingSlug || isCreatingOrg}
                className="w-full h-11 bg-text-primary hover:bg-sidebar-foreground disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm ios-ease"
              >
                {isCheckingSlug || isCreatingOrg ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {isCheckingSlug ? 'Sjekker' : 'Oppretter'}
                  </>
                ) : (
                  'Opprett'
                )}
              </button>
            </form>

            <div className="mt-4 pt-4 border-t border-border">
              <button
                onClick={() => signOut()}
                className="w-full text-sm text-muted-foreground hover:text-text-primary ios-ease"
              >
                Logg ut
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
