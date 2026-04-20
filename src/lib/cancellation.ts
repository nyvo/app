
/**
 * Checks if a course can be cancelled based on the 24-hour rule.
 *
 * @param startDateStr - The start date/time string of the course (ISO format)
 * @returns Object containing boolean `canCancel` and `hoursRemaining`
 */
export function checkCancellationWindow(startDateStr: string): { canCancel: boolean; hoursRemaining: number } {
  const now = new Date();
  const startDate = new Date(startDateStr);

  const diffMs = startDate.getTime() - now.getTime();
  const hoursRemaining = diffMs / (1000 * 60 * 60);

  const canCancel = hoursRemaining > 24;

  return { canCancel, hoursRemaining };
}
