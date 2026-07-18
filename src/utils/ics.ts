/**
 * Minimal RFC 5545 ICS (VEVENT) builder — no dependency. Powers the "Legg til
 * i kalenderen" download on the checkout receipt (paid + free path).
 *
 * Floating local time (no `Z` suffix, no `TZID`) is used for DTSTART/DTEND by
 * design: the audience is Norwegian buyers looking at a Norwegian-local class
 * time. A floating time renders in every calendar app exactly as printed on
 * the receipt; a UTC timestamp would require every reader's calendar app to
 * convert back to Europe/Oslo, and would render wrong for any reader whose
 * device timezone isn't already Oslo. DTSTAMP (when the file was generated,
 * not the event time) is the one field that must stay in real UTC per spec.
 */

export interface IcsEvent {
  /** Unique id for the event — the signup id is a good source. */
  uid: string;
  summary: string;
  /** Local wall-clock date-time of the event start. */
  start: Date;
  /** Local wall-clock date-time of the event end. Optional per RFC 5545. */
  end?: Date;
  location?: string;
}

// RFC 5545 §3.3.11 TEXT escaping: backslash, semicolon, comma, then newlines.
// Order matters — backslash must be escaped first so the later replacements
// don't double-escape the backslashes they introduce.
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

// Floating local date-time: YYYYMMDDTHHmmss (no trailing Z / TZID).
function formatFloatingLocal(date: Date): string {
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `T${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

// DTSTAMP is the one timestamp that must be real UTC per spec — it records
// when the file was generated, not the event's local time.
function formatUtcStamp(date: Date): string {
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

/**
 * Resolves the event's end time from the best data available, mirroring the
 * priority of `resolveTimeRange` (PublicCourseDetailPage): (1) a real
 * "HH:MM–HH:MM" range written into time_schedule by the repo's own course
 * writers; (2) the course's duration in minutes; (3) a 60-minute default —
 * the common class length, easy for the buyer to adjust in their calendar
 * app when neither real signal exists.
 */
export function resolveEventEnd(
  start: Date,
  timeSchedule: string | null,
  durationMinutes: number | null,
): Date {
  const rangeMatch = timeSchedule?.match(/\d{1,2}:\d{2}\s*[-–]\s*(\d{1,2}):(\d{2})/);
  if (rangeMatch) {
    const end = new Date(start);
    end.setHours(Number(rangeMatch[1]), Number(rangeMatch[2]), 0, 0);
    // An end at/before the start means the range crosses midnight — roll to
    // the next day rather than emit a negative-length event.
    if (end <= start) end.setDate(end.getDate() + 1);
    return end;
  }
  if (durationMinutes && durationMinutes > 0) {
    return new Date(start.getTime() + durationMinutes * 60_000);
  }
  return new Date(start.getTime() + 60 * 60_000);
}

/** Builds a minimal single-VEVENT .ics document as a string (CRLF line endings, per spec). */
export function buildIcs(event: IcsEvent): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Raden//Checkout//NO',
    'BEGIN:VEVENT',
    `UID:${escapeIcsText(event.uid)}`,
    `DTSTAMP:${formatUtcStamp(new Date())}`,
    `DTSTART:${formatFloatingLocal(event.start)}`,
  ];
  if (event.end) {
    lines.push(`DTEND:${formatFloatingLocal(event.end)}`);
  }
  lines.push(`SUMMARY:${escapeIcsText(event.summary)}`);
  if (event.location) {
    lines.push(`LOCATION:${escapeIcsText(event.location)}`);
  }
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}

/** Builds the .ics file and triggers a browser download via a Blob + temporary <a download>. */
export function downloadIcs(filename: string, event: IcsEvent): void {
  const blob = new Blob([buildIcs(event)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.ics') ? filename : `${filename}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
