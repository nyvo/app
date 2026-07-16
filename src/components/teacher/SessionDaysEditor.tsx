import { AnimatePresence, motion } from 'framer-motion'
import { Calendar, Clock, Trash2 } from '@/lib/icons'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

// ── Types ────────────────────────────────────────────────────────────────────

export interface SessionDay {
  id: string
  date: Date | undefined
  startTime: string
  endTime: string
}

export function newSessionDay(): SessionDay {
  // Prefixed so the save path (computeDesiredSessions in CoursePage.tsx) can
  // tell a not-yet-persisted editor row from an existing session id — an
  // unprefixed uuid gets sent to save_course_schedule as an "existing" row,
  // which the RPC rejects with unknown_session.
  return { id: `new-${crypto.randomUUID()}`, date: undefined, startTime: '', endTime: '' }
}

// ── Time helpers ─────────────────────────────────────────────────────────────

function generateTimeSlots(startHour = 6, endHour = 23): string[] {
  const slots: string[] = []
  for (let h = startHour; h < endHour; h++) {
    for (const m of [0, 15, 30, 45]) {
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
  }
  slots.push(`${String(endHour).padStart(2, '0')}:00`)
  return slots
}

export function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export const ALL_TIME_SLOTS = generateTimeSlots()

export function endTimeSlotsFor(startTime: string): string[] {
  if (!startTime) return ALL_TIME_SLOTS
  const min = timeToMin(startTime) + 15
  return ALL_TIME_SLOTS.filter((t) => timeToMin(t) >= min)
}

// ── Component ────────────────────────────────────────────────────────────────

interface SessionDaysEditorProps {
  value: SessionDay[]
  onChange: (days: SessionDay[]) => void
  /** When true, hides the add-day button and per-day remove buttons.
   *  Use for published courses where structural changes are blocked. */
  readOnly?: boolean
}

export function SessionDaysEditor({ value, onChange, readOnly = false }: SessionDaysEditorProps) {
  const updateDay = (id: string, patch: Partial<SessionDay>) =>
    onChange(value.map((d) => (d.id === id ? { ...d, ...patch } : d)))

  const removeDay = (id: string) => {
    if (readOnly || value.length <= 1) return
    onChange(value.filter((d) => d.id !== id))
  }

  const addDay = () => {
    if (readOnly) return
    onChange([...value, newSessionDay()])
  }

  return (
    <div className="@container space-y-4">
      <AnimatePresence initial={false}>
        {value.map((day, idx) => {
          const endSlots = endTimeSlotsFor(day.startTime)
          return (
            <motion.div
              layout
              key={day.id}
              exit={{
                opacity: 0,
                height: 0,
                y: -12,
                transition: { duration: 0.15, ease: [0.23, 1, 0.32, 1] },
              }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              className="overflow-hidden"
            >
              <div
                className={cn('space-y-2', idx > 0 && 'pt-4 border-t border-border')}
              >
                {/* Dag N header + remove button — only when more than one day and not readOnly */}
                {value.length > 1 && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-foreground-muted">Dag {idx + 1}</p>
                    {!readOnly && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeDay(day.id)}
                        aria-label={`Fjern dag ${idx + 1}`}
                        className="text-danger hover:bg-danger-subtle"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                )}

                {/* Date + time as labelled columns; gap-4 = the form-pair-grid canon.
                    Container-query so it stacks in a narrow drawer but stays two-up
                    where there's room (e.g. the course edit tab). */}
                <div className="grid grid-cols-1 gap-4 @lg:grid-cols-2">
                  <div>
                    <Label className="mb-2">Dato</Label>
                    <DatePicker
                      value={day.date}
                      onChange={(d) => updateDay(day.id, { date: d })}
                      icon={Calendar}
                      placeholder="Velg dato"
                      fromDate={new Date()}
                    />
                  </div>

                  <div>
                    <Label className="mb-2">Tidspunkt</Label>
                    <div className="flex items-center gap-2">
                      <Select
                        value={day.startTime}
                        onValueChange={(v) => {
                          // If the current end time is no longer valid after the start
                          // time change, clear it.
                          const newEnd =
                            day.endTime && timeToMin(day.endTime) <= timeToMin(v) ? '' : day.endTime
                          updateDay(day.id, { startTime: v, endTime: newEnd })
                        }}
                      >
                        <SelectTrigger
                          className="w-full gap-2.5"
                          aria-label={`Dag ${idx + 1} Starttid`}
                        >
                          <Clock className="size-5 shrink-0 text-foreground-subtle" strokeWidth={1.75} />
                          <SelectValue placeholder="Start" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {ALL_TIME_SLOTS.map((slot) => (
                            <SelectItem key={slot} value={slot}>
                              {slot}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <span
                        aria-hidden="true"
                        className="shrink-0 text-sm font-medium text-foreground-muted"
                      >
                        –
                      </span>

                      <Select
                        value={day.endTime}
                        onValueChange={(v) => updateDay(day.id, { endTime: v })}
                      >
                        <SelectTrigger
                          className="w-full gap-2.5"
                          aria-label={`Dag ${idx + 1} Sluttid`}
                        >
                          <Clock className="size-5 shrink-0 text-foreground-subtle" strokeWidth={1.75} />
                          <SelectValue placeholder="Slutt" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {endSlots.map((slot) => (
                            <SelectItem key={slot} value={slot}>
                              {slot}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>

      {/* Add day button — hidden when readOnly (published course) */}
      {!readOnly && (
        <Button
          type="button"
          variant="soft"
          className="w-full"
          onClick={addDay}
        >
          {'Legg til en dag til'}
        </Button>
      )}
    </div>
  )
}
