import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, Users, ImageIcon, Leaf } from '@/lib/icons';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/ui/user-avatar';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { EmbeddedPayment } from '@/components/public/course-details/EmbeddedPayment';
import {
  fetchPublicCourseById,
  resolveCourseImage,
  type PublicCourseWithDetails,
} from '@/services/publicCourses';
import { fetchCourseSessions } from '@/services/courses';
import { checkCourseAvailability, createFreeSignup, sendSignupConfirmationEmail } from '@/services/signups';
import { createDinteroSession } from '@/services/checkout';
import { friendlyError } from '@/lib/error-messages';
import { formatKroner, isValidEmail, cn } from '@/lib/utils';
import type { CourseSession } from '@/types/database';

// ────────────────────────────────────────────────────────────────────────────
// Formatting helpers
// ────────────────────────────────────────────────────────────────────────────

const WEEKDAYS = ['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør'] as const;
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'] as const;

function extractStartTime(timeSchedule: string | null): string {
  if (!timeSchedule) return '';
  const match = timeSchedule.match(/(\d{1,2}:\d{2})/);
  return match ? match[1] : '';
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()}. ${MONTHS[d.getMonth()]}`;
}

function formatSessionTime(time: string | null): string {
  if (!time) return '';
  return time.slice(0, 5);
}

function formatDuration(duration: number | null): string {
  if (!duration) return '';
  if (duration < 60) return `${duration} min`;
  const h = Math.floor(duration / 60);
  const m = duration % 60;
  return m === 0 ? `${h} t` : `${h} t ${m} min`;
}

// ────────────────────────────────────────────────────────────────────────────
// Booking card — price header, form, inline Dintero payment
// ────────────────────────────────────────────────────────────────────────────

interface BookingFormState {
  name: string;
  email: string;
  phone: string;
  terms: boolean;
}

function BookingCard({ course, studioSlug }: { course: PublicCourseWithDetails; studioSlug: string }) {
  const [form, setForm] = useState<BookingFormState>({ name: '', email: '', phone: '', terms: false });
  const [errors, setErrors] = useState<Partial<Record<keyof BookingFormState, boolean>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [dinteroSession, setDinteroSession] = useState<{ sid: string; merchantReference: string } | null>(null);

  const isFull = course.max_participants !== null && course.spots_available <= 0;
  const isFree = !course.price || course.price <= 0;
  const isCancelled = course.status === 'cancelled';
  const startTime = extractStartTime(course.time_schedule);
  const isSeries = course.course_type === 'course-series';
  const weeksLabel = isSeries && course.total_weeks ? `${course.total_weeks} uker` : null;

  const spotsLabel = course.max_participants
    ? course.spots_available <= 0
      ? 'Fullt'
      : course.spots_available <= 3
        ? `${course.spots_available} plasser igjen`
        : null
    : null;

  function updateField<K extends keyof BookingFormState>(key: K, value: BookingFormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: false }));
  }

  function validate(): boolean {
    const next: typeof errors = {};
    if (!form.name.trim()) next.name = true;
    if (!form.email.trim() || !isValidEmail(form.email)) next.email = true;
    if (!form.phone.trim()) next.phone = true;
    if (!form.terms) next.terms = true;
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);

    const { available, error: availError } = await checkCourseAvailability(course.id);
    if (availError) {
      toast.error('Kunne ikke sjekke tilgjengelighet. Prøv igjen.');
      setSubmitting(false);
      return;
    }
    if (available <= 0) {
      toast.error('Kurset er fullt.');
      setSubmitting(false);
      return;
    }

    if (isFree) {
      const { data: signupData, error: signupError } = await createFreeSignup({
        courseId: course.id,
        participantName: form.name.trim(),
        participantEmail: form.email.trim(),
        participantPhone: form.phone.trim(),
      });
      if (signupError) {
        toast.error(friendlyError(signupError, 'Kunne ikke fullføre påmelding. Prøv igjen.'));
        setSubmitting(false);
        return;
      }
      if (signupData?.signupId) sendSignupConfirmationEmail(course.id, signupData.signupId);
      window.location.href = `/checkout/success?free=true&org=${studioSlug}`;
      return;
    }

    const { data: paymentData, error: paymentError } = await createDinteroSession({
      courseId: course.id,
      organizationSlug: studioSlug,
      customerEmail: form.email.trim(),
      customerName: form.name.trim(),
      customerPhone: form.phone.trim(),
    });
    if (paymentError || !paymentData) {
      toast.error(friendlyError(paymentError, 'Kunne ikke starte betaling. Prøv igjen.'));
      setSubmitting(false);
      return;
    }
    setDinteroSession({ sid: paymentData.sid, merchantReference: paymentData.merchantReference });
    setSubmitting(false);
  }

  const fieldLabelCls = 'text-xs font-medium mb-1.5 block text-foreground';
  const errorCls = 'text-xs font-medium text-destructive mt-1';

  // Header shown in every state
  const PriceHeader = (
    <div className="space-y-1">
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">
          {formatKroner(course.price)}
        </span>
        {isSeries && course.total_weeks && (
          <span className="text-xs text-muted-foreground">for hele kursrekken</span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {course.start_date && (
          <span className="inline-flex items-center gap-1">
            <Calendar className="size-3.5 shrink-0" />
            {isSeries ? 'Starter ' : ''}{formatDate(course.start_date)}
            {startTime && ` · kl. ${startTime}`}
          </span>
        )}
        {(weeksLabel || course.duration) && (
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5 shrink-0" />
            {weeksLabel || formatDuration(course.duration)}
          </span>
        )}
        {spotsLabel && (
          <Badge variant={spotsLabel === 'Fullt' ? 'neutral' : 'warning'} shape="rect" size="sm">
            <Users />
            {spotsLabel}
          </Badge>
        )}
      </div>
    </div>
  );

  if (isCancelled) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        {PriceHeader}
        <Alert variant="warning" size="sm">
          <AlertDescription>Kurset er avlyst.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isFull) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        {PriceHeader}
        <div className="rounded-md bg-muted px-3 py-2.5 text-center">
          <p className="text-sm font-medium text-foreground">Kurset er fullt</p>
          <p className="text-xs mt-0.5 text-muted-foreground">Ingen ledige plasser igjen.</p>
        </div>
      </div>
    );
  }

  if (dinteroSession) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <EmbeddedPayment
          sid={dinteroSession.sid}
          courseName={course.title}
          price={course.price || 0}
          onPaymentSuccess={(transactionId) => {
            const ref = encodeURIComponent(dinteroSession.merchantReference);
            window.location.href = `/checkout/success?transaction_id=${transactionId}&ref=${ref}&org=${studioSlug}`;
          }}
          onPaymentError={() => {
            // Error is displayed in the EmbeddedPayment component; keep the iframe mounted.
          }}
          onBack={() => setDinteroSession(null)}
        />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-card p-6 space-y-5">
      {PriceHeader}

      <div className="space-y-3.5">
        <div>
          <label htmlFor="bk-name" className={fieldLabelCls}>Navn</label>
          <Input
            id="bk-name"
            type="text"
            autoComplete="name"
            value={form.name}
            onChange={(e) => updateField('name', e.target.value)}
            aria-invalid={errors.name || undefined}
            placeholder="Ola Nordmann"
          />
          {errors.name && <p role="alert" className={errorCls}>Fyll inn navn.</p>}
        </div>

        <div>
          <label htmlFor="bk-email" className={fieldLabelCls}>E-post</label>
          <Input
            id="bk-email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => updateField('email', e.target.value)}
            aria-invalid={errors.email || undefined}
            placeholder="ola@eksempel.no"
          />
          {errors.email && <p role="alert" className={errorCls}>Fyll inn en gyldig e-postadresse.</p>}
        </div>

        <div>
          <label htmlFor="bk-phone" className={fieldLabelCls}>Telefon</label>
          <Input
            id="bk-phone"
            type="tel"
            autoComplete="tel"
            value={form.phone}
            onChange={(e) => updateField('phone', e.target.value)}
            aria-invalid={errors.phone || undefined}
            placeholder="9xx xx xxx"
          />
          {errors.phone && <p role="alert" className={errorCls}>Fyll inn telefonnummer.</p>}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <Checkbox
            id="bk-terms"
            checked={form.terms}
            onCheckedChange={(v) => updateField('terms', v === true)}
            aria-invalid={errors.terms || undefined}
            className="mt-0.5"
          />
          <label htmlFor="bk-terms" className="text-xs text-muted-foreground leading-relaxed select-none cursor-pointer">
            Jeg godtar <Link to="/terms" target="_blank" className="text-foreground underline underline-offset-2">vilkårene</Link> og <Link to="/terms" target="_blank" className="text-foreground underline underline-offset-2">angreretten</Link>.
          </label>
        </div>
        {errors.terms && <p role="alert" className={errorCls}>Du må godta vilkårene for å gå videre.</p>}
      </div>

      <Button
        type="submit"
        className="w-full"
        size="default"
        disabled={submitting}
        loading={submitting}
        loadingText={isFree ? 'Melder på' : 'Starter betaling'}
      >
        {isFree ? 'Meld på' : `Betal ${formatKroner(course.price)}`}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Ingen konto nødvendig · Kvittering på e-post
      </p>
    </form>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Instructors
// ────────────────────────────────────────────────────────────────────────────

function InstructorsSection({ instructors }: { instructors: PublicCourseWithDetails['instructors'] }) {
  if (instructors.length === 0) return null;
  const heading = instructors.length === 1 ? 'Om instruktøren' : 'Om instruktørene';

  return (
    <Section title={heading}>
      <div className="flex flex-col gap-5">
        {instructors.map((i) => (
          <div key={i.id} className="flex items-start gap-3">
            <UserAvatar name={i.name} src={i.avatar_url} size="md" className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base font-medium text-foreground">{i.name || 'Instruktør'}</span>
                {i.role === 'guest' && (
                  <Badge variant="neutral" shape="rect" size="sm">Gjesteinstruktør</Badge>
                )}
              </div>
              {i.bio && (
                <p className="text-base text-muted-foreground leading-relaxed mt-1 whitespace-pre-wrap">
                  {i.bio}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Sessions — collapsed in an accordion, closed by default
// ────────────────────────────────────────────────────────────────────────────

function SessionsAccordion({ sessions }: { sessions: CourseSession[] }) {
  const upcoming = sessions.filter(s => s.status !== 'cancelled');
  if (upcoming.length === 0) return null;

  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="sessions" className="border-b-0 rounded-lg border border-border px-4">
        <AccordionTrigger className="py-3 hover:no-underline">
          <span className="text-sm font-medium text-foreground">
            Datoer ({upcoming.length})
          </span>
        </AccordionTrigger>
        <AccordionContent>
          <ul className="divide-y divide-border -mt-1">
            {upcoming.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="text-foreground">{formatDate(s.session_date)}</span>
                {s.start_time && (
                  <span className="text-muted-foreground tabular-nums">kl. {formatSessionTime(s.start_time)}</span>
                )}
              </li>
            ))}
          </ul>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Generic section wrapper
// ────────────────────────────────────────────────────────────────────────────

function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('space-y-3', className)}>
      <h3 className="text-xs font-medium tracking-wide uppercase text-muted-foreground">{title}</h3>
      <div className="text-base text-foreground">{children}</div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Hero
// ────────────────────────────────────────────────────────────────────────────

function HeroImage({ course }: { course: PublicCourseWithDetails }) {
  const src = resolveCourseImage(course);
  if (!src) {
    return (
      <div className="flex aspect-[16/9] sm:aspect-[21/9] w-full items-center justify-center bg-muted rounded-lg">
        <ImageIcon className="size-10 text-disabled-foreground" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={course.title}
      className="aspect-[16/9] sm:aspect-[21/9] w-full object-cover rounded-lg"
    />
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Main page
// ────────────────────────────────────────────────────────────────────────────

export default function PublicCourseDetailPage() {
  const { slug, courseId } = useParams<{ slug: string; courseId: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<PublicCourseWithDetails | null>(null);
  const [sessions, setSessions] = useState<CourseSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!courseId) return;
      setLoading(true);
      setError(null);
      const [courseRes, sessionsRes] = await Promise.all([
        fetchPublicCourseById(courseId),
        fetchCourseSessions(courseId),
      ]);
      if (!active) return;
      if (courseRes.error || !courseRes.data) {
        setError('Kurset finnes ikke eller er ikke tilgjengelig.');
        setLoading(false);
        return;
      }
      setCourse(courseRes.data);
      setSessions(sessionsRes.data || []);
      setLoading(false);
    }
    load();
    return () => { active = false };
  }, [courseId]);

  const backUrl = slug ? `/studio/${slug}` : '/';

  const cancellationCopy = useMemo(
    () => 'Gratis avbestilling inntil 24 timer før kursstart. Senere avbestilling eller uteblivelse refunderes ikke.',
    [],
  );

  const handleBack = () => navigate(backUrl);

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-background">
      {/* Header with back button */}
      <header className="sticky top-0 z-10 shrink-0 border-b border-border bg-surface-elevated backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4 sm:px-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="-ml-2"
          >
            <ArrowLeft className="size-4" />
            Tilbake
          </Button>
          <Link to="/" className="hidden sm:flex items-center gap-2 group ml-auto">
            <div className="flex size-7 items-center justify-center rounded-md bg-background border border-border group-hover:border-ring transition-colors">
              <Leaf className="size-3.5 text-foreground" />
            </div>
            <span className="text-sm font-medium text-foreground">Ease</span>
          </Link>
        </div>
      </header>

      {/* Scrollable main content */}
      <main className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex min-h-[60vh] items-center justify-center">
            <Spinner size="lg" />
          </div>
        )}

        {error && !loading && (
          <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-sm font-medium text-foreground">{error}</p>
            <Button variant="outline" size="sm" onClick={handleBack}>
              Tilbake til timeplan
            </Button>
          </div>
        )}

        {!loading && !error && course && (
          <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
            {/* Hero full width */}
            <HeroImage course={course} />

            {/* Two-column layout on lg+ (1024px): content left, sticky booking right */}
            <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-12">
              {/* Left: content column */}
              <div className="space-y-8 min-w-0">
                <header className="space-y-1.5">
                  <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
                    {course.title}
                  </h1>
                  {course.organization && (
                    <p className="text-base text-muted-foreground">
                      <Link to={`/studio/${course.organization.slug}`} className="hover:text-foreground smooth-transition">
                        {course.organization.name}
                      </Link>
                    </p>
                  )}
                </header>

                {course.description && (
                  <Section title="Om kurset">
                    <p className="leading-relaxed text-foreground whitespace-pre-wrap">
                      {course.description}
                    </p>
                  </Section>
                )}

                {/* Mobile + tablet: booking card inline after description */}
                <div className="lg:hidden">
                  <BookingCard course={course} studioSlug={slug || ''} />
                </div>

                <SessionsAccordion sessions={sessions} />

                <InstructorsSection instructors={course.instructors} />

                {course.location && (
                  <Section title="Sted">
                    <p className="leading-relaxed">{course.location}</p>
                  </Section>
                )}

                <Section title="Avbestilling">
                  <p className="leading-relaxed text-muted-foreground">{cancellationCopy}</p>
                </Section>
              </div>

              {/* Right: sticky booking card (lg+ only) */}
              <aside className="hidden lg:block">
                <div className="sticky top-20">
                  <BookingCard course={course} studioSlug={slug || ''} />
                </div>
              </aside>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
