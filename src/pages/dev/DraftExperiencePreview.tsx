import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { PageTab, PageTabs } from '@/components/ui/page-tabs'
import { StatusBadge } from '@/components/ui/status-badge'
import { PageShell } from '@/components/teacher/PageShell'
import { CourseOverviewTab } from '@/components/teacher/CourseOverviewTab'
import type { MappedCourse } from '@/hooks/use-course-detail'
import type { CourseSession } from '@/types/database'

/**
 * Dev-only review of the course Oversikt across its lifecycle (Phase 8).
 * Renders the real CourseOverviewTab so the publish/readiness architecture and
 * the course-plan card can be reviewed end-to-end:
 *  - Draft: Påmeldte tab + dead 0/0 KPI spine hidden; readiness shows one card
 *    per step, then a publish CTA card at 100%.
 *  - Course plan: schedule card for every format — single one-day, multi-day
 *    single, and weekly series.
 *  - Live/finished: KPI spine + Påmeldte tab return.
 */

// Only the fields CourseOverviewTab reads — double-cast keeps the mocks lean.
function course(overrides: Partial<MappedCourse>): MappedCourse {
  return {
    title: 'Morgenyoga',
    slug: 'morgenyoga',
    status: 'draft',
    format: 'single',
    location: 'Flow Studio',
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

const ONE_DAY = [sess('2026-07-08', '06:00', '07:00')]
const TWO_DAY = [
  sess('2026-07-08', '06:15', '06:45'),
  sess('2026-07-09', '06:15', '06:45'),
]
const MULTI_DAY = [
  sess('2026-07-08', '06:00', '07:00'),
  sess('2026-07-09', '08:00', '09:30'),
  sess('2026-07-10', '17:00', '18:00'),
]
const WEEKLY = ['07-07', '07-14', '07-21', '07-28', '08-04', '08-11', '08-18', '08-25'].map((md) =>
  sess(`2026-${md}`, '06:00', '07:00'),
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
}: StateProps) {
  const isDraft = course.status === 'draft'
  return (
    <>
      <Label>{label}</Label>
      <div className="bg-canvas pb-12">
        <PageShell
          animate={false}
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
            allowsDropIn={false}
            onAllowsDropInChange={noop}
            dropInPrice={0}
            onDropInPriceChange={noop}
            acceptsLateSignups={false}
            onAcceptsLateSignupsChange={noop}
            onOpenKursplan={noop}
            onEditSession={noop}
            onSetupPaymentsClick={noop}
            onPublish={noop}
            publishing={false}
            sessions={sessions}
          />
        </PageShell>
      </div>
    </>
  )
}

export default function DraftExperiencePreview() {
  return (
    <div className="bg-canvas">
      <State
        label="Utkast (kursrekke) — stepper + detaljer + kursplan-strip"
        course={course({ status: 'draft', format: 'series', totalWeeks: 8, imageUrl: null, description: '', location: null })}
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
        label="Utkast — klart til publisering (CTA-kort, ingen knapp i header)"
        course={course({ status: 'draft' })}
        paymentSetupRequired
        paymentSetupComplete
        paymentSetupStatus="enabled"
      />

      <State
        label="Enkeltkurs, én dag — ingen kursplan (dato i header + detaljer)"
        course={course({ status: 'upcoming' })}
        sessions={ONE_DAY}
        paymentSetupRequired
        paymentSetupComplete
        enrolledCount={5}
        revenue={1750}
      />

      <State
        label="Kursplan — to dager (strukket til halve)"
        course={course({ status: 'upcoming', endDate: '2026-07-09' })}
        sessions={TWO_DAY}
        paymentSetupRequired
        paymentSetupComplete
        enrolledCount={5}
        revenue={1750}
      />

      <State
        label="Kursplan — tre dager (3 kort på rad)"
        course={course({ status: 'upcoming', endDate: '2026-07-10' })}
        sessions={MULTI_DAY}
        paymentSetupRequired
        paymentSetupComplete
        enrolledCount={5}
        revenue={1750}
      />

      <State
        label="Kursplan — ukentlig kursrekke (8 uker)"
        course={course({ status: 'upcoming', format: 'series', totalWeeks: 8, endDate: '2026-08-25' })}
        sessions={WEEKLY}
        paymentSetupRequired
        paymentSetupComplete
        enrolledCount={9}
        revenue={25200}
      />

      <State
        label="Ferdig — KPI-spine + plan (ingen sluttilstand-boks)"
        course={course({ status: 'completed', format: 'series', totalWeeks: 8, enrolled: 8, endDate: '2026-06-17' })}
        sessions={WEEKLY}
        paymentSetupRequired
        paymentSetupComplete
        enrolledCount={8}
        revenue={22400}
      />

      <State
        label="Avlyst — KPI-spine + plan (ingen avlyst-boks)"
        course={course({ status: 'cancelled' })}
        sessions={[sess('2026-07-08', '06:00', '07:00', 'cancelled')]}
        paymentSetupRequired
        paymentSetupComplete
        enrolledCount={3}
        revenue={1050}
      />
    </div>
  )
}

function Label({ children }: { children: ReactNode }) {
  return (
    <div className="px-6 pt-8 pb-2 sm:px-10">
      <Badge variant="neutral" size="sm">
        {children}
      </Badge>
    </div>
  )
}
