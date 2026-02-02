/**
 * Time extraction utilities for parsing time_schedule strings
 */

export interface TimeInfo {
  time: string; // 24h format (e.g., "18:00")
  hour: number; // 0-23
}

/**
 * Extract time from a time_schedule string
 * Examples:
 * - "Mandager, 18:00" → { time: "18:00", hour: 18 }
 * - "18:00" → { time: "18:00", hour: 18 }
 * - "Tirsdager og Torsdager, 09:30" → { time: "09:30", hour: 9 }
 */
export function extractTimeFromSchedule(
  schedule: string | null | undefined
): TimeInfo | null {
  if (!schedule) return null;

  const timeMatch = schedule.match(/(\d{1,2}):(\d{2})/);
  if (!timeMatch) return null;

  const hour = parseInt(timeMatch[1], 10);
  const minute = timeMatch[2];
  const time = `${hour.toString().padStart(2, '0')}:${minute}`;

  return {
    time,
    hour,
  };
}

/**
 * Determine time period for color coding (morning, afternoon, evening)
 */
export function getTimePeriod(hour: number): 'morning' | 'afternoon' | 'evening' {
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}
