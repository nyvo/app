import { useState, useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  MapPin,
  Leaf,
  User,
  LogOut,
  BookOpen,
} from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { CourseCard } from '@/components/public/CourseCard';
import { fetchPublicCourses, type PublicCourseWithDetails } from '@/services/publicCourses';
import { fetchOrganizationBySlug } from '@/services/organizations';
import { fetchMySignups } from '@/services/studentSignups';
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
  const [signedUpCourseIds, setSignedUpCourseIds] = useState<Set<string>>(new Set());

  // Split and sort courses by type
  const { kursrekker, arrangementer } = useMemo(() => {
    const split = splitCoursesByType(courses);
    return {
      kursrekker: sortKursrekker(split.kursrekker),
      arrangementer: sortArrangementer(split.arrangementer),
    };
  }, [courses]);

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
      <nav className="sticky top-0 z-50 w-full bg-surface/80 backdrop-blur-md border-b border-zinc-200">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface border border-zinc-100 group-hover:border-zinc-400 transition-colors">
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
            <Button asChild variant="outline" size="compact">
              <Link to="/student/login">Logg inn</Link>
            </Button>
          )}
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <Spinner size="lg" />
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <h3 className="text-lg font-medium text-text-primary mb-2">{error}</h3>
            <Button asChild variant="link" className="text-text-tertiary">
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
              <div className="h-20 w-20 md:h-24 md:w-24 overflow-hidden rounded-2xl shrink-0">
                {organization.logo_url ? (
                  <img
                    src={organization.logo_url}
                    alt={organization.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-2xl bg-zinc-800 border border-zinc-700">
                    <span className="text-2xl font-medium text-white">
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

            {/* Unified Empty State */}
            {isEmpty && (
              <div className="flex flex-col items-center justify-center py-16 text-center border rounded-2xl border-border bg-white">
                <p className="text-sm font-medium text-text-primary">Ingen aktive kurs</p>
                <p className="text-xs text-text-tertiary mt-1">
                  Det er ingen planlagte kurs for øyeblikket.
                </p>
              </div>
            )}

            {/* Kursrekker Section */}
            {!isEmpty && kursrekker.length > 0 && (
              <section className="mb-12">
                <h2 className="text-lg font-medium text-text-primary mb-6">
                  Kursrekker
                </h2>
                <div className="space-y-4">
                  {kursrekker.map((course) => (
                    <CourseCard
                      key={course.id}
                      course={course}
                      studioSlug={slug || ''}
                      isSignedUp={signedUpCourseIds.has(course.id)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Arrangementer Section */}
            {!isEmpty && arrangementer.length > 0 && (
              <section className="mb-12">
                <h2 className="text-lg font-medium text-text-primary mb-6">
                  Arrangementer
                </h2>
                <div className="space-y-4">
                  {arrangementer.map((course) => (
                    <CourseCard
                      key={course.id}
                      course={course}
                      studioSlug={slug || ''}
                      isSignedUp={signedUpCourseIds.has(course.id)}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default PublicCoursesPage;
