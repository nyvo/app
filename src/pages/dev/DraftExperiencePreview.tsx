import type { ReactNode } from 'react'
import { Send } from '@/lib/icons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageTab, PageTabs } from '@/components/ui/page-tabs'
import { StatusBadge } from '@/components/ui/status-badge'
import { PageShell } from '@/components/teacher/PageShell'
import { CourseMetaRow } from '@/components/teacher/CourseMetaRow'
import { CourseKpis } from '@/components/teacher/CourseOverviewTab'
import { PublishChecklist } from '@/components/teacher/PublishChecklist'

/**
 * Dev-only before/after for the draft ("Utkast") course experience (Phase 8).
 * Before: 3 tabs incl. an always-empty Påmeldte, plus a dead 0/0 KPI spine.
 * After: Påmeldte tab hidden until published, KPI spine dropped so the publish
 * checklist leads. Static markup; not wired to a course.
 */
const CHECKLIST = [
  { key: 'image' as const, title: 'Legg til et bilde', description: 'Anbefalt, men ikke påkrevd for publisering.', done: false, required: false },
  { key: 'description' as const, title: 'Skriv en kort beskrivelse', description: 'Hva får deltakerne ut av kurset?', done: true },
  { key: 'location' as const, title: 'Velg sted', description: 'Adressen vises på kurssiden og i bekreftelsen.', done: true },
  { key: 'payments' as const, title: 'Sett opp utbetaling', description: 'Påkrevd for å ta imot påmeldinger.', done: false },
]

const META = <CourseMetaRow date="Starter tirsdag 8. juli" time="06:00–07:00" location="Flow Studio" />
const PublishAction = (
  <Button>
    <Send data-icon="inline-start" />
    Publiser kurs
  </Button>
)

export default function DraftExperiencePreview() {
  return (
    <div className="bg-canvas">
      <Label>Nåværende — Påmeldte-fane + 0/0 KPI-er på et utkast</Label>
      <div className="bg-canvas pb-12">
        <PageShell
          animate={false}
          title="Morgenyoga"
          description={META}
          badge={<StatusBadge status="draft" />}
          action={PublishAction}
          tabs={
            <PageTabs ariaLabel="Kursseksjoner (før)">
              <PageTab active onClick={() => {}}>Oversikt</PageTab>
              <PageTab active={false} onClick={() => {}} count={0}>Påmeldte</PageTab>
              <PageTab active={false} onClick={() => {}}>Rediger</PageTab>
            </PageTabs>
          }
        >
          <div className="space-y-8">
            <CourseKpis enrolled={0} capacity={12} revenue={0} price={350} isPro />
            <PublishChecklist items={CHECKLIST} onItemClick={() => {}} />
          </div>
        </PageShell>
      </div>

      <Label>Forslag — utkastet leder med sjekklisten, ingen tom fane</Label>
      <div className="bg-canvas pb-12">
        <PageShell
          animate={false}
          title="Morgenyoga"
          description={META}
          badge={<StatusBadge status="draft" />}
          action={PublishAction}
          tabs={
            <PageTabs ariaLabel="Kursseksjoner (etter)">
              <PageTab active onClick={() => {}}>Oversikt</PageTab>
              <PageTab active={false} onClick={() => {}}>Rediger</PageTab>
            </PageTabs>
          }
        >
          <PublishChecklist items={CHECKLIST} onItemClick={() => {}} />
        </PageShell>
      </div>
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
