import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { SessionDaysEditor, newSessionDay, type SessionDay } from '@/components/teacher/SessionDaysEditor'
import { DevPage, PreviewSection } from './_kit'

/** Dev-only preview of the reusable per-day editor (Dag 1..N) used by the
 *  course builder and the course-detail edit page. */
export default function SessionDaysPreview() {
  const [days, setDays] = useState<SessionDay[]>(() => [newSessionDay()])
  return (
    <DevPage title="Øktdager-editor">
      <PreviewSection label="Med data">
        <div className="max-w-2xl">
          <Card className="p-6 sm:p-8">
            <label className="mb-2 block text-sm font-semibold text-foreground">Datoer</label>
            <SessionDaysEditor value={days} onChange={setDays} />
          </Card>
          <pre className="mt-6 overflow-auto rounded-lg border border-border bg-surface p-4 text-xs text-foreground-muted">
            {JSON.stringify(
              days.map((d) => ({ date: d.date?.toISOString().slice(0, 10) ?? null, start: d.startTime, end: d.endTime })),
              null,
              2,
            )}
          </pre>
        </div>
      </PreviewSection>
    </DevPage>
  )
}
