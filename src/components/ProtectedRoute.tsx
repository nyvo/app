import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, type UserType } from '@/contexts/AuthContext';
import { Infinity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/** Generate URL-friendly slug from organization name */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[æ]/g, 'ae')
    .replace(/[ø]/g, 'o')
    .replace(/[å]/g, 'a')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Recovery fallback for orphan users (signup succeeded but org creation failed).
 * Rendered inline — no route change, no redirect loops.
 */
function OrgSetupFallback() {
  const { ensureOrganization, signOut } = useAuth();
  const [studioName, setStudioName] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = studioName.trim();
    if (!name) {
      setError('Skriv inn navnet på studioet');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const slug = generateSlug(name);
      const { error: orgError } = await ensureOrganization(name, slug);
      if (orgError) {
        setError('Kunne ikke opprette studioet. Prøv igjen.');
        setIsSubmitting(false);
      }
      // On success, AuthContext updates → ProtectedRoute re-renders → children shown
    } catch {
      setError('Noe gikk galt. Prøv igjen.');
      setIsSubmitting(false);
    }
  };

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
        <div className="bg-white rounded-2xl border border-zinc-200 p-6">
          <h1 className="text-lg font-medium text-text-primary mb-1 text-center">
            Fullfør registreringen
          </h1>
          <p className="text-sm text-text-secondary mb-6 text-center">
            Gi studioet ditt et navn for å komme i gang.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="fallback-studio" className="block text-xs font-medium text-text-secondary">
                Navn på studio eller virksomhet
              </label>
              <Input
                id="fallback-studio"
                type="text"
                value={studioName}
                onChange={(e) => {
                  setStudioName(e.target.value);
                  if (error) setError('');
                }}
                placeholder="F.eks. Yoga med Ola"
                className={error ? 'border-destructive focus:border-destructive focus:ring-1 focus:ring-destructive' : ''}
                autoFocus
              />
              {error ? (
                <p className="text-xs text-destructive">{error}</p>
              ) : (
                <p className="text-xs text-text-tertiary">
                  Vises på din offentlige side. Du kan endre det senere.
                </p>
              )}
            </div>

            <Button
              type="submit"
              loading={isSubmitting}
              loadingText="Oppretter studio..."
              className="w-full h-11"
              disabled={!studioName.trim()}
            >
              Fullfør
            </Button>
          </form>

          <div className="text-center mt-4">
            <button
              onClick={() => signOut()}
              className="text-xs text-text-secondary hover:text-text-primary transition-colors"
            >
              Logg ut
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireOrganization?: boolean;
  requiredUserType?: UserType;
}

export function ProtectedRoute({ children, requireOrganization = true, requiredUserType }: ProtectedRouteProps) {
  const { user, isLoading, isInitialized, currentOrganization, signOut, userType } = useAuth();
  const location = useLocation();

  // Loading states - return null to avoid double loader (App Suspense handles it)
  if (isLoading || !isInitialized) {
    return null;
  }

  if (!user) {
    const loginPath = requiredUserType === 'student' ? '/student/login' : '/login';
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  // No organization → inline fallback (NOT a redirect — avoids loops)
  // Must come BEFORE userType check: new user has no org yet → userType='student',
  // but they should complete org setup, not see "Ingen tilgang"
  if (requireOrganization && !currentOrganization) {
    return <OrgSetupFallback />;
  }

  // Check if user type matches requirement
  if (requiredUserType && userType !== requiredUserType) {
    // Student route accessed by teacher → redirect to teacher dashboard
    if (requiredUserType === 'student' && userType === 'teacher') {
      return <Navigate to="/teacher" replace />;
    }
    // Teacher route accessed by non-teacher who already has no pending org
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

  return <>{children}</>;
}
