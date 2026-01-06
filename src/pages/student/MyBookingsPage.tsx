import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, Loader2, Search, LogOut, X } from 'lucide-react';
import { pageVariants, pageTransition } from '@/lib/motion';
import { useAuth } from '@/contexts/AuthContext';
import { fetchMySignups, cancelMySignup, type StudentSignupWithCourse } from '@/services/studentSignups';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const MyBookingsPage = () => {
  const { user, profile, signOut } = useAuth();
  const [bookings, setBookings] = useState<StudentSignupWithCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');

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

  const handleCancelBooking = async (signupId: string) => {
    if (!confirm('Er du sikker på at du vil avbestille denne påmeldingen?')) {
      return;
    }

    setCancellingId(signupId);
    const { error } = await cancelMySignup(signupId);

    if (error) {
      toast.error('Kunne ikke avbestille påmeldingen. Prøv igjen.');
    } else {
      // Remove from list
      setBookings(prev => prev.filter(b => b.id !== signupId));
      toast.success('Påmeldingen ble avbestilt');
    }

    setCancellingId(null);
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
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                                  <span className="h-1.5 w-1.5 rounded-full bg-amber-700"></span>
                                  Venteliste {booking.waitlist_position && `(#${booking.waitlist_position})`}
                                </span>
                              )}

                              {/* Payment Badge */}
                              {booking.payment_status === 'paid' && (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                                  <span className="h-1.5 w-1.5 rounded-full bg-green-700"></span>
                                  Betalt
                                </span>
                              )}
                            </div>

                            {/* Cancel Button - only for upcoming bookings */}
                            {!isPast && (
                              <Button
                                variant="outline-soft"
                                size="compact"
                                onClick={() => handleCancelBooking(booking.id)}
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
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </motion.div>
  );
};

export default MyBookingsPage;
