// Availability text based on spots remaining
export function getAvailabilityText(spotsAvailable: number): string {
  if (spotsAvailable === 0) return 'Fullt';
  if (spotsAvailable <= 3) {
    return `${spotsAvailable} ${spotsAvailable === 1 ? 'plass' : 'plasser'} igjen`;
  }
  return 'Ledige plasser';
}

// Availability StatusIndicator variant based on spots remaining
export function getAvailabilityVariant(spotsAvailable: number): 'success' | 'warning' | 'neutral' {
  if (spotsAvailable === 0) return 'neutral';
  if (spotsAvailable <= 3) return 'warning';
  return 'success';
}

// Format duration in Norwegian
export function formatDuration(minutes: number | null): string {
  if (!minutes) return '';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (remaining === 0) return hours === 1 ? '1 time' : `${hours} timer`;
  return `${hours}t ${remaining}min`;
}

// Format schedule string for inline display (e.g. "Mandager, 18:00")
export function formatScheduleLabel(schedule: string | null): string {
  if (!schedule) return 'Tid kommer';
  return schedule;
}

// Extract day number from date string (e.g. "15")
export function getDateDay(dateStr: string): string {
  return new Date(dateStr).getDate().toString();
}

// Extract short month from date string (e.g. "feb")
export function getDateMonthShort(dateStr: string): string {
  return new Date(dateStr)
    .toLocaleDateString('nb-NO', { month: 'short' })
    .replace('.', '');
}

// Extract short weekday from date string (e.g. "fre")
export function getDateWeekdayShort(dateStr: string): string {
  return new Date(dateStr)
    .toLocaleDateString('nb-NO', { weekday: 'short' })
    .replace('.', '');
}

// Get the display date for an event (prefers next_session, falls back to start_date)
export function getEventDisplayDate(
  nextSession: { session_date: string } | null,
  startDate: string | null
): string | null {
  return nextSession?.session_date || startDate || null;
}

// Map Norwegian day names to weekday order (Mon=0 → Sun=6)
export function getDayOfWeekFromSchedule(schedule: string | null): number {
  if (!schedule) return 7;
  const lower = schedule.toLowerCase();
  const days: [string, number][] = [
    ['mandag', 0],
    ['tirsdag', 1],
    ['onsdag', 2],
    ['torsdag', 3],
    ['fredag', 4],
    ['lørdag', 5],
    ['søndag', 6],
  ];
  for (const [day, order] of days) {
    if (lower.includes(day)) return order;
  }
  return 7;
}

// Extract full day name from schedule (e.g. "Mandager, 18:00" → "Mandag")
export function extractFullDayFromSchedule(schedule: string | null): string | null {
  if (!schedule) return null;
  const lower = schedule.toLowerCase();
  const days: [string, string][] = [
    ['mandag', 'Mandag'],
    ['tirsdag', 'Tirsdag'],
    ['onsdag', 'Onsdag'],
    ['torsdag', 'Torsdag'],
    ['fredag', 'Fredag'],
    ['lørdag', 'Lørdag'],
    ['søndag', 'Søndag'],
  ];
  for (const [day, full] of days) {
    if (lower.includes(day)) return full;
  }
  return null;
}

// Extract short day name from schedule (e.g. "Mandager, 18:00" → "Man")
export function extractDayFromSchedule(schedule: string | null): string | null {
  if (!schedule) return null;
  const lower = schedule.toLowerCase();
  const days: [string, string][] = [
    ['mandag', 'Man'],
    ['tirsdag', 'Tir'],
    ['onsdag', 'Ons'],
    ['torsdag', 'Tor'],
    ['fredag', 'Fre'],
    ['lørdag', 'Lør'],
    ['søndag', 'Søn'],
  ];
  for (const [day, short] of days) {
    if (lower.includes(day)) return short;
  }
  return null;
}

// Format level for display
export function formatLevel(level: string | null): string | null {
  if (!level) return null;
  if (level === 'alle') return 'Alle nivåer';
  if (level === 'nybegynner') return 'Nybegynner';
  if (level === 'viderekommen') return 'Viderekommen';
  return level;
}
