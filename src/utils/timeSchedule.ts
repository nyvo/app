/**
 * courses.time_schedule is a DENORMALIZED DISPLAY LABEL ("Mandager,
 * 18:00–19:00"), written at create/save time and rendered verbatim. It is
 * NOT data: the schedule's source of truth is the course_sessions rows
 * (session_date / start_time / end_time), and nothing may parse this label
 * to make decisions — that pattern once meant a copy edit here could silently
 * create sessions at the wrong time.
 *
 * Both writers (CourseBuilderPage.createDraft and CoursePage.handleSave) go
 * through these formatters so the label has exactly one shape.
 */

/** Capitalized Norwegian weekday for a date: "Lørdag". */
export function weekdayLabel(date: Date): string {
  const name = new Intl.DateTimeFormat('nb-NO', { weekday: 'long' }).format(date);
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function timeRange(start: string, end?: string | null): string {
  return end ? `${start}–${end}` : start;
}

/** Single/enkeltkurs label from its (earliest) day: "Lørdag, 10:00–16:00". */
export function singleScheduleLabel(date: Date, start: string, end?: string | null): string {
  return `${weekdayLabel(date)}, ${timeRange(start, end)}`;
}

/** Series label — plural weekday: "Mandager, 18:00–19:00". */
export function seriesScheduleLabel(date: Date, start: string, end?: string | null): string {
  return `${weekdayLabel(date)}er, ${timeRange(start, end)}`;
}
