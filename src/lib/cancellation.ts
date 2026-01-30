
/**
 * Checks if a course can be cancelled based on the 48-hour rule.
 *
 * @param startDateStr - The start date/time string of the course (ISO format)
 * @returns Object containing boolean `canCancel` and `hoursRemaining`
 */
export function checkCancellationWindow(startDateStr: string): { canCancel: boolean; hoursRemaining: number } {
  const now = new Date();
  const startDate = new Date(startDateStr);

  // Calculate difference in milliseconds
  const diffMs = startDate.getTime() - now.getTime();

  // Convert to hours
  const hoursRemaining = diffMs / (1000 * 60 * 60);

  // 48 hour rule
  const canCancel = hoursRemaining > 48;

  return { canCancel, hoursRemaining };
}
