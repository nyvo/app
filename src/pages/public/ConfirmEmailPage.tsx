import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { Infinity, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

const ConfirmEmailPage = () => {
  const location = useLocation();
  const email = (location.state as { email?: string })?.email ?? null;
  const [isResending, setIsResending] = useState(false);

  const handleResend = async () => {
    if (!email) return;

    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (error) {
        toast.error('Kunne ikke sende e-post', {
          description: error.message,
        });
      } else {
        toast.success('E-post sendt på nytt', {
          description: 'Sjekk innboksen din.',
        });
      }
    } catch {
      toast.error('Noe gikk galt. Prøv igjen.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-surface text-text-primary font-geist antialiased flex flex-col selection:bg-zinc-200 selection:text-zinc-900">
      {/* Header */}
      <header className="w-full pt-8 pb-4 px-6 flex items-center justify-center z-50 max-w-6xl mx-auto">
        <Link to="/" className="flex items-center gap-2 select-none">
          <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center text-white">
            <Infinity className="w-3.5 h-3.5" />
          </div>
          <span className="text-lg font-medium tracking-tighter text-text-primary">
            Ease
          </span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 w-full max-w-md mx-auto py-12">
        <div className="w-full flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mb-6">
            <Mail className="w-5 h-5 text-text-secondary" />
          </div>

          <h1 className="text-2xl font-medium tracking-tight text-text-primary mb-2">
            Sjekk e-posten din
          </h1>

          <p className="text-text-secondary text-sm leading-relaxed mb-8">
            {email ? (
              <>
                Vi har sendt en bekreftelseslenke til{' '}
                <span className="font-medium text-text-primary">{email}</span>.
                Du må bekrefte e-posten før du kan logge inn.
              </>
            ) : (
              'Vi har sendt en bekreftelseslenke til e-posten din. Du må bekrefte før du kan logge inn.'
            )}
          </p>

          <div className="w-full space-y-3">
            {email && (
              <Button
                onClick={handleResend}
                loading={isResending}
                loadingText="Sender..."
                variant="outline-soft"
                className="w-full h-11"
              >
                Send bekreftelse på nytt
              </Button>
            )}

            <Button asChild className="w-full h-11">
              <Link to="/login">Logg inn</Link>
            </Button>
          </div>

          <p className="text-xs text-text-tertiary mt-6">
            Hvis du ikke ser e-posten, sjekk søppelpost.
          </p>
        </div>
      </main>
    </div>
  );
};

export default ConfirmEmailPage;
