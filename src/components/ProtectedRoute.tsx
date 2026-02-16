import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, type UserType } from '@/contexts/AuthContext';
import { Infinity } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Spinner } from '@/components/ui/spinner';

// Reusable loading screen component
function LoadingScreen({ message = 'Laster' }: { message?: string }) {
  return (
    <div className="min-h-screen w-full bg-surface flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="xl" />
        <p className="text-sm text-text-secondary">{message}</p>
      </div>
    </div>
  );
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

  // Handle pending organization creation after signup
  useEffect(() => {
    if (!user || currentOrganization || orgCreationAttempted.current || isCreatingOrg) return;

    const pendingOrgData = localStorage.getItem('pendingOrganization');
    if (!pendingOrgData) return;

    orgCreationAttempted.current = true;
    setIsCreatingOrg(true);

    const createPendingOrg = async () => {
      try {
        const { name, slug, email: pendingEmail } = JSON.parse(pendingOrgData);

        // Cross-account safety: verify the pending org belongs to this user
        if (pendingEmail && user.email !== pendingEmail) {
          localStorage.removeItem('pendingOrganization');
          return;
        }

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

  // Loading states - return null to avoid double loader (App Suspense handles it)
  if (isLoading || !isInitialized) {
    return null;
  }

  if (!user) {
    // Redirect to appropriate login page based on required user type
    const loginPath = requiredUserType === 'student' ? '/student/login' : '/login';
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  // Pending org creation: show loading BEFORE userType check
  // (newly confirmed users have no org yet → userType='student', but they have pendingOrganization)
  if (isCreatingOrg || (!currentOrganization && localStorage.getItem('pendingOrganization'))) {
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

  // Check if user type matches requirement (safe now — pendingOrg handled above)
  if (requiredUserType && userType !== requiredUserType) {
    // Student route accessed by teacher → redirect to teacher dashboard
    if (requiredUserType === 'student' && userType === 'teacher') {
      return <Navigate to="/teacher" replace />;
    }
    // Teacher route accessed by non-teacher → teacher-side error, NEVER redirect to student
    return (
      <div className="min-h-screen w-full bg-surface flex items-center justify-center">
        <div className="w-full max-w-sm px-4">
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground">
                <Infinity className="w-4 h-4" />
              </div>
              <span className="text-xl font-medium tracking-tight text-text-primary">Ease</span>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-zinc-200 p-6 text-center">
            <h1 className="text-lg font-medium text-text-primary mb-1">
              Ingen tilgang
            </h1>
            <p className="text-sm text-text-secondary mb-4">
              Du har ikke tilgang til denne siden. Logg inn med riktig konto.
            </p>
            <button
              onClick={() => signOut()}
              className="text-sm text-text-secondary hover:text-text-primary ios-ease"
            >
              Logg ut
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No organization fallback — simplified error message
  if (requireOrganization && !currentOrganization) {
    return (
      <div className="min-h-screen w-full bg-surface flex items-center justify-center">
        <div className="w-full max-w-sm px-4">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground">
                <Infinity className="w-4 h-4" />
              </div>
              <span className="text-xl font-medium tracking-tight text-text-primary">Ease</span>
            </div>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-6 text-center">
            <h1 className="text-lg font-medium text-text-primary mb-1">
              Oppsettet ble ikke fullført
            </h1>
            <p className="text-sm text-text-secondary mb-4">
              Vi kunne ikke opprette virksomheten din. Prøv å logge inn på nytt, eller kontakt support.
            </p>
            <button
              onClick={() => signOut()}
              className="text-sm text-text-secondary hover:text-text-primary ios-ease"
            >
              Logg ut og prøv igjen
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
