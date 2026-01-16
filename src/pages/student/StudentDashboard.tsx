import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Calendar,
  Clock,
  MapPin,
  Bell,
  Search,
  LogOut,
  User,
  CreditCard,
  Flame,
  Activity,
  MessageCircle,
  ArrowRight,
  Sparkles,
  CalendarPlus,
  Plus,
  Loader2,
} from 'lucide-react';
import { pageVariants, pageTransition } from '@/lib/motion';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  fetchUpcomingSignups,
  fetchMySignups,
  type StudentSignupWithCourse,
} from '@/services/studentSignups';
import { fetchPublicCourses, type PublicCourseWithDetails } from '@/services/publicCourses';

const StudentDashboard = () => {
  const { user, profile, signOut } = useAuth();
  const [upcomingBookings, setUpcomingBookings] = useState<StudentSignupWithCourse[]>([]);
  const [recommendations, setRecommendations] = useState<PublicCourseWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [streak, setStreak] = useState(0);
  const [totalClasses, setTotalClasses] = useState(0);

  useEffect(() => {
    async function loadData() {
      if (!user?.id || !profile?.email) return;

      setIsLoading(true);

      try {
        // Load upcoming bookings
        const { data: upcoming } = await fetchUpcomingSignups(user.id, profile.email);
        setUpcomingBookings(upcoming || []);

        // Load all signups to calculate stats
        const { data: allSignups } = await fetchMySignups(user.id, profile.email);
        if (allSignups) {
          // Calculate total confirmed classes
          const confirmed = allSignups.filter((s) => s.status === 'confirmed');
          setTotalClasses(confirmed.length);

          // Calculate streak (simple version - days with consecutive bookings)
          // For now, just use a placeholder - you can implement proper streak logic
          const hasRecentBookings = confirmed.some((s) => {
            const startDate = s.course?.start_date ? new Date(s.course.start_date) : null;
            const now = new Date();
            const daysDiff = startDate
              ? Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
              : 999;
            return daysDiff >= 0 && daysDiff <= 7;
          });
          setStreak(hasRecentBookings ? 4 : 0);
        }

        // Load recommended courses (limit to 2)
        const { data: courses } = await fetchPublicCourses({ limit: 2 });
        setRecommendations(courses || []);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [user?.id, profile?.email]);

  const handleSignOut = async () => {
    await signOut();
  };

  const formatInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('nb-NO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatLevel = (level: string | null) => {
    if (!level) return 'Alle nivåer';
    const levelMap: Record<string, string> = {
      alle: 'Alle nivåer',
      nybegynner: 'Nybegynner',
      viderekommen: 'Viderekommen',
    };
    return levelMap[level] || level;
  };

  const hasBookings = upcomingBookings.length > 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
      className="min-h-screen bg-surface flex flex-col"
    >
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/courses" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center text-white">
                <img src="/logo.svg" alt="Ease" className="h-5 w-5" />
              </div>
              <span className="font-semibold text-lg tracking-tight text-text-primary">Ease</span>
            </Link>

            {/* Right Actions */}
            <div className="flex items-center gap-4">
              {/* Find Course Button */}
              <Link to="/courses" className="hidden md:flex">
                <Button variant={hasBookings ? 'outline-soft' : 'default'} size="compact" className="gap-2">
                  {hasBookings ? (
                    <>
                      <Search className="w-4 h-4" />
                      Finn kurs
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Book et kurs
                    </>
                  )}
                </Button>
              </Link>

              {/* Notifications */}
              <button className="relative p-2 text-text-tertiary hover:text-muted-foreground transition-colors">
                <Bell className="w-5 h-5" />
                {hasBookings && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full border border-white" />
                )}
              </button>

              {/* Profile Dropdown */}
              <div className="flex items-center gap-3 pl-3 border-l border-border">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-3 focus:outline-none">
                      <div className="text-right hidden sm:block">
                        <p className="text-sm font-medium text-text-primary">
                          {profile?.name?.split(' ')[0] || 'Student'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {hasBookings ? 'Medlem' : 'Nytt medlem'}
                        </p>
                      </div>
                      <div
                        className={`h-9 w-9 rounded-full flex items-center justify-center border font-medium ${
                          hasBookings
                            ? 'bg-indigo-100 border-indigo-200 text-indigo-700'
                            : 'bg-surface-elevated border-border text-muted-foreground'
                        }`}
                      >
                        {formatInitials(profile?.name || 'Student')}
                      </div>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem>
                      <User className="w-4 h-4 mr-2" />
                      Profilinnstillinger
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Fakturering
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                      <LogOut className="w-4 h-4 mr-2" />
                      Logg ut
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <h1 className="font-geist text-3xl font-medium tracking-tight text-text-primary mb-2">
              Hei, {profile?.name?.split(' ')[0] || 'der'}! 👋
            </h1>
            <p className="text-base text-muted-foreground max-w-xl">
              {hasBookings
                ? `Du har ${upcomingBookings.length} kommende ${
                    upcomingBookings.length === 1 ? 'time' : 'timer'
                  } denne uken. Fortsett sånn!`
                : 'Timeplanen din er tom. Klar til å booke ditt første kurs?'}
            </p>
          </div>

          {/* Quick Stats */}
          <div className={`flex gap-4 ${!hasBookings && 'opacity-60 grayscale-[0.5]'}`}>
            <div className="bg-white px-4 py-3 rounded-xl shadow-sm flex items-center gap-3">
              <div
                className={`p-2 rounded-lg ${
                  hasBookings ? 'bg-orange-50 text-orange-600' : 'bg-surface-elevated text-text-tertiary'
                }`}
              >
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Streak</p>
                <p className="text-lg font-semibold text-text-primary leading-none">{streak} dager</p>
              </div>
            </div>
            <div className="bg-white px-4 py-3 rounded-xl shadow-sm flex items-center gap-3">
              <div
                className={`p-2 rounded-lg ${
                  hasBookings ? 'bg-blue-50 text-blue-600' : 'bg-surface-elevated text-text-tertiary'
                }`}
              >
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Timer</p>
                <p className="text-lg font-semibold text-text-primary leading-none">{totalClasses} totalt</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Upcoming Classes */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-medium text-text-primary">Kommende timer</h2>
              {hasBookings && (
                <Link
                  to="/student/bookings"
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                >
                  Se kalender <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>

            {hasBookings ? (
              /* Booking Cards */
              upcomingBookings.map((booking, index) => (
                <div
                  key={booking.id}
                  className={`group bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden ${
                    index > 0 && 'opacity-90 hover:opacity-100'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row">
                    {/* Image */}
                    <div className="sm:w-48 h-48 sm:h-auto relative shrink-0">
                      {booking.course?.image_url ? (
                        <img
                          src={booking.course.image_url}
                          alt={booking.course.title}
                          className={`w-full h-full object-cover ${
                            booking.status === 'waitlist' && 'grayscale group-hover:grayscale-0'
                          } transition-all duration-300`}
                        />
                      ) : (
                        <div className="w-full h-full bg-surface-elevated flex items-center justify-center">
                          <Calendar className="w-12 h-12 text-text-tertiary" />
                        </div>
                      )}
                      <div
                        className={`absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-medium border flex items-center gap-1.5 shadow-sm ${
                          booking.status === 'confirmed'
                            ? 'text-status-confirmed-text border-status-confirmed-border'
                            : 'text-text-secondary border-border'
                        }`}
                      >
                        {booking.status === 'confirmed' && (
                          <span className="w-1.5 h-1.5 bg-status-confirmed-text rounded-full animate-pulse" />
                        )}
                        {booking.status === 'confirmed' ? 'Bekreftet' : 'Venteliste'}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 flex flex-col justify-between flex-grow">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="text-xl font-medium tracking-tight text-text-primary">
                              {booking.course?.title || 'Uten tittel'}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {formatLevel(booking.course?.level || null)}
                              {booking.course?.style?.name && ` • ${booking.course.style.name}`}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-3 mt-4">
                          <div className="flex items-center gap-3 text-muted-foreground">
                            <Calendar className="w-4 h-4 text-text-tertiary" />
                            <span className="text-sm">{formatDate(booking.course?.start_date || null)}</span>
                          </div>
                          {booking.course?.time_schedule && (
                            <div className="flex items-center gap-3 text-muted-foreground">
                              <Clock className="w-4 h-4 text-text-tertiary" />
                              <span className="text-sm">
                                {booking.course.time_schedule}
                                {booking.course.duration && ` (${booking.course.duration} min)`}
                              </span>
                            </div>
                          )}
                          {booking.course?.location && (
                            <div className="flex items-center gap-3 text-muted-foreground">
                              <MapPin className="w-4 h-4 text-text-tertiary" />
                              <span className="text-sm">{booking.course.location}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions Footer */}
                      <div className="mt-6 pt-4 border-t border-border flex items-center justify-between gap-3">
                        <button className="text-sm font-medium text-muted-foreground hover:text-text-primary transition-colors flex items-center gap-2">
                          <MessageCircle className="w-4 h-4" />
                          Send melding
                        </button>
                        <button
                          className={`px-4 py-2 rounded-lg bg-white border text-sm font-medium transition-all flex items-center gap-2 ${
                            booking.status === 'confirmed'
                              ? 'border-border text-destructive hover:bg-red-50 hover:border-red-100'
                              : 'border-border text-muted-foreground hover:text-destructive hover:bg-red-50 hover:border-red-100'
                          }`}
                        >
                          {booking.status === 'confirmed' ? 'Avbestill' : 'Forlat venteliste'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              /* Empty State */
              <div className="bg-white rounded-2xl border-2 border-dashed border-border h-[400px] flex flex-col items-center justify-center text-center p-8 group hover:border-ring transition-colors">
                <div className="w-16 h-16 bg-surface-elevated rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 ease-out">
                  <CalendarPlus className="w-8 h-8 text-text-tertiary group-hover:text-indigo-500 transition-colors" />
                </div>

                <h3 className="text-lg font-medium text-text-primary mb-2">Ingen kommende timer</h3>
                <p className="text-muted-foreground max-w-xs mx-auto mb-8 text-sm">
                  Du har ikke booket noen timer ennå. Utforsk timeplanen for å finne et kurs som passer deg.
                </p>

                <Link to="/courses">
                  <Button className="gap-2">
                    <Search className="w-4 h-4" />
                    Se timeplan
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Right Column: Membership & Recommendations */}
          <div className="space-y-6">
            {/* Membership Card */}
            {hasBookings ? (
              <div className="bg-gray-900 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-indigo-500 rounded-full opacity-20 blur-xl" />
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">Medlemskap</p>
                      <p className="text-lg font-medium">Ubegrenset månedlig</p>
                    </div>
                    <Sparkles className="text-indigo-400 w-5 h-5" />
                  </div>
                  <div className="flex items-center justify-between mt-8">
                    <div className="text-sm text-gray-300">
                      Fornyes <span className="text-white font-medium">1. feb 2026</span>
                    </div>
                    <button className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors border border-white/10">
                      Administrer
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-6 shadow-sm relative overflow-hidden">
                <div className="flex flex-col items-start">
                  <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 mb-4">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-medium text-text-primary mb-1">Ingen aktivt medlemskap</h3>
                  <p className="text-sm text-muted-foreground mb-5">
                    Meld deg på en plan for å få ubegrensede timer og eksklusive fordeler.
                  </p>

                  <button className="w-full py-2 px-4 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 text-sm font-medium hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2">
                    Se planer <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Recommended Classes */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h3 className="text-base font-medium text-text-primary mb-4">
                {hasBookings ? 'Anbefalt for deg' : 'Populære førstegangskurs'}
              </h3>
              <div className="space-y-4">
                {recommendations.length > 0 ? (
                  recommendations.map((rec, index) => (
                    <div key={rec.id}>
                      {index > 0 && <div className="h-px bg-border mb-4" />}
                      <Link to={`/courses/${rec.id}`} className="flex gap-3 group cursor-pointer">
                        <div className="w-16 h-16 rounded-lg bg-surface-elevated overflow-hidden shrink-0">
                          {rec.image_url ? (
                            <img
                              src={rec.image_url}
                              alt={rec.title}
                              className={`w-full h-full object-cover ${
                                !hasBookings && 'grayscale'
                              } group-hover:grayscale-0 transition-all duration-300`}
                            />
                          ) : (
                            <div className="w-full h-full bg-surface-elevated flex items-center justify-center">
                              <Calendar className="w-6 h-6 text-text-tertiary" />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col justify-center">
                          <p className="text-sm font-medium text-text-primary group-hover:text-indigo-600 transition-colors">
                            {rec.title}
                          </p>
                          <p className="text-xs text-muted-foreground mb-1">
                            {hasBookings
                              ? `${rec.time_schedule || 'Tid ikke fastsatt'} • ${
                                  rec.spots_available > 0 ? `${rec.spots_available} plasser igjen` : 'Fullt'
                                }`
                              : 'Perfekt for nybegynnere'}
                          </p>
                          <span className="text-xs font-medium text-indigo-600 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {hasBookings ? 'Book nå' : 'Se detaljer'} <ArrowRight className="w-3 h-3" />
                          </span>
                        </div>
                      </Link>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">Ingen kurs tilgjengelig for øyeblikket</p>
                )}
              </div>
              <Link to="/courses">
                <button className="w-full mt-5 py-2.5 text-sm font-medium text-muted-foreground bg-surface-elevated hover:bg-gray-100 rounded-lg transition-colors">
                  Se alle kurs
                </button>
              </Link>
            </div>

            {/* Help Link */}
            <div className="flex justify-center">
              <a href="#" className="text-sm text-text-tertiary hover:text-muted-foreground transition-colors">
                {hasBookings ? 'Trenger du hjelp med booking?' : 'Hvordan fungerer booking?'}
              </a>
            </div>
          </div>
        </div>
      </main>
    </motion.div>
  );
};

export default StudentDashboard;
