/**
 * Generate time slots for time pickers
 * @param startHour - Starting hour (default: 6)
 * @param endHour - Ending hour (default: 23)
 * @param intervalMinutes - Interval in minutes (default: 15)
 * @returns Array of time strings in HH:MM format
 */
export function generateTimeSlots(
  startHour: number = 6,
  endHour: number = 23,
  intervalMinutes: number = 15
): string[] {
  const slots: string[] = [];

  for (let hour = startHour; hour <= endHour; hour++) {
    for (let minute = 0; minute < 60; minute += intervalMinutes) {
      // Don't add slots past the end hour
      if (hour === endHour && minute > 0) break;

      slots.push(
        `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      );
    }
  }

  return slots;
}

// Pre-generated time slots for common use cases
export const TIME_SLOTS_DEFAULT = generateTimeSlots();
