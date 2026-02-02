import { useState, useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  MapPin,
  Leaf,
  Loader2,
  User,
  LogOut,
  BookOpen,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TimelineClassCard } from '@/components/public/TimelineClassCard';
import { fetchPublicCourses, type PublicCourseWithDetails } from '@/services/publicCourses';
import { fetchOrganizationBySlug } from '@/services/organizations';
import { fetchMySignups } from '@/services/studentSignups';
import { useAuth } from '@/contexts/AuthContext';
import { getRelativeTimeDescription, formatDateShort, formatDateWithWeekday } from '@/utils/dateFormatting';
import { extractTimeFromSchedule } from '@/utils/timeExtraction';
import type { Organization, CourseStyle } from '@/types/database';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Date grouping helper
function groupCoursesByDate(
  courses: PublicCourseWithDetails[]
): Map<string, PublicCourseWithDetails[]> {
  const groups = new Map<string, PublicCourseWithDetails[]>();

  courses.forEach((course) => {
    // Use next_session date if available, otherwise start_date
    const dateKey = course.next_session?.session_date || course.start_date || 'no-date';

    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey)!.push(course);
  });

  // Sort courses within each date by time
  groups.forEach((coursesInDate) => {
    coursesInDate.sort((a, b) => {
      const timeA = extractTimeFromSchedule(a.time_schedule);
      const timeB = extractTimeFromSchedule(b.time_schedule);

      if (!timeA) return 1;
      if (!timeB) return -1;

      return timeA.hour - timeB.hour;
    });
  });

  // Sort dates chronologically
  const sortedEntries = Array.from(groups.entries()).sort((a, b) => {
    if (a[0] === 'no-date') return 1;
    if (b[0] === 'no-date') return -1;
    return new Date(a[0]).getTime() - new Date(b[0]).getTime();
  });

  return new Map(sortedEntries);
}

// Format date header label
function formatDateHeader(dateStr: string): string {
  if (dateStr === 'no-date') return 'Dato kommer';

  const relativeDesc = getRelativeTimeDescription(dateStr);
  const shortDate = formatDateShort(dateStr);

  // If it's "i dag", "i morgen", etc., combine with short date
  if (relativeDesc && !relativeDesc.includes('.')) {
    // Capitalize first letter
    const capitalized = relativeDesc.charAt(0).toUpperCase() + relativeDesc.slice(1);
    return `${capitalized}, ${shortDate}`;
  }

  // For dates beyond a week, use weekday format
  return formatDateWithWeekday(dateStr);
}

// Check if a date is within the current week (Monday to Sunday)
function isDateInCurrentWeek(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;

  const date = new Date(dateStr);
  const today = new Date();

  // Get Monday of current week
  const currentMonday = new Date(today);
  const dayOfWeek = today.getDay();
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Adjust for Sunday
  currentMonday.setDate(today.getDate() - diff);
  currentMonday.setHours(0, 0, 0, 0);

  // Get Sunday of current week
  const currentSunday = new Date(currentMonday);
  currentSunday.setDate(currentMonday.getDate() + 6);
  currentSunday.setHours(23, 59, 59, 999);

  return date >= currentMonday && date <= currentSunday;
}

const PublicCoursesPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user, userType, profile, signOut } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [courses, setCourses] = useState<PublicCourseWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signedUpCourseIds, setSignedUpCourseIds] = useState<Set<string>>(new Set());
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<'week' | 'all'>('all');

  // Extract unique styles from courses (only assigned styles)
  const availableStyles = useMemo(() => {
    const styles = courses
      .map(course => course.style)
      .filter((style): style is CourseStyle => style !== null)
      .filter((style, index, self) => self.findIndex(s => s.id === style.id) === index)
      .sort((a, b) => a.name.localeCompare(b.name));
    return styles;
  }, [courses]);

  // Filter courses by date filter
  const dateFilteredCourses = useMemo(() => {
    if (dateFilter === 'week') {
      return courses.filter(course => {
        const dateToCheck = course.next_session?.session_date || course.start_date;
        return isDateInCurrentWeek(dateToCheck);
      });
    }
    return courses;
  }, [courses, dateFilter]);

  // Filter courses by selected style (only assigned styles)
  const filteredCourses = selectedStyle
    ? dateFilteredCourses.filter(course => course.style?.id === selectedStyle)
    : dateFilteredCourses;

  // Group courses by date
  const groupedCourses = useMemo(() => {
    return groupCoursesByDate(filteredCourses);
  }, [filteredCourses]);

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

      // Fetch active courses
      const activeResult = await fetchPublicCourses({ organizationSlug: slug });

      if (activeResult.error) {
        setError('Kunne ikke laste kurs');
        setLoading(false);
        return;
      }

      setCourses(activeResult.data || []);

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

  const isEmpty = !loading && filteredCourses.length === 0 && organization;

  return (
    <div className="min-h-screen w-full bg-white text-sidebar-foreground overflow-x-hidden font-sans">
      {/* Minimal Navbar */}
      <nav className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-gray-100/50">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface border border-gray-200 group-hover:border-gray-300 transition-colors">
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

      {/* Filters Sub-bar */}
      {organization && !loading && !error && (
        <div className="sticky top-16 z-40 bg-white border-b border-gray-50">
          <div className="max-w-3xl mx-auto px-6 py-3 flex gap-3 overflow-x-auto no-scrollbar">
            {/* Date filter pill */}
            <button
              onClick={() => setDateFilter(dateFilter === 'week' ? 'all' : 'week')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                dateFilter === 'week'
                  ? 'bg-gray-100 text-text-primary'
                  : 'border border-gray-200 text-text-secondary hover:border-gray-300'
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              {dateFilter === 'week' ? 'Denne uken' : 'Alle'}
            </button>

            {/* Style filters - only show if multiple styles available */}
            {!isEmpty && availableStyles.length > 1 && (
              <>
                {selectedStyle === null && (
                  <button
                    className="px-3 py-1.5 rounded-full text-xs font-medium border border-transparent bg-transparent text-text-secondary whitespace-nowrap"
                    disabled
                  >
                    Alle stiler
                  </button>
                )}
                {availableStyles.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setSelectedStyle(selectedStyle === style.id ? null : style.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${
                      selectedStyle === style.id
                        ? 'bg-text-primary text-white border-text-primary'
                        : 'bg-transparent border-gray-200 text-text-secondary hover:border-gray-300'
                    }`}
                  >
                    {style.name}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      <main className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
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
            {/* Hero Section - Studio Info */}
            <header className="mb-12 flex items-start gap-6">
              {/* Logo */}
              <div className="h-20 w-20 md:h-24 md:w-24 overflow-hidden rounded-2xl bg-surface-elevated border border-gray-100 shrink-0">
                {organization.logo_url ? (
                  <img
                    src={organization.logo_url}
                    alt={organization.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-text-tertiary">
                    <span className="text-2xl font-medium">
                      {organization.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              {/* Text Info */}
              <div className="space-y-2 flex-1">
                <h1 className="text-2xl font-medium text-text-primary sm:text-3xl tracking-tight">
                  {organization.name}
                </h1>

                {organization.city && (
                  <div className="flex items-center gap-1.5 text-sm text-text-secondary">
                    <MapPin className="h-3.5 w-3.5 text-text-tertiary" />
                    {organization.city}
                  </div>
                )}

                {organization.description && (
                  <p className="max-w-2xl text-sm text-text-tertiary leading-relaxed pt-1">
                    {organization.description}
                  </p>
                )}
              </div>
            </header>

            {/* Empty State */}
            {isEmpty && (
              <div className="flex flex-col items-center justify-center py-16 text-center border rounded-2xl border-border bg-gradient-to-br from-white to-surface-elevated/50">
                <p className="text-sm font-medium text-text-primary">
                  {dateFilter === 'week' ? 'Ingen kurs denne uken' : 'Ingen aktive kurs'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {dateFilter === 'week'
                    ? 'Prøv å vise alle kurs.'
                    : 'Det er ingen planlagte kurs for øyeblikket.'}
                </p>
                {dateFilter === 'week' && (
                  <Button
                    variant="outline-soft"
                    size="sm"
                    className="mt-4"
                    onClick={() => setDateFilter('all')}
                  >
                    Vis alle kurs
                  </Button>
                )}
              </div>
            )}

            {/* Timeline Feed */}
            {!isEmpty && (
              <div className="space-y-12">
                {Array.from(groupedCourses.entries()).map(([dateKey, coursesInDate]) => (
                  <section key={dateKey}>
                    {/* Sticky Date Header */}
                    <div className="sticky top-32 z-10 bg-white/90 backdrop-blur-sm w-fit pr-4 rounded-r-lg py-1 mb-4">
                      <h3 className="text-lg font-medium text-text-primary">
                        {formatDateHeader(dateKey)}
                      </h3>
                    </div>

                    {/* Class Cards */}
                    <div className="space-y-4">
                      {coursesInDate.map((course) => (
                        <div key={course.id}>
                          <TimelineClassCard
                            course={course}
                            studioSlug={slug || ''}
                            isSignedUp={signedUpCourseIds.has(course.id)}
                          />
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default PublicCoursesPage;
