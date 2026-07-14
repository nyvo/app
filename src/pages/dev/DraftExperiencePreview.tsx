import { PageTab, PageTabs } from '@/components/ui/page-tabs'
import { StatusBadge } from '@/components/ui/status-badge'
import { PageShell } from '@/components/teacher/PageShell'
import { CourseOverviewTab } from '@/components/teacher/CourseOverviewTab'
import { DevPage, PreviewSection } from './_kit'
import type { MappedCourse } from '@/hooks/use-course-detail'
import type { CourseSession } from '@/types/database'

/**
 * Dev-only review of the course Oversikt across its lifecycle.
 * Renders the real CourseOverviewTab so the publish/readiness architecture and
 * the session-feed layout can be reviewed end-to-end:
 *  - Draft: Påmeldte tab + dead 0/0 KPI spine hidden; readiness card on top.
 *  - Kursplan feed: date rail + grey session cards for every format — one-day
 *    (course name as title, no rail), multi-day (Dag x/n), weekly series
 *    (Uke x/n, cancelled session, overflow tail entry).
 *  - Sted tile with the place pill; series settings below it.
 *  - Live/finished: KPI spine + Påmeldte tab return; finished feeds collapse
 *    to "Ingen kommende timer".
 *
 * NOTE: session dates are hardcoded around mid-July 2026 — the feed hides
 * past sessions, so scenarios assume "today" is between 2026-07-08 and
 * 2026-07-20 to show the intended mix of past/next/upcoming.
 */

// Only the fields CourseOverviewTab reads — double-cast keeps the mocks lean.
function course(overrides: Partial<MappedCourse>): MappedCourse {
  return {
    title: 'Morgenyoga',
    slug: 'morgenyoga',
    status: 'draft',
    format: 'single',
    location: 'Flow Studio',
    // Real coords so the autoloading Sted map renders in the preview
    // (courses can't exist without a place — creation requires a placeId).
    locationLat: 60.3913,
    locationLon: 5.3221,
    enrolled: 0,
    capacity: 12,
    price: 350,
    description: 'Rolig morgenyoga for alle nivåer.',
    durationMinutes: 60,
    totalWeeks: 0,
    imageUrl: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=400',
    endDate: null,
    ...overrides,
  } as unknown as MappedCourse
}

function sess(date: string, start: string, end: string, status: 'upcoming' | 'cancelled' = 'upcoming'): CourseSession {
  return { id: `${date}-${start}`, session_date: date, start_time: start, end_time: end, status } as unknown as CourseSession
}

const ONE_DAY = [sess('2026-07-25', '10:00', '14:00')]
const MULTI_DAY = [
  sess('2026-07-24', '10:00', '14:00'),
  sess('2026-07-25', '10:00', '14:00'),
  sess('2026-07-26', '10:00', '13:00'),
]
// 10-week series straddling "today" (~2026-07-14): three past, one cancelled,
// enough upcoming to trigger the overflow tail.
const WEEKLY = [
  sess('2026-06-23', '18:00', '19:30'),
  sess('2026-06-30', '18:00', '19:30'),
  sess('2026-07-07', '18:00', '19:30'),
  sess('2026-07-14', '18:00', '19:30'),
  sess('2026-07-21', '18:00', '19:30'),
  sess('2026-07-28', '18:00', '19:30', 'cancelled'),
  sess('2026-08-04', '18:00', '19:30'),
  sess('2026-08-11', '18:00', '19:30'),
  sess('2026-08-18', '18:00', '19:30'),
  sess('2026-08-25', '18:00', '19:30'),
]
// Entirely in the past — the feed collapses to "Ingen kommende timer".
const FINISHED = ['05-05', '05-12', '05-19', '05-26', '06-02', '06-09', '06-16', '06-23'].map(
  (md) => sess(`2026-${md}`, '18:00', '19:30'),
)

const noop = () => {}

interface StateProps {
  label: string
  course: MappedCourse
  sessions?: CourseSession[]
  paymentSetupRequired?: boolean
  paymentSetupComplete?: boolean
  paymentSetupStatus?: string | null
  enrolledCount?: number
  revenue?: number
  allowsDropIn?: boolean
  dropInPrice?: number
  acceptsLateSignups?: boolean
  /** Sessions query failed — real CourseOverviewTab prop; the Kursplan feed
   *  shows an inline error while the rest of the page renders normally. */
  sessionsError?: boolean
  sessionsLoading?: boolean
}

