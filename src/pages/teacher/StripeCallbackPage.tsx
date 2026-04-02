import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Infinity, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { createStripeConnectLink, checkStripeStatus } from '@/services/stripe-connect';

type CallbackState = 'loading' | 'success' | 'incomplete' | 'error';

const StripeCallbackPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentOrganization, refreshOrganizations } = useAuth();
  const [state, setState] = useState<CallbackState>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [isRetrying, setIsRetrying] = useState(false);
  const hasRun = useRef(false);

  const orgId = searchParams.get('org') || currentOrganization?.id;
  const isRefresh = searchParams.get('refresh') === 'true';

  useEffect(() => {
    if (!orgId || hasRun.current) return;
    hasRun.current = true;

    const run = async () => {
      // Refresh URL = user needs to restart onboarding (Stripe link expired)
      if (isRefresh) {
        const { data, error } = await createStripeConnectLink(orgId);
        if (data?.url) {
          window.location.href = data.url;
          return;
        }
        setErrorMessage(error?.message || 'Kunne ikke opprette ny Stripe-lenke');
        setState('error');
        return;
      }

      // Normal return: check if onboarding completed
      // Stripe may take a moment to propagate status — retry once after a short delay
      const { data, error } = await checkStripeStatus(orgId);

      if (error) {
        setErrorMessage(error.message);
        setState('error');
        return;
      }

      if (data?.onboardingComplete) {
        setState('success');
        await refreshOrganizations();
        toast.success('Betalinger er klare');
        navigate('/teacher?stripe=success', { replace: true });
      } else {
        // Retry once after 2s — Stripe status may not be immediate
        await new Promise((r) => setTimeout(r, 2000));
        const retry = await checkStripeStatus(orgId);
        if (retry.data?.onboardingComplete) {
          setState('success');
          await refreshOrganizations();
          toast.success('Betalinger er klare');
          navigate('/teacher?stripe=success', { replace: true });
        } else {
          setState('incomplete');
        }
      }
    };

    run();
  }, [orgId, isRefresh, navigate, refreshOrganizations]);

  const handleRetry = async () => {
    if (!orgId) return;
    setIsRetrying(true);
    const { data, error } = await createStripeConnectLink(orgId);
    if (data?.url) {
      window.location.href = data.url;
    } else {
      setErrorMessage(error?.message || 'Kunne ikke opprette ny Stripe-lenke');
      setState('error');
      setIsRetrying(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground font-geist antialiased flex flex-col selection:bg-muted selection:text-foreground">
      {/* Header */}
      <header className="w-full pt-8 pb-4 px-6 flex items-center justify-center z-50 max-w-6xl mx-auto">
        <Link to="/" className="flex items-center gap-2 select-none">
          <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center text-primary-foreground">
            <Infinity className="w-3.5 h-3.5" />
          </div>
          <span className="text-lg font-medium tracking-tight text-foreground">
            Ease
          </span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 w-full max-w-md mx-auto py-12">
        <div className="w-full flex flex-col items-center text-center">
          {state === 'loading' && (
            <>
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-6">
                <Spinner size="md" />
              </div>
              <h1 className="font-geist text-2xl font-medium tracking-tight text-foreground mb-2">
                Bekrefter betalingsoppsettet
              </h1>
              <p className="text-muted-foreground text-sm">
                Vent mens vi bekrefter oppsettet ditt.
              </p>
            </>
          )}

          {state === 'incomplete' && (
            <>
              <div className="w-12 h-12 rounded-full bg-status-warning-bg flex items-center justify-center mb-6">
                <AlertCircle className="w-5 h-5 text-status-warning-text" />
              </div>
              <h1 className="font-geist text-2xl font-medium tracking-tight text-foreground mb-2">
                Betalingsoppsettet er ikke fullført
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed mb-8">
                Det ser ut som oppsettet hos Stripe ikke ble fullført. Du kan prøve igjen eller gå tilbake til oversikten.
              </p>
              <div className="w-full space-y-3">
                <Button
                  onClick={handleRetry}
                  loading={isRetrying}
                  loadingText="Sender deg til Stripe …"
                  className="w-full h-11"
                >
                  Prøv igjen
                </Button>
                <Button asChild variant="outline-soft" className="w-full h-11">
                  <Link to="/teacher">Tilbake til oversikten</Link>
                </Button>
              </div>
            </>
          )}

          {state === 'error' && (
            <>
              <div className="w-12 h-12 rounded-full bg-status-error-bg flex items-center justify-center mb-6">
                <AlertCircle className="w-5 h-5 text-status-error-text" />
              </div>
              <h1 className="font-geist text-2xl font-medium tracking-tight text-foreground mb-2">
                Noe gikk galt
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed mb-8">
                {errorMessage || 'Kunne ikke bekrefte betalingsoppsettet. Prøv igjen.'}
              </p>
              <div className="w-full space-y-3">
                <Button
                  onClick={handleRetry}
                  loading={isRetrying}
                  loadingText="Sender deg til Stripe …"
                  className="w-full h-11"
                >
                  Prøv igjen
                </Button>
                <Button asChild variant="outline-soft" className="w-full h-11">
                  <Link to="/teacher">Tilbake til oversikten</Link>
                </Button>
              </div>
            </>
          )}

          {state === 'success' && (
            <>
              <div className="w-12 h-12 rounded-full bg-status-confirmed-bg flex items-center justify-center mb-6">
                <CheckCircle2 className="w-5 h-5 text-status-confirmed-text" />
              </div>
              <h1 className="font-geist text-2xl font-medium tracking-tight text-foreground mb-2">
                Betalinger er klare
              </h1>
              <p className="text-muted-foreground text-sm">
                Sender deg til oversikten
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default StripeCallbackPage;
