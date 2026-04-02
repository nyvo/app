import { useState, useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  MapPin,
  Leaf,
  User,
  LogOut,
  BookOpen,
  Search,
} from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SearchInput } from '@/components/ui/search-input';
import { EmptyState } from '@/components/ui/empty-state';
import { PublicCourseTable } from '@/components/public/PublicCourseTable';
import { fetchPublicCourses, type PublicCourseWithDetails } from '@/services/publicCourses';
import { fetchOrganizationBySlug } from '@/services/organizations';
import { useAuth } from '@/contexts/AuthContext';
import { extractTimeFromSchedule } from '@/utils/timeExtraction';
import { getDayOfWeekFromSchedule } from '@/components/public/courseCardUtils';
import type { Organization } from '@/types/database';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Split courses into Kursrekker and Arrangementer
function splitCoursesByType(courses: PublicCourseWithDetails[]): {
  kursrekker: PublicCourseWithDetails[];
  arrangementer: PublicCourseWithDetails[];
} {
  const kursrekker = courses.filter((c) => c.course_type === 'course-series');
  const arrangementer = courses.filter(
    (c) => c.course_type === 'event' || c.course_type === 'online'
  );
  return { kursrekker, arrangementer };
}

// Sort kursrekker: active first, then by day-of-week, then time, then alpha
function sortKursrekker(courses: PublicCourseWithDetails[]): PublicCourseWithDetails[] {
  const statusOrder: Record<string, number> = { active: 0, upcoming: 1 };
  return [...courses].sort((a, b) => {
    const statusDiff =
      (statusOrder[a.status] ?? 2) - (statusOrder[b.status] ?? 2);
    if (statusDiff !== 0) return statusDiff;

    const dayA = getDayOfWeekFromSchedule(a.time_schedule);
    const dayB = getDayOfWeekFromSchedule(b.time_schedule);
    if (dayA !== dayB) return dayA - dayB;

    const timeA = extractTimeFromSchedule(a.time_schedule);
    const timeB = extractTimeFromSchedule(b.time_schedule);
    if (timeA && timeB) {
      const timeDiff = timeA.hour - timeB.hour;
      if (timeDiff !== 0) return timeDiff;
    }

    return a.title.localeCompare(b.title, 'nb-NO');
  });
}

// Sort arrangementer: chronological by date, then time, then alpha
function sortArrangementer(courses: PublicCourseWithDetails[]): PublicCourseWithDetails[] {
  return [...courses].sort((a, b) => {
    const dateA = a.next_session?.session_date || a.start_date || '';
    const dateB = b.next_session?.session_date || b.start_date || '';

    if (dateA !== dateB) {
      return new Date(dateA).getTime() - new Date(dateB).getTime();
    }

    const timeA = extractTimeFromSchedule(a.time_schedule);
    const timeB = extractTimeFromSchedule(b.time_schedule);
    if (timeA && timeB) return timeA.hour - timeB.hour;

    return a.title.localeCompare(b.title, 'nb-NO');
  });
}

const PublicCoursesPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user, userType, profile, signOut } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [courses, setCourses] = useState<PublicCourseWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter courses by search query
  const filteredCourses = useMemo(() => {
    if (!searchQuery.trim()) return courses;
    const q = searchQuery.toLowerCase().trim();
    return courses.filter(c =>
      c.title.toLowerCase().includes(q) ||
      (c.description || '').toLowerCase().includes(q) ||
      (c.instructor?.name || '').toLowerCase().includes(q) ||
      (c.location || '').toLowerCase().includes(q)
    );
  }, [courses, searchQuery]);

  // Split and sort courses by type
  const { kursrekker, arrangementer } = useMemo(() => {
    const split = splitCoursesByType(filteredCourses);
    return {
      kursrekker: sortKursrekker(split.kursrekker),
      arrangementer: sortArrangementer(split.arrangementer),
    };
  }, [filteredCourses]);

  useEffect(() => {
    async function loadData() {
      if (!slug) {
        setError('Ugyldig lenke');
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

      setLoading(false);
    }

    loadData();
  }, [slug, user, profile?.email]);

  const isEmpty = !loading && filteredCourses.length === 0 && organization;
  const hasCoursesButNoResults = !loading && courses.length > 0 && filteredCourses.length === 0;

  return (
    <div className="min-h-screen w-full bg-background text-sidebar-foreground overflow-x-hidden">
      {/* Minimal Navbar */}
      <nav className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-border">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-background border border-border group-hover:border-ring transition-colors">
              <Leaf className="h-4 w-4 text-foreground" />
            </div>
            <span className="type-title text-foreground">Ease</span>
          </Link>

          {user && userType === 'student' ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="compact" className="gap-2 text-muted-foreground hover:text-foreground">
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
            <Button asChild variant="outline" size="compact">
              <Link to="/student/login">Logg inn</Link>
            </Button>
          )}
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <Spinner size="lg" />
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <h3 className="type-title mb-2 text-foreground">{error}</h3>
            <Button asChild variant="link" className="text-muted-foreground">
              <Link to="/">Gå til forsiden</Link>
            </Button>
          </div>
        )}

        {/* Organization Content */}
        {organization && !loading && !error && (
          <div className="space-y-12">
            {/* Hero Section - Studio Info */}
            <header className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
              <div className="flex items-start gap-6">
              {/* Logo */}
                <div className="h-20 w-20 overflow-hidden rounded-lg shrink-0 md:h-24 md:w-24">
                  {organization.logo_url ? (
                    <img
                      src={organization.logo_url}
                      alt={organization.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center rounded-lg border border-primary/70 bg-primary">
                      <span className="type-display-2 text-primary-foreground">
                        {organization.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>

              {/* Text Info */}
                <div className="min-w-0 flex-1 space-y-2">
                  <h1 className="type-heading-1 text-foreground">
                    {organization.name}
                  </h1>

                  {organization.city && (
                    <div className="type-body flex items-center gap-1.5 text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      {organization.city}
                    </div>
                  )}

                  {organization.description && (
                    <p className="type-body max-w-2xl pt-1 leading-relaxed text-muted-foreground">
                      {organization.description}
                    </p>
                  )}
                </div>
              </div>

              {courses.length > 2 && (
                <Card className="border-border bg-surface-muted p-5">
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <p className="type-title text-foreground">Finn riktig kurs</p>
                      <p className="type-body-sm text-muted-foreground">
                        Søk etter kurs, instruktør eller sted.
                      </p>
                    </div>
                    <SearchInput
                      value={searchQuery}
                      onChange={setSearchQuery}
                      placeholder="Søk etter kurs, instruktør eller sted"
                      aria-label="Søk etter kurs"
                    />
                  </div>
                </Card>
              )}
            </header>

            {/* Empty State */}
            {isEmpty && (
              <Card className="border-border bg-surface">
                <EmptyState
                  icon={hasCoursesButNoResults ? Search : BookOpen}
                  title={hasCoursesButNoResults ? 'Ingen treff' : 'Ingen aktive kurs'}
                  description={
                    hasCoursesButNoResults
                      ? 'Prøv et annet søkeord.'
                      : 'Det er ingen planlagte kurs for øyeblikket.'
                  }
                  variant="public"
                />
              </Card>
            )}

            {/* Course Lists — narrower container within the wider page */}
            <div className="mx-auto max-w-4xl">
              {/* Kursrekker Section */}
              {!isEmpty && kursrekker.length > 0 && (
                <section className="space-y-5">
                  <div className="space-y-1">
                    <h2 className="type-title text-foreground">
                      Kursrekker
                    </h2>
                    <p className="type-body-sm text-muted-foreground">
                      Faste kurs over flere uker.
                    </p>
                  </div>
                  <PublicCourseTable
                    courses={kursrekker}
                    studioSlug={slug || ''}
                    signedUpCourseIds={new Set<string>()}
                  />
                </section>
              )}

              {/* Arrangementer Section */}
              {!isEmpty && arrangementer.length > 0 && (
                <section className="space-y-5 pt-12">
                  <div className="space-y-1">
                    <h2 className="type-title text-foreground">
                      Arrangementer
                    </h2>
                    <p className="type-body-sm text-muted-foreground">
                      Enkeltkurs, workshops og kommende arrangementer.
                    </p>
                  </div>
                  <PublicCourseTable
                    courses={arrangementer}
                    studioSlug={slug || ''}
                    signedUpCourseIds={new Set<string>()}
                  />
                </section>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default PublicCoursesPage;
