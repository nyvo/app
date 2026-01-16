import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  MapPin,
  Leaf,
  Loader2,
  User,
  LogOut,
  BookOpen,
  CheckCircle2,
  Calendar,
  Layers,
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

// Format date range for multi-day events
function formatDateRange(startDate: string | null, endDate: string | null): string | null {
  if (!startDate) return null;

  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : null;

  if (!end || start.getTime() === end.getTime()) return null;

  const startDay = start.getDate();
  const endDay = end.getDate();
  const months = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];

  if (start.getMonth() === end.getMonth()) {
    return `${startDay}.–${endDay}. ${months[start.getMonth()]}`;
  }

  const startMonth = months[start.getMonth()];
  const endMonth = months[end.getMonth()];
  return `${startDay}. ${startMonth} – ${endDay}. ${endMonth}`;
}

// Minimal date formatter
function formatMinimalDate(dateString: string | null, timeSchedule: string | null): string {
  if (!dateString) return 'Dato kommer';
  
  const date = new Date(dateString);
  const days = ['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør'];
  const months = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];
  
  const dayName = days[date.getDay()];
  const day = date.getDate();
  const month = months[date.getMonth()];
  
  let timePart = '';
  if (timeSchedule) {
      const match = timeSchedule.match(/(\d{1,2}:\d{2})/);
      if (match) timePart = `, ${match[1]}`;
  }
  
  return `${dayName} ${day}. ${month}${timePart}`;
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

      // Fetch active and archived courses
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
    <div className="min-h-screen w-full bg-surface text-sidebar-foreground overflow-x-hidden font-sans">
      {/* Minimal Navbar */}
      <nav className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-gray-100/50">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface shadow-sm group-hover:shadow-md transition-shadow">
              <Leaf className="h-4 w-4 text-text-primary" />
            </div>
            <span className="text-sm font-medium tracking-tight text-text-primary">Ease</span>
          </Link>

          {user && userType === 'student' ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="compact" className="gap-2 text-text-secondary hover:text-text-primary">
                  <User className="h-3.5 w-3.5" />
                  {profile?.name?.split(' ')[0] || 'Profil'}
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
            <Button asChild variant="ghost" size="compact" className="text-text-secondary hover:text-text-primary">
              <Link to="/student/login">Logg inn</Link>
            </Button>
          )}
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-text-tertiary" />
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <h3 className="text-lg font-medium text-text-primary mb-2">{error}</h3>
            <Button asChild variant="link" className="text-muted-foreground">
              <Link to="/">Gå til forsiden</Link>
            </Button>
          </div>
        )}

        {/* Organization Content */}
        {organization && !loading && !error && (
          <>
            {/* 1. Header Section - Minimal & Clean */}
            <header className="mb-16">
              <div className="flex flex-col items-start gap-6">
                {/* Logo */}
                <div className="h-16 w-16 overflow-hidden rounded-xl bg-surface-elevated shadow-sm">
                  {organization.logo_url ? (
                    <img
                      src={organization.logo_url}
                      alt={organization.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-text-tertiary">
                      <span className="text-xl font-medium">
                        {organization.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Text Info */}
                <div className="space-y-3">
                  <h1 className="text-3xl font-medium tracking-tight text-text-primary sm:text-4xl">
                    {organization.name}
                  </h1>
                  
                  <div className="flex items-center gap-3 text-sm text-text-secondary">
                    {organization.city && (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-text-tertiary" />
                        {organization.city}
                      </span>
                    )}
                  </div>

                  {organization.description && (
                    <p className="max-w-2xl text-base text-muted-foreground leading-relaxed pt-2">
                      {organization.description}
                    </p>
                  )}
                </div>
              </div>
            </header>

            {/* 2. Filters & Navigation */}
            <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between sticky top-20 z-40 bg-surface/95 backdrop-blur py-2 -mx-2 px-2">
              {/* Tabs */}
              <div className="flex items-center gap-1 bg-surface-elevated p-1 rounded-lg self-start">
                <button
                  onClick={() => { setShowArchive(false); setSelectedStyle(null); }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    !showArchive 
                      ? 'bg-white text-text-primary shadow-sm' 
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Kommende
                </button>
                {archivedCourses.length > 0 && (
                  <button
                    onClick={() => { setShowArchive(true); setSelectedStyle(null); }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      showArchive 
                        ? 'bg-white text-text-primary shadow-sm' 
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    Tidligere
                  </button>
                )}
              </div>

              {/* Style Pills */}
              {!isEmpty && availableStyles.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setSelectedStyle(null)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      selectedStyle === null
                        ? 'bg-text-primary text-white border-text-primary'
                        : 'bg-transparent border-border text-text-secondary hover:border-text-secondary'
                    }`}
                  >
                    Alle
                  </button>
                  {availableStyles.map((style) => (
                    <button
                      key={style.id}
                      onClick={() => setSelectedStyle(style.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        selectedStyle === style.id
                          ? 'bg-text-primary text-white border-text-primary'
                          : 'bg-transparent border-border text-text-secondary hover:border-text-secondary'
                      }`}
                    >
                      {style.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Empty State */}
            {isEmpty && (
              <div className="flex flex-col items-center justify-center py-16 text-center border rounded-2xl border-border bg-white/50">
                <p className="text-sm font-medium text-text-primary">Ingen aktive kurs</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {showArchive
                    ? 'Det finnes ingen avsluttede kurs ennå.'
                    : 'Det er ingen planlagte kurs for øyeblikket.'}
                </p>
              </div>
            )}

            {/* 3. Course List */}
            <div className="space-y-4">
              {filteredCourses.map((course) => {
                const isFull = course.spots_available === 0;
                const isSignedUp = signedUpCourseIds.has(course.id);
                const isSeries = course.course_type === 'course-series';
                
                // Date formatting
                const displayDate = (course.next_session?.session_date) || course.start_date;
                const rangeString = formatDateRange(course.start_date, course.end_date);
                const dateString = rangeString || formatMinimalDate(displayDate, course.time_schedule);
                
                return (
                  <Link
                    key={course.id}
                    to={`/studio/${slug}/${course.id}`}
                    className={`group block relative rounded-xl bg-white p-5 shadow-sm transition-all hover:shadow-md ${
                      isFull ? 'opacity-75 bg-surface/50' : ''
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      {/* Left: Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <h3 className="text-base font-medium text-text-primary truncate pr-2 group-hover:text-sidebar-foreground transition-colors">
                            {course.title}
                          </h3>
                          
                          {/* Minimal Inline Badges */}
                          {isSignedUp && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700">
                              <CheckCircle2 className="h-3 w-3" />
                              Påmeldt
                            </span>
                          )}
                          {isSeries && !isSignedUp && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-surface-elevated px-2 py-0.5 text-[10px] font-medium text-text-secondary">
                              <Layers className="h-3 w-3" />
                              Kursrekke
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-text-tertiary" />
                            {dateString}
                          </span>
                          <span className="text-border">•</span>
                          <span className="truncate">{course.location || 'Sted kommer'}</span>
                        </div>
                      </div>

                      {/* Right: Status & Price */}
                      <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-1 sm:gap-0.5 shrink-0 pl-0 sm:pl-4 border-t sm:border-t-0 border-border pt-3 sm:pt-0 mt-2 sm:mt-0">
                        <div className="font-medium text-text-primary">
                           {course.price ? `${course.price} kr` : 'Gratis'}
                        </div>
                        
                        <div className="text-xs">
                          {isFull ? (
                            <span className="text-muted-foreground font-medium">Fullt</span>
                          ) : course.spots_available <= 3 ? (
                            <span className="text-status-waitlist-text font-medium">
                              {course.spots_available} {course.spots_available === 1 ? 'plass' : 'plasser'} igjen
                            </span>
                          ) : (
                            <span className="text-status-confirmed-text font-medium">Ledige plasser</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default PublicCoursesPage;
