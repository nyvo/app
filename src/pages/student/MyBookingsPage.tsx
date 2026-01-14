import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, Loader2, Search, LogOut, X, AlertTriangle, CreditCard, Sparkles } from 'lucide-react';
import { pageVariants, pageTransition } from '@/lib/motion';
import { useAuth } from '@/contexts/AuthContext';
import { fetchMySignups, cancelMySignup, type StudentSignupWithCourse } from '@/services/studentSignups';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const MyBookingsPage = () => {
  const { user, profile, signOut } = useAuth();
  const [bookings, setBookings] = useState<StudentSignupWithCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<StudentSignupWithCourse | null>(null);

  useEffect(() => {
    async function loadBookings() {
      if (!user?.id || !profile?.email) return;

      setIsLoading(true);
      const { data, error } = await fetchMySignups(user.id, profile.email);

      if (!error) {
        setBookings(data || []);
      }

      setIsLoading(false);
    }

    loadBookings();
  }, [user?.id, profile?.email]);

  // Check if within 48 hours of course start
  const isWithin48Hours = (booking: StudentSignupWithCourse): boolean => {
    let eventDate: Date | null = null;

    if (booking.is_drop_in && booking.class_date) {
      eventDate = new Date(booking.class_date);
      if (booking.class_time) {
        const [hours, minutes] = booking.class_time.split(':').map(Number);
        eventDate.setHours(hours, minutes, 0, 0);
      }
    } else if (booking.course?.start_date) {
      eventDate = new Date(booking.course.start_date);
      if (booking.course.time_schedule) {
        const timeMatch = booking.course.time_schedule.match(/(\d{1,2}):(\d{2})/);
        if (timeMatch) {
          eventDate.setHours(parseInt(timeMatch[1]), parseInt(timeMatch[2]), 0, 0);
        }
      }
    }

    if (!eventDate) return false;

    const now = new Date();
    const hoursUntilEvent = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilEvent < 48;
  };

  const openCancelDialog = (booking: StudentSignupWithCourse) => {
    setBookingToCancel(booking);
    setCancelDialogOpen(true);
  };

  const handleCancelBooking = async () => {
    if (!bookingToCancel) return;

    setCancellingId(bookingToCancel.id);
    setCancelDialogOpen(false);

    const { data, error } = await cancelMySignup(bookingToCancel.id);

    if (error) {
      toast.error('Kunne ikke avbestille påmeldingen. Prøv igjen.');
    } else if (data) {
      // Remove from list
      setBookings(prev => prev.filter(b => b.id !== bookingToCancel.id));

      // Show appropriate message based on refund status
      if (data.refunded) {
        toast.success(`Avbestilling bekreftet. ${data.refund_amount} kr vil bli refundert.`);
      } else {
        toast.success('Avbestilling bekreftet. Ingen refusjon grunnet 48-timers avbestillingsfrist.');
      }
    }

    setCancellingId(null);
    setBookingToCancel(null);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  // Format course level
  const formatLevel = (level: string | null) => {
    if (!level) return null;
    const levelMap: Record<string, string> = {
      'alle': 'Alle nivåer',
      'nybegynner': 'Nybegynner',
      'viderekommen': 'Viderekommen'
    };
    return levelMap[level] || level;
  };

  // Filter bookings
  const filteredBookings = bookings.filter(booking => {
    if (filter === 'all') return true;

    const today = new Date().toISOString().split('T')[0];
    const courseDate = booking.course?.start_date || '';

    if (filter === 'upcoming') {
      return courseDate >= today;
    } else {
      return courseDate < today;
    }
  });

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
      className="min-h-screen bg-surface"
    >
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/student/dashboard" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm border border-border text-primary">
              <img src="/logo.svg" alt="Ease" className="h-5 w-5" />
            </div>
            <span className="font-geist text-lg font-semibold text-text-primary tracking-tight">
              Ease
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link to="/courses">
              <Button variant="outline-soft" size="compact">
                <Search className="h-3.5 w-3.5" />
                Finn kurs
              </Button>
            </Link>

            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-text-primary transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Logg ut
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-geist text-3xl font-semibold text-text-primary tracking-tight">
            Mine påmeldinger
          </h1>
          <p className="mt-2 text-muted-foreground">
            Oversikt over alle dine bokede timer
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 flex items-center gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-text-primary text-white'
                : 'bg-white border border-border text-muted-foreground hover:text-text-primary'
            }`}
          >
            Alle
          </button>
          <button
            onClick={() => setFilter('upcoming')}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
              filter === 'upcoming'
                ? 'bg-text-primary text-white'
                : 'bg-white border border-border text-muted-foreground hover:text-text-primary'
            }`}
          >
            Kommende
          </button>
          <button
            onClick={() => setFilter('past')}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
              filter === 'past'
                ? 'bg-text-primary text-white'
                : 'bg-white border border-border text-muted-foreground hover:text-text-primary'
            }`}
          >
            Tidligere
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Bookings List */}
        {!isLoading && (
          <div className="space-y-6">
            {filteredBookings.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-border bg-white p-12 text-center">
                <div className="mx-auto w-16 h-16 bg-surface-elevated border border-border rounded-full flex items-center justify-center mb-4">
                  <Calendar className="w-7 h-7 text-text-tertiary" />
                </div>
                <h3 className="font-geist text-lg font-semibold text-text-primary mb-2">
                  Ingen påmeldinger funnet
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  {filter === 'upcoming' && 'Du har ingen kommende timer.'}
                  {filter === 'past' && 'Du har ingen tidligere timer.'}
                  {filter === 'all' && 'Du har ingen påmeldinger ennå. Utforsk våre kurs og book din første time!'}
                </p>
                <Link to="/courses">
                  <Button className="rounded-xl">
                    Finn kurs
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredBookings.map((booking) => {
                  const isPast = booking.course?.start_date ? booking.course.start_date < new Date().toISOString().split('T')[0] : false;

                  return (
                    <div
                      key={booking.id}
                      className="rounded-3xl border border-border bg-white p-6 shadow-sm transition-all hover:border-ring hover:shadow-md"
                    >
                      <div className="flex items-start gap-6">
                        {/* Course Image */}
                        {booking.course?.image_url && (
                          <Link to={`/courses/${booking.course.id}`} className="flex-shrink-0">
                            <div className="h-24 w-24 overflow-hidden rounded-2xl">
                              <img
                                src={booking.course.image_url}
                                alt={booking.course.title}
                                className="h-full w-full object-cover transition-transform hover:scale-105"
                              />
                            </div>
                          </Link>
                        )}

                        {/* Course Details */}
                        <div className="flex-1 min-w-0">
                          <Link to={`/courses/${booking.course?.id}`}>
                            <h3 className="font-geist text-lg font-semibold text-text-primary tracking-tight hover:text-primary transition-colors">
                              {booking.course?.title}
                            </h3>
                          </Link>

                          {booking.course?.level && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatLevel(booking.course.level)}
                            </p>
                          )}

                          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                            {/* Date */}
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-text-tertiary" />
                              <span>{formatDate(booking.course?.start_date || null)}</span>
                            </div>

                            {/* Time */}
                            {booking.course?.time_schedule && (
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-text-tertiary" />
                                <span>{booking.course.time_schedule}</span>
                              </div>
                            )}

                            {/* Location */}
                            {booking.course?.location && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-text-tertiary" />
                                <span>{booking.course.location}</span>
                              </div>
                            )}
                          </div>

                          {/* Status & Actions */}
                          <div className="mt-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {/* Status Badge */}
                              {booking.status === 'confirmed' && (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-status-confirmed-bg px-3 py-1 text-xs font-medium text-status-confirmed-text">
                                  <span className="h-1.5 w-1.5 rounded-full bg-status-confirmed-text"></span>
                                  Bekreftet
                                </span>
                              )}
                              {booking.status === 'waitlist' && (
                                <>
                                  {booking.offer_status === 'pending' && booking.offer_expires_at ? (
                                    <div className="flex flex-col gap-1">
                                      <span className="inline-flex items-center gap-1.5 rounded-full bg-status-confirmed-bg px-3 py-1 text-xs font-medium text-status-confirmed-text">
                                        <Sparkles className="h-3 w-3" />
                                        Plass tilgjengelig!
                                      </span>
                                      <span className="text-xxs text-muted-foreground">
                                        Utløper {(() => {
                                          const expires = new Date(booking.offer_expires_at);
                                          const now = new Date();
                                          const diffMs = expires.getTime() - now.getTime();
                                          if (diffMs <= 0) return 'snart';
                                          const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                                          const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                                          if (diffHours > 0) return `om ${diffHours}t ${diffMins}m`;
                                          return `om ${diffMins}m`;
                                        })()}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                                      <span className="h-1.5 w-1.5 rounded-full bg-amber-700"></span>
                                      Venteliste {booking.waitlist_position && `(#${booking.waitlist_position})`}
                                    </span>
                                  )}
                                </>
                              )}

                              {/* Payment Badge */}
                              {booking.payment_status === 'paid' && (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                                  <span className="h-1.5 w-1.5 rounded-full bg-green-700"></span>
                                  Betalt
                                </span>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2">
                              {/* Claim Button - for waitlist with pending offer */}
                              {booking.status === 'waitlist' && booking.offer_status === 'pending' && booking.offer_claim_token && (
                                <Link to={`/claim-spot/${booking.offer_claim_token}`}>
                                  <Button size="compact">
                                    <CreditCard className="h-3.5 w-3.5" />
                                    Bekreft plass
                                  </Button>
                                </Link>
                              )}

                              {/* Cancel Button - only for upcoming bookings */}
                              {!isPast && (
                                <Button
                                  variant="outline-soft"
                                  size="compact"
                                  onClick={() => openCancelDialog(booking)}
                                  disabled={cancellingId === booking.id}
                                >
                                  {cancellingId === booking.id ? (
                                    <>
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      Avbestiller...
                                    </>
                                  ) : (
                                    <>
                                      <X className="h-3.5 w-3.5" />
                                      Avbestill
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Avbestill påmelding</DialogTitle>
            <DialogDescription>
              Er du sikker på at du vil avbestille din påmelding til{' '}
              <strong>{bookingToCancel?.course?.title}</strong>?
            </DialogDescription>
          </DialogHeader>

          {bookingToCancel && isWithin48Hours(bookingToCancel) && (
            <div className="flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200 p-4">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  Ingen refusjon tilgjengelig
                </p>
                <p className="text-sm text-amber-700 mt-1">
                  Siden det er mindre enn 48 timer til kursstart, kan vi dessverre ikke tilby refusjon i henhold til våre avbestillingsvilkår.
                </p>
              </div>
            </div>
          )}

          {bookingToCancel && !isWithin48Hours(bookingToCancel) && bookingToCancel.amount_paid && (
            <div className="flex items-start gap-3 rounded-xl bg-green-50 border border-green-200 p-4">
              <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs">✓</span>
              </div>
              <div>
                <p className="text-sm font-medium text-green-800">
                  Refusjon vil bli behandlet
                </p>
                <p className="text-sm text-green-700 mt-1">
                  {bookingToCancel.amount_paid} kr vil bli tilbakebetalt til din betalingsmetode innen 5-10 virkedager.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline-soft"
              onClick={() => setCancelDialogOpen(false)}
            >
              Avbryt
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelBooking}
            >
              Ja, avbestill
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default MyBookingsPage;
