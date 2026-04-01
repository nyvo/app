/**
 * Calculate end time from start time and duration in minutes.
 */
export function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, mins] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + mins + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMins = totalMinutes % 60;
  return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
}

/**
 * Format time to HH:MM (strip seconds if present).
 */
export function formatTime(time: string): string {
  const parts = time.split(':');
  return `${parts[0]}:${parts[1]}`;
}

/**
 * Calculate CSS top/height for an event within the time grid.
 * Grid shows 06:00-22:00 at 100px per hour.
 */
export function getEventStyle(startTime: string, endTime: string): { top: string; height: string } {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  const clampedStartHour = Math.max(startHour, 6);
  const clampedStartMin = startHour < 6 ? 0 : startMin;
  const clampedEndHour = Math.min(endHour, 23);
  const clampedEndMin = endHour >= 23 ? 0 : endMin;

  const startOffset = (clampedStartHour - 6) * 100 + (clampedStartMin / 60) * 100;
  const endOffset = (clampedEndHour - 6) * 100 + (clampedEndMin / 60) * 100;
  const duration = Math.max(endOffset - startOffset, 20);

  return {
    top: `${Math.max(startOffset, 0)}px`,
    height: `${duration}px`,
  };
}
