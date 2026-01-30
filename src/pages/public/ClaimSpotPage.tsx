import { useEffect, useState, useMemo, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Leaf, Loader2, Clock, Calendar, MapPin, CreditCard, XCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// Mock data for dev preview
const MOCK_CLAIM_DATA: ClaimData = {
  signup: {
    id: 'mock-signup-id',
    participant_name: 'Ola Nordmann',
    participant_email: 'ola@example.com',
    offer_expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(), // 12 hours from now
  },
  course: {
    id: 'mock-course-id',
    title: 'Yoga for nybegynnere',
    price: 450,
    start_date: '2025-02-15',
    time_schedule: '18:00-19:30',
    location: 'Studio Zen, Oslo',
  },
  organization: {
    id: 'mock-org-id',
    name: 'Yoga Studio',
    slug: 'yoga-studio',
  },
};

interface ClaimData {
  signup: {
    id: string;
    participant_name: string;
    participant_email: string;
    offer_expires_at: string;
  };
  course: {
    id: string;
    title: string;
    price: number;
    start_date: string;
    time_schedule: string;
    location: string;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
  };
}

const ClaimSpotPage = () => {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();

  // Dev preview mode: ?preview=expired | claimed | error | valid
  const previewMode = searchParams.get('preview');

  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [claimData, setClaimData] = useState<ClaimData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [alreadyClaimed, setAlreadyClaimed] = useState(false);

  useEffect(() => {
    // Dev preview mode - skip API call and set mock state
    if (previewMode) {
      setLoading(false);
      switch (previewMode) {
        case 'expired':
          setExpired(true);
          break;
        case 'claimed':
          setAlreadyClaimed(true);
          break;
        case 'error':
          setError('Dette er en test-feilmelding');
          break;
        case 'valid':
        default:
          setClaimData(MOCK_CLAIM_DATA);
          break;
      }
      return;
    }

    async function validateToken() {
      if (!token) {
        setError('Ugyldig lenke');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-claim-token`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({ token })
          }
        );

        const data = await response.json();

        if (!response.ok || !data.valid) {
          if (data.expired) {
            setExpired(true);
          } else if (data.claimed) {
            setAlreadyClaimed(true);
          } else {
            setError(data.error || 'Ugyldig lenke');
          }
        } else {
          setClaimData(data);
        }
      } catch (err) {
        logger.error('Error validating token:', err);
        setError('Kunne ikke sjekke lenken');
      } finally {
        setLoading(false);
      }
    }

    validateToken();
  }, [token, previewMode]);

  // Auto-updating countdown timer state
  const [currentTime, setCurrentTime] = useState(() => new Date());

  // Update the current time every minute for countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Calculate time remaining (auto-updates every minute)
  const timeRemaining = useMemo(() => {
    if (!claimData?.signup.offer_expires_at) return null;

    const expiresAt = new Date(claimData.signup.offer_expires_at);
    const diff = expiresAt.getTime() - currentTime.getTime();

    if (diff <= 0) return null;

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours} time${hours !== 1 ? 'r' : ''} og ${minutes} minutt${minutes !== 1 ? 'er' : ''}`;
    }
    return `${minutes} minutt${minutes !== 1 ? 'er' : ''}`;
  }, [claimData?.signup.offer_expires_at, currentTime]);

  // Format date for display
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'Ikke satt';
    const date = new Date(dateString);
    const days = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'];
    const months = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];
    return `${days[date.getDay()]}, ${date.getDate()}. ${months[date.getMonth()]}`;
  };

  // Extract time from time_schedule
  const extractTime = (timeSchedule: string | null): string => {
    if (!timeSchedule) return '';
    const match = timeSchedule.match(/(\d{1,2}:\d{2})/);
    return match ? match[1] : '';
  };

  const handleClaimSpot = useCallback(async () => {
    if (!claimData || !token) return;

    setClaiming(true);

    try {
      // Create checkout session with claim token
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            course_id: claimData.course.id,
            participant_name: claimData.signup.participant_name,
            participant_email: claimData.signup.participant_email,
            claim_token: token,
            signup_id: claimData.signup.id
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Kunne ikke starte betaling');
      }

      // Redirect to Stripe checkout
      if (data.checkout_url) {
        toast.info('Går til betaling');
        window.location.href = data.checkout_url;
      } else {
        throw new Error('Mangler checkout URL');
      }
    } catch (err) {
      logger.error('Error creating checkout:', err);
      toast.error(err instanceof Error ? err.message : 'Noe gikk galt');
      setClaiming(false);
    }
  }, [claimData, token]);

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-surface flex items-center justify-center font-geist">
        <div className="text-center" role="status" aria-live="polite">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">Sjekker lenke</p>
        </div>
      </div>
    );
  }

  // Expired state
  if (expired) {
    return (
      <div className="min-h-screen w-full bg-surface font-geist">
        <Header />
        <main className="pt-24 px-4 sm:px-6 pb-24">
          <div className="mx-auto max-w-lg text-center">
            <div className="rounded-3xl border border-status-waitlist-border bg-white p-8 md:p-12">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-status-waitlist-bg">
                <Clock className="h-8 w-8 text-status-waitlist-text" aria-hidden="true" />
              </div>
              <h1 className="font-geist text-2xl md:text-3xl font-medium text-text-primary mb-3">
                Fristen gikk ut
              </h1>
              <p className="text-muted-foreground mb-4">
                Fristen for å bekrefte gikk ut.
              </p>

              {/* Clear explanation of what happens next */}
              <div className="rounded-xl bg-surface p-4 mb-6 text-left">
                <p className="text-sm font-medium text-text-primary mb-2">Hva skjer videre?</p>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-text-tertiary mt-0.5">1.</span>
                    <span>Du er satt tilbake på ventelisten</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-text-tertiary mt-0.5">2.</span>
                    <span>Hvis en ny plass blir ledig, får du en ny e-post</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-text-tertiary mt-0.5">3.</span>
                    <span>Du har da 24 timer på å bekrefte</span>
                  </li>
                </ul>
              </div>

              <Button asChild variant="outline-soft">
                <Link to="/">Til forsiden</Link>
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Already claimed state
  if (alreadyClaimed) {
    return (
      <div className="min-h-screen w-full bg-surface font-geist">
        <Header />
        <main className="pt-24 px-4 sm:px-6 pb-24">
          <div className="mx-auto max-w-lg text-center">
            <div className="rounded-3xl bg-white p-8 md:p-12 border border-gray-200">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-status-confirmed-bg">
                <CheckCircle2 className="h-8 w-8 text-status-confirmed-text" />
              </div>
              <h1 className="font-geist text-2xl md:text-3xl font-medium text-text-primary mb-3">
                Plassen er allerede bekreftet
              </h1>
              <p className="text-muted-foreground mb-8">
                Du har allerede bekreftet plassen.
              </p>
              <Button asChild variant="outline-soft">
                <Link to="/student/bookings">Mine kurs</Link>
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Error state
  if (error || !claimData) {
    return (
      <div className="min-h-screen w-full bg-surface font-geist">
        <Header />
        <main className="pt-24 px-4 sm:px-6 pb-24">
          <div className="mx-auto max-w-lg text-center">
            <div className="rounded-3xl border border-destructive/30 bg-white p-8 md:p-12">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-status-error-bg">
                <XCircle className="h-8 w-8 text-status-error-text" />
              </div>
              <h1 className="font-geist text-2xl md:text-3xl font-medium text-text-primary mb-3">
                Ugyldig lenke
              </h1>
              <p className="text-muted-foreground mb-8">
                {error || 'Lenken er ugyldig. Sjekk at du kopierte hele lenken.'}
              </p>
              <Button asChild variant="outline-soft">
                <Link to="/">Til forsiden</Link>
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const studioUrl = claimData.organization?.slug
    ? `/studio/${claimData.organization.slug}`
    : '/';

  // Valid claim - show claim form
  return (
    <div className="min-h-screen w-full bg-surface font-geist">
      <Header studioUrl={studioUrl} />

      <main className="pt-20 sm:pt-24 px-4 sm:px-6 pb-[calc(6rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-4xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12 items-start">

            {/* Left Column: Claim Message */}
            <div className="flex flex-col justify-center text-center md:text-left pt-4 md:pt-8">
              <div className="mx-auto md:mx-0 mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-status-confirmed-bg text-status-confirmed-text text-sm font-medium">
                <CheckCircle2 className="h-4 w-4" />
                En plass er ledig
              </div>

              <h1 className="font-geist text-3xl md:text-4xl font-medium text-text-primary mb-4">
                Bekreft plassen din
              </h1>

              <p className="text-muted-foreground mb-4 text-base leading-relaxed">
                {claimData.signup.participant_name}, en plass har blitt ledig i <span className="font-medium text-text-primary">{claimData.course.title}</span>.
              </p>

              {/* Urgency box */}
              <div className="bg-status-waitlist-bg border border-status-waitlist-border rounded-2xl p-4 mb-6">
                <div className="flex items-center gap-2 text-status-waitlist-text">
                  <Clock className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                  <div>
                    <p className="font-medium">Fristen går snart ut</p>
                    {timeRemaining && (
                      <p className="text-sm text-status-waitlist-text/80" role="timer" aria-live="polite" aria-atomic="true">
                        {timeRemaining} igjen
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <Button
                onClick={handleClaimSpot}
                disabled={claiming}
                size="lg"
                className="w-full md:w-auto"
              >
                {claiming ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Går til betaling
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Betal {claimData.course.price} kr
                  </>
                )}
              </Button>

              <p className="text-xs text-muted-foreground mt-4">
                Du sendes til sikker betaling.
              </p>
            </div>

            {/* Right Column: Course Details */}
            <div className="rounded-3xl bg-white p-6 md:p-8 border border-gray-200 relative overflow-hidden">
              {/* Decorative background element */}
              <div className="absolute top-0 right-0 -mt-16 -mr-16 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />

              <h3 className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-6 relative z-10">
                Kursdetaljer
              </h3>

              <div className="space-y-5 relative z-10">
                <div className="pb-5 border-b border-gray-100">
                  <span className="block text-xs text-muted-foreground mb-1">Kurs</span>
                  <span className="block font-medium text-lg text-text-primary">{claimData.course.title}</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {claimData.course.start_date && (
                    <div>
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        <Calendar className="h-3.5 w-3.5" /> Dato
                      </span>
                      <span className="font-medium text-text-primary text-sm">
                        {formatDate(claimData.course.start_date)}
                      </span>
                    </div>
                  )}

                  {claimData.course.time_schedule && (
                    <div>
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        <Clock className="h-3.5 w-3.5" /> Tid
                      </span>
                      <span className="font-medium text-text-primary text-sm">
                        Kl {extractTime(claimData.course.time_schedule)}
                      </span>
                    </div>
                  )}
                </div>

                {claimData.course.location && (
                  <div>
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                      <MapPin className="h-3.5 w-3.5" /> Sted
                    </span>
                    <span className="font-medium text-text-primary text-sm">{claimData.course.location}</span>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CreditCard className="h-3.5 w-3.5" /> Pris
                  </span>
                  <span className="font-bold text-xl text-text-primary">{claimData.course.price} kr</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

// Header component
const Header = ({ studioUrl = '/' }: { studioUrl?: string }) => (
  <header className="fixed top-0 left-0 right-0 z-40 border-b border-gray-200 bg-surface/90 backdrop-blur-xl">
    <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
      <Link to={studioUrl} className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-gray-200 text-primary">
          <Leaf className="h-5 w-5" />
        </div>
        <span className="text-lg font-medium text-text-primary tracking-tight">Ease</span>
      </Link>
    </div>
  </header>
);

export default ClaimSpotPage;
