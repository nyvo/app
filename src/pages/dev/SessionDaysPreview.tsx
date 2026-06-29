import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { SessionDaysEditor, newSessionDay, type SessionDay } from '@/components/teacher/SessionDaysEditor'

/** Dev-only preview of the reusable per-day editor (Dag 1..N) used by the
 *  course builder and the course-detail edit page. */
export default function SessionDaysPreview() {
  const [days, setDays] = useState<SessionDay[]>(() => [newSessionDay()])
  return (
    <main className="min-h-dvh bg-canvas">
      <div className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="mb-6 text-2xl font-medium text-foreground">SessionDaysEditor</h1>
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
    </main>
  )
}
