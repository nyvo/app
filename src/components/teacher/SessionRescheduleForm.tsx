import { useState } from 'react';
import { Info } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CourseSession } from '@/types/database';

/**
 * Reschedule one session — labeled Dato + Tidspunkt fields, an "påmeldte
 * varsles" notice, and right-aligned Avbryt/Lagre. Field state lives here; the
 * parent owns the service call + submitting flag (so it works both inline in
 * the Timeplan card and inside the sessions modal). Mount with a `key` of the
 * session id so it re-initialises when the edited session changes.
 */
interface SessionRescheduleFormProps {
  session: CourseSession;
  /** Default duration — suggests an end time when start changes and end is empty. */
  defaultDurationMinutes: number;
  submitting: boolean;
  onCancel: () => void;
  onSave: (args: { newDate: string; newStartTime: string; newEndTime?: string }) => void;
}

function shortTime(t: string | null | undefined): string {
  return t ? t.slice(0, 5) : '';
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const hh = String(Math.floor(total / 60) % 24).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

// Mirror CreateCourseDrawer's range so the picker shape stays consistent.
function generateTimeSlots(startHour = 6, endHour = 23): string[] {
  const slots: string[] = [];
  for (let h = startHour; h < endHour; h++) {
    for (const m of [0, 15, 30, 45]) {
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  slots.push(`${String(endHour).padStart(2, '0')}:00`);
  return slots;
}

const TIME_SLOTS = generateTimeSlots();

function parseYMD(s: string | null | undefined): Date | undefined {
  if (!s) return undefined;
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

function formatYMD(d: Date | undefined): string {
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function SessionRescheduleForm({
  session,
  defaultDurationMinutes,
  submitting,
  onCancel,
  onSave,
}: SessionRescheduleFormProps) {
  const [newDate, setNewDate] = useState<Date | undefined>(parseYMD(session.session_date));
  const [newStart, setNewStart] = useState(shortTime(session.start_time));
  const [newEnd, setNewEnd] = useState(shortTime(session.end_time));

  return (
    <div className="flex flex-1 flex-col gap-5">
      {/* Labeled fields — same Dato | Tidspunkt layout as the course builder. */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="reschedule-date" className="block text-sm font-semibold text-foreground">
            Dato
          </label>
          <div className="mt-2">
            <DatePicker id="reschedule-date" value={newDate} onChange={setNewDate} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-foreground">Tidspunkt</label>
          <div className="mt-2 flex items-center gap-2">
            <Select
              value={newStart}
              onValueChange={(next) => {
                setNewStart(next);
                // Clear end if it's now before/at start; auto-fill with
                // start + course duration when end isn't set yet.
                if (newEnd && timeToMin(newEnd) <= timeToMin(next)) {
                  setNewEnd('');
                } else if (!newEnd && defaultDurationMinutes > 0) {
                  setNewEnd(addMinutes(next, defaultDurationMinutes));
                }
              }}
            >
              <SelectTrigger className="flex-1" aria-label="Starter">
                <SelectValue placeholder="Start" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {TIME_SLOTS.map((slot) => (
                  <SelectItem key={slot} value={slot}>
                    {slot}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span aria-hidden="true" className="shrink-0 text-foreground-muted">
              –
            </span>
            <Select value={newEnd} onValueChange={setNewEnd}>
              <SelectTrigger className="flex-1" aria-label="Slutter">
                <SelectValue placeholder="Slutt" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {TIME_SLOTS.filter(
                  (slot) => !newStart || timeToMin(slot) > timeToMin(newStart),
                ).map((slot) => (
                  <SelectItem key={slot} value={slot}>
                    {slot}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Notice as a quiet info card (not a floating line). */}
      <div className="flex items-center gap-2.5 rounded-lg bg-muted px-3.5 py-2.5">
        <Info className="size-4 shrink-0 text-foreground-muted" />
        <span className="text-sm text-foreground-muted">
          Påmeldte varsles på e-post om endringen.
        </span>
      </div>

      <div className="mt-auto flex justify-end gap-2">
        <Button variant="secondary" size="lg" onClick={onCancel} disabled={submitting}>
          Avbryt
        </Button>
        <Button
          size="lg"
          onClick={() =>
            onSave({
              newDate: formatYMD(newDate),
              newStartTime: newStart,
              newEndTime: newEnd || undefined,
            })
          }
          loading={submitting}
          loadingText="Lagrer"
          disabled={!newDate || !newStart || !newEnd}
        >
          Lagre
        </Button>
      </div>
    </div>
  );
}
