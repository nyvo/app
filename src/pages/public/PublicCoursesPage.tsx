import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  MapPin,
  Flame,
  Leaf,
  Layers,
  Sun,
  Loader2,
  User,
  LogOut,
  BookOpen,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchPublicCourses, type PublicCourseWithDetails } from '@/services/publicCourses';
import { fetchOrganizationBySlug } from '@/services/organizations';
import { fetchMySignups } from '@/services/studentSignups';
import { useAuth } from '@/contexts/AuthContext';
import type { Organization } from '@/types/database';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Helper to format date for display
function formatCourseDate(dateString: string | null): { month: string; day: string; dayName: string; fullDate: string } {
  if (!dateString) {
    return { month: '—', day: '—', dayName: '', fullDate: 'Dato ikke satt' };
  }

  const date = new Date(dateString);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'];
  const days = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'];
  const shortDays = ['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør'];

  return {
    month: months[date.getMonth()],
    day: String(date.getDate()).padStart(2, '0'),
    dayName: days[date.getDay()],
    fullDate: `${shortDays[date.getDay()]}, ${date.getDate()}. ${months[date.getMonth()]}`
  };
}

// Extract time from time_schedule (e.g., "Mandager, 18:00" -> "18:00")
function extractTime(timeSchedule: string | null): string {
  if (!timeSchedule) return '';
  const match = timeSchedule.match(/(\d{1,2}:\d{2})/);
  return match ? `Kl ${match[1]}` : '';
}

// Extract day name from time_schedule (e.g., "Mandager, 18:00" -> "Mandag")
function extractDayName(timeSchedule: string | null): string {
  if (!timeSchedule) return '';
  const dayMatch = timeSchedule.match(/^(\w+)/);
  if (!dayMatch) return '';
  const day = dayMatch[1].toLowerCase();
  // Map plural forms to singular, fallback capitalizes any format
  const pluralToSingular: Record<string, string> = {
    'mandager': 'Mandag',
    'tirsdager': 'Tirsdag',
    'onsdager': 'Onsdag',
    'torsdager': 'Torsdag',
    'fredager': 'Fredag',
    'lørdager': 'Lørdag',
    'søndager': 'Søndag',
  };
  return pluralToSingular[day] || day.charAt(0).toUpperCase() + day.slice(1);
}

// Format date range for multi-day events (e.g., "15. - 17. januar")
function formatDateRange(startDate: string | null, endDate: string | null): string | null {
  if (!startDate) return null;

  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : null;

  // If no end date or same as start, return null (use day name instead)
  if (!end || start.getTime() === end.getTime()) return null;

  const startDay = start.getDate();
  const endDay = end.getDate();
  const months = ['januar', 'februar', 'mars', 'april', 'mai', 'juni',
                  'juli', 'august', 'september', 'oktober', 'november', 'desember'];

  // Same month
  if (start.getMonth() === end.getMonth()) {
    return `${startDay}. - ${endDay}. ${months[start.getMonth()]}`;
  }

  // Different months
  const startMonth = months[start.getMonth()].slice(0, 3);
  const endMonth = months[end.getMonth()].slice(0, 3);
  return `${startDay}. ${startMonth} - ${endDay}. ${endMonth}`;
}

// Check if a course is currently ongoing (started but not ended)
function isOngoingCourse(startDate: string | null, endDate: string | null): boolean {
  if (!startDate) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  if (start > today) return false; // Not started yet

  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    return end >= today; // Ongoing if end date is today or future
  }

  return true; // No end date = ongoing if started
}

const PublicCoursesPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user, userType, profile, signOut } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [courses, setCourses] = useState<PublicCourseWithDetails[]>([]);
  const [archivedCourses, setArchivedCourses] = useState<PublicCourseWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signedUpCourseIds, setSignedUpCourseIds] = useState<Set<string>>(new Set());
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [showArchive, setShowArchive] = useState(false);

  // Select course list based on tab
  const displayedCourses = showArchive ? archivedCourses : courses;

  // Extract unique styles from displayed courses
  const availableStyles = displayedCourses
    .map(course => course.style)
    .filter((style): style is NonNullable<typeof style> => style !== null && style !== undefined)
    .filter((style, index, self) => self.findIndex(s => s.id === style.id) === index)
    .sort((a, b) => a.name.localeCompare(b.name));

  // Filter courses by selected style
  const filteredCourses = selectedStyle
    ? displayedCourses.filter(course => course.style?.id === selectedStyle)
    : displayedCourses;

  useEffect(() => {
    async function loadData() {
      if (!slug) {
        setError('Ugyldig studio-URL');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      // Fetch organization by slug
      const { data: orgData, error: orgError } = await fetchOrganizationBySlug(slug);

      if (orgError || !orgData) {
        setError('Fant ikke studioet');
        setLoading(false);
        return;
      }

      setOrganization(orgData);

      // Fetch active and archived courses for this organization
      const [activeResult, archivedResult] = await Promise.all([
        fetchPublicCourses({ organizationSlug: slug }),
        fetchPublicCourses({ organizationSlug: slug, includePast: true })
      ]);

      if (activeResult.error) {
        setError('Kunne ikke laste kurs');
        setLoading(false);
        return;
      }

      setCourses(activeResult.data || []);
      setArchivedCourses(archivedResult.data || []);

      // Load student's signups if authenticated
      if (user && profile?.email) {
        const { data: signups } = await fetchMySignups(user.id, profile.email);
        if (signups) {
          const courseIds = new Set(
            signups
              .filter((s) => s.status !== 'cancelled')
              .map((s) => s.course_id)
          );
          setSignedUpCourseIds(courseIds);
        }
      }

      setLoading(false);
    }

    loadData();
  }, [slug, user, profile?.email]);

  const isEmpty = !loading && courses.length === 0 && organization;

  return (
    <>
      <style>{`
        @keyframes slideDown {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-down {
            animation: slideDown 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .scrollbar-hide::-webkit-scrollbar {
            display: none;
        }
        .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
      `}</style>

      <div className="min-h-screen w-full bg-surface text-sidebar-foreground overflow-x-hidden">
        {/* Navbar */}
        <nav className="sticky top-0 z-50 w-full border-b border-border bg-white/80 backdrop-blur-md">
          <div className="mx-auto flex h-20 max-w-5xl items-center justify-between px-6">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface border border-border group-hover:bg-surface-elevated transition-colors">
                <Leaf className="h-5 w-5 text-text-primary" />
              </div>
              <span className="text-lg font-medium tracking-tight text-text-primary">Ease</span>
            </Link>

            {user && userType === 'student' ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline-soft" size="compact" className="gap-2">
                    <User className="h-3.5 w-3.5" />
                    {profile?.name?.split(' ')[0] || 'Min profil'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link to="/student/dashboard" className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      Mine påmeldinger
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={signOut} className="flex items-center gap-2 text-status-error-text">
                    <LogOut className="h-4 w-4" />
                    Logg ut
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild size="compact">
                <Link to="/student/login">Logg inn</Link>
              </Button>
            )}
          </div>
        </nav>

        <main className="mx-auto max-w-5xl px-6 py-12">
          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-8 w-8 animate-spin text-text-tertiary" />
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="rounded-2xl border border-border bg-white p-12 shadow-sm text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-surface-elevated border border-border">
                <Sun className="h-7 w-7 text-text-tertiary" />
              </div>
              <h3 className="font-geist text-lg font-semibold text-text-primary mb-2">
                {error}
              </h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-6">
                Sjekk at URL-en er riktig, eller gå tilbake til forsiden.
              </p>
              <Button asChild variant="outline-soft" size="compact">
                <Link to="/">Gå til forsiden</Link>
              </Button>
            </div>
          )}

          {/* Organization Found - Show Content */}
          {organization && !loading && !error && (
            <>
              {/* Studio Profile Section */}
              <div className="mb-12 flex flex-col gap-8 border-b border-border pb-12 sm:flex-row sm:items-start sm:gap-8">
                {/* Studio Avatar */}
                <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-border shadow-sm">
                  {organization.logo_url ? (
                    <img
                      src={organization.logo_url}
                      alt={organization.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-surface-elevated flex items-center justify-center">
                      <span className="text-2xl font-semibold text-text-tertiary">
                        {organization.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Studio Info */}
                <div className="flex flex-1 flex-col gap-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h1 className="text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">
                        {organization.name}
                      </h1>
                      <div className="mt-2 flex items-center gap-4 text-sm font-medium text-muted-foreground">
                        {organization.city && (
                          <div className="flex items-center gap-1.5 hover:text-text-primary transition-colors cursor-pointer">
                            <MapPin className="h-4 w-4" />
                            {organization.city}
                          </div>
                        )}
                        {/* Instagram placeholder - can be added to org settings later */}
                      </div>
                    </div>

                    {/* Open for booking badge */}
                    {courses.length > 0 && (
                      <div className="inline-flex items-center gap-2 rounded-full border border-status-confirmed-border bg-status-confirmed-bg/50 px-3 py-1 text-xs font-medium text-status-confirmed-text w-fit">
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-status-confirmed-text opacity-75"></span>
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-status-confirmed-text"></span>
                        </span>
                        Åpent for booking
                      </div>
                    )}
                  </div>

                  {organization.description && (
                    <p className="max-w-2xl text-lg text-muted-foreground font-normal leading-relaxed">
                      {organization.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Tabs & Filters */}
              <div className="mb-8 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => { setShowArchive(false); setSelectedStyle(null); }}
                    className={`text-xl font-semibold tracking-tight transition-colors ${
                      !showArchive ? 'text-text-primary' : 'text-muted-foreground hover:text-text-secondary'
                    }`}
                  >
                    Kommende Kurs
                    {courses.length > 0 && (
                      <span className="ml-2 text-sm font-normal text-muted-foreground">({courses.length})</span>
                    )}
                  </button>
                  {archivedCourses.length > 0 && (
                    <button
                      onClick={() => { setShowArchive(true); setSelectedStyle(null); }}
                      className={`text-xl font-semibold tracking-tight transition-colors ${
                        showArchive ? 'text-text-primary' : 'text-muted-foreground hover:text-text-secondary'
                      }`}
                    >
                      Arkiv
                      <span className="ml-2 text-sm font-normal text-muted-foreground">({archivedCourses.length})</span>
                    </button>
                  )}
                </div>

                {!isEmpty && availableStyles.length > 0 && (
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="compact"
                        variant={selectedStyle === null ? 'default' : 'outline-soft'}
                        onClick={() => setSelectedStyle(null)}
                      >
                        Alle kurs
                      </Button>
                      {availableStyles.map((style) => (
                        <Button
                          key={style.id}
                          size="compact"
                          variant={selectedStyle === style.id ? 'default' : 'outline-soft'}
                          onClick={() => setSelectedStyle(style.id)}
                        >
                          {style.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Empty State */}
              {isEmpty && (
                <div className="rounded-2xl border border-border bg-white p-12 shadow-sm text-center">
                  <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/50">
                    <Sun className="h-7 w-7 text-amber-500" />
                  </div>
                  <h3 className="font-geist text-lg font-semibold text-text-primary mb-2">
                    {showArchive ? 'Ingen tidligere kurs' : 'Ingen aktive kurs'}
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                    {showArchive
                      ? 'Det finnes ingen avsluttede kurs ennå.'
                      : `${organization.name} jobber med nye kurs. Kom tilbake snart!`
                    }
                  </p>
                </div>
              )}

              {/* Course List */}
              <div className="flex flex-col gap-5">
                {filteredCourses.map((course) => {
                  // For ongoing courses with sessions, use next session date; otherwise use start_date
                  const displayDate = (course.next_session?.session_date) || course.start_date;
                  const dateInfo = formatCourseDate(displayDate);
                  const time = extractTime(course.time_schedule);
                  const dayName = extractDayName(course.time_schedule);
                  const isFull = course.spots_available === 0;
                  const isFewSpots = course.spots_available > 0 && course.spots_available <= 3;
                  const isSeries = course.course_type === 'course-series';
                  const isSignedUp = signedUpCourseIds.has(course.id);
                  const isOngoing = isOngoingCourse(course.start_date, course.end_date);
                  const hasWeekProgress = isOngoing && course.next_session && course.next_session.total_sessions > 1;

                  return (
                    <div
                      key={course.id}
                      className={`group relative flex flex-col gap-6 rounded-2xl border p-6 shadow-sm transition-all sm:flex-row sm:items-start ${
                        isFull
                          ? 'border-border bg-surface/50 opacity-90'
                          : 'border-border bg-white hover:border-ring hover:shadow-md'
                      }`}
                    >
                      {/* Date Widget */}
                      <div className="flex shrink-0 flex-row items-center gap-4 sm:flex-col sm:items-start">
                        <div className={`flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl border text-center ${
                          isFull
                            ? 'bg-surface-elevated/50 border-border'
                            : 'bg-surface border-border'
                        }`}>
                          <span className={`text-[10px] uppercase font-semibold tracking-wider ${
                            isFull ? 'text-text-tertiary' : 'text-muted-foreground'
                          }`}>{dateInfo.month}</span>
                          <span className={`text-xl font-medium tracking-tight ${
                            isFull ? 'text-text-tertiary' : 'text-text-primary'
                          }`}>{dateInfo.day}</span>
                        </div>
                      </div>

                      {/* Main Content */}
                      <div className="flex flex-1 flex-col gap-3">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-3">
                              <h3 className={`text-xl font-medium tracking-tight transition-colors ${
                                isFull
                                  ? 'text-muted-foreground'
                                  : 'text-text-primary group-hover:text-sidebar-foreground'
                              }`}>
                                {course.title}
                              </h3>
                              {isSeries && (
                                <span className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                  <Layers className="h-3 w-3" />
                                  Kursrekke
                                </span>
                              )}
                              {isOngoing && (
                                <span className="inline-flex items-center gap-1 rounded-md border border-status-confirmed-border bg-status-confirmed-bg px-2 py-0.5 text-xs font-medium text-status-confirmed-text">
                                  <span className="h-1.5 w-1.5 rounded-full bg-status-confirmed-text animate-pulse"></span>
                                  Pågående
                                </span>
                              )}
                              {hasWeekProgress && (
                                <span className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                  Uke {course.next_session!.session_number} av {course.next_session!.total_sessions}
                                </span>
                              )}
                              {isSignedUp && (
                                <span className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Påmeldt
                                </span>
                              )}
                            </div>
                            <div className={`mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm ${
                              isFull ? 'text-text-tertiary' : 'text-muted-foreground'
                            }`}>
                              <div className="flex items-center gap-1.5">
                                <MapPin className="h-4 w-4 text-text-tertiary" />
                                <span>{course.location || 'Sted ikke angitt'}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Clock className="h-4 w-4 text-text-tertiary" />
                                <span>{formatDateRange(course.start_date, course.end_date) || (dayName || dateInfo.dayName) || 'Tid ikke satt'}{time && ` ${time}`}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action / Price */}
                      <div className="mt-2 flex w-full flex-row items-center justify-between border-t border-border pt-4 sm:mt-0 sm:w-auto sm:flex-col sm:items-end sm:border-0 sm:pt-0">
                        <div className="text-right">
                          <span className={`block text-lg font-medium tracking-tight ${
                            isFull ? 'text-text-tertiary' : 'text-text-primary'
                          }`}>{course.price || 0} kr</span>
                          {isSignedUp ? (
                            <div className="mt-1 flex items-center justify-end gap-1.5 text-xs font-medium text-indigo-700">
                              <CheckCircle2 className="h-3 w-3" />
                              Du er påmeldt
                            </div>
                          ) : isFull ? (
                            <div className="mt-1 text-xs font-medium text-muted-foreground">
                              Fullt kurs
                            </div>
                          ) : isFewSpots ? (
                            <div className="mt-1 flex items-center justify-end gap-1.5 text-xs font-medium text-status-waitlist-text">
                              <Flame className="h-3 w-3 fill-current" />
                              {course.spots_available} {course.spots_available === 1 ? 'plass' : 'plasser'} igjen
                            </div>
                          ) : (
                            <div className="mt-1 flex items-center justify-end gap-1.5 text-xs font-medium text-status-confirmed-text">
                              <span className="h-1.5 w-1.5 rounded-full bg-status-confirmed-text"></span>
                              {course.spots_available} plasser igjen
                            </div>
                          )}
                        </div>
                        <Button
                          asChild={!isFull && !isSignedUp}
                          disabled={isFull || isSignedUp}
                          size="compact"
                          className="mt-0 sm:mt-4"
                        >
                          {isFull ? (
                            <span>Sett på venteliste</span>
                          ) : isSignedUp ? (
                            <span>Allerede påmeldt</span>
                          ) : (
                            <Link to={`/studio/${slug}/${course.id}`}>
                              Påmelding
                            </Link>
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </main>
      </div>
    </>
  );
};

export default PublicCoursesPage;