function State({
  label,
  course,
  sessions = ONE_DAY,
  paymentSetupRequired = false,
  paymentSetupComplete = false,
  paymentSetupStatus = null,
  enrolledCount = 0,
  revenue = 0,
  allowsDropIn = false,
  dropInPrice = 0,
  acceptsLateSignups = false,
  sessionsError = false,
  sessionsLoading = false,
}: StateProps) {
  const isDraft = course.status === 'draft'
  return (
    <PreviewSection label={label}>
      <div className="bg-canvas pb-12">
        <PageShell
          animate={false}
          className="px-0 pb-0 pt-0 sm:px-0 lg:px-0 lg:pt-0 md:pb-0"
          title={course.title}
          badgePlacement="below"
          badge={<StatusBadge status={course.status} />}
          tabs={
            <PageTabs ariaLabel="Kursseksjoner">
              <PageTab active onClick={noop}>Oversikt</PageTab>
              {!isDraft && (
                <PageTab active={false} onClick={noop} count={enrolledCount}>
                  Påmeldte
                </PageTab>
              )}
              <PageTab active={false} onClick={noop}>Rediger</PageTab>
            </PageTabs>
          }
        >
          <CourseOverviewTab
            course={course}
            enrolledCount={enrolledCount}
            revenue={revenue}
            paymentSetupStatus={paymentSetupStatus}
            paymentSetupComplete={paymentSetupComplete}
            paymentSetupRequired={paymentSetupRequired}
            allowsDropIn={allowsDropIn}
            onAllowsDropInChange={noop}
            dropInPrice={dropInPrice}
            onDropInPriceChange={noop}
            acceptsLateSignups={acceptsLateSignups}
            onAcceptsLateSignupsChange={noop}
            onOpenKursplan={noop}
            onEditSession={noop}
            onSetupPaymentsClick={noop}
            onPublish={noop}
            publishing={false}
            sessions={sessions}
            sessionsError={sessionsError}
            sessionsLoading={sessionsLoading}
          />
        </PageShell>
      </div>
    </PreviewSection>
  )
}

export default function DraftExperiencePreview() {
  return (
    <DevPage title="Kursoversikt (Oversikt-fane)">
      <State
        label="Ukentlig serie, i gang — neste-prikk (azure), avlyst time, hale «x timer til»"
        course={course({ status: 'active', format: 'series', totalWeeks: 10, endDate: '2026-08-25' })}
        sessions={WEEKLY}
        paymentSetupRequired
        paymentSetupComplete
        enrolledCount={12}
        revenue={16800}
        allowsDropIn
        dropInPrice={750}
        acceptsLateSignups
      />

      <State
        label="Enkeltkurs, én dag — kursnavn som korttittel, ingen rail"
        course={course({ status: 'upcoming', title: 'Workshop: Yin og pust', price: 590 })}
        sessions={ONE_DAY}
        paymentSetupRequired
        paymentSetupComplete
        enrolledCount={8}
        revenue={4720}
      />

      <State
        label="Enkeltkurs, tre dager — Dag x/x, full rail, ingen hale"
        course={course({ status: 'upcoming', endDate: '2026-07-26' })}
        sessions={MULTI_DAY}
        paymentSetupRequired
        paymentSetupComplete
        enrolledCount={5}
        revenue={1750}
      />

      <State
        label="Utkast (kursrekke) — readiness-kort + feed, sted mangler"
        course={course({ status: 'draft', format: 'series', totalWeeks: 10, imageUrl: null, description: '', location: null, locationLat: null, locationLon: null })}
        sessions={WEEKLY}
        paymentSetupRequired
      />

      <State
        label="Utkast — venter på Stripe-godkjenning"
        course={course({ status: 'draft', imageUrl: null })}
        paymentSetupRequired
        paymentSetupStatus="pending"
      />

      <State
        label="Utkast — klart til publisering"
        course={course({ status: 'draft' })}
        paymentSetupRequired
        paymentSetupComplete
        paymentSetupStatus="enabled"
      />

      <State
        label="Ferdig — KPI-spine, «Ingen kommende timer» + Se alle timer"
        course={course({ status: 'completed', format: 'series', totalWeeks: 8, enrolled: 8, endDate: '2026-06-23' })}
        sessions={FINISHED}
        paymentSetupRequired
        paymentSetupComplete
        enrolledCount={8}
        revenue={22400}
      />

      <State
        label="Avlyst kurs — avlyst-pille på kommende time"
        course={course({ status: 'cancelled' })}
        sessions={[sess('2026-07-25', '10:00', '14:00', 'cancelled')]}
        paymentSetupRequired
        paymentSetupComplete
        enrolledCount={3}
        revenue={1050}
      />

      <State
        label="Laster timer — skeleton-feed"
        course={course({ status: 'upcoming' })}
        sessions={[]}
        sessionsLoading
        paymentSetupRequired
        paymentSetupComplete
        enrolledCount={5}
        revenue={1750}
      />

      <State
        label="Feil — inline-feil i feeden"
        course={course({ status: 'upcoming' })}
        sessions={ONE_DAY}
        sessionsError
        paymentSetupRequired
        paymentSetupComplete
        enrolledCount={5}
        revenue={1750}
      />
    </DevPage>
  )
}
