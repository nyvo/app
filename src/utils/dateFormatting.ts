/**
 * Date formatting utilities
 * Consolidates date formatting logic used across the application
 */

/**
 * Format a date for local storage (YYYY-MM-DD)
 * Avoids timezone issues by using local date components
 */
export function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Format a date string to Norwegian long format
 * e.g., "mandag 15. januar 2024"
 */
export function formatDateLong(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('nb-NO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

/**
 * Format a date string to Norwegian medium format
 * e.g., "15. januar 2024"
 */
export function formatDateMedium(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('nb-NO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

/**
 * Format a date string to Norwegian short format
 * e.g., "15. jan"
 */
export function formatDateShort(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('nb-NO', {
    day: 'numeric',
    month: 'short'
  })
}

/**
 * Format a date string to show weekday and date
 * e.g., "mandag 15. januar"
 */
export function formatDateWithWeekday(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('nb-NO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  })
}

/**
 * Format a date range
 * e.g., "15. jan - 22. jan 2024"
 */
export function formatDateRange(
  startDateStr: string | null | undefined,
  endDateStr: string | null | undefined
): string {
  if (!startDateStr) return ''
  if (!endDateStr || startDateStr === endDateStr) {
    return formatDateMedium(startDateStr)
  }

  const startDate = new Date(startDateStr)
  const endDate = new Date(endDateStr)

  // Same month and year
  if (
    startDate.getMonth() === endDate.getMonth() &&
    startDate.getFullYear() === endDate.getFullYear()
  ) {
    return `${startDate.getDate()}. - ${endDate.toLocaleDateString('nb-NO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })}`
  }

  // Same year
  if (startDate.getFullYear() === endDate.getFullYear()) {
    return `${startDate.toLocaleDateString('nb-NO', {
      day: 'numeric',
      month: 'short'
    })} - ${endDate.toLocaleDateString('nb-NO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })}`
  }

  // Different years
  return `${formatDateMedium(startDateStr)} - ${formatDateMedium(endDateStr)}`
}

/**
 * Get relative time description
 * e.g., "i dag", "i morgen", "om 3 dager"
 */
export function getRelativeTimeDescription(dateStr: string | null | undefined): string {
  if (!dateStr) return ''

  const date = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  date.setHours(0, 0, 0, 0)

  const diffDays = Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'i dag'
  if (diffDays === 1) return 'i morgen'
  if (diffDays === -1) return 'i går'
  if (diffDays > 1 && diffDays <= 7) return `om ${diffDays} dager`
  if (diffDays < -1 && diffDays >= -7) return `${Math.abs(diffDays)} dager siden`

  return formatDateShort(dateStr)
}

/**
 * Check if a date is in the past
 */
export function isDateInPast(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false
  const date = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return date < today
}

/**
 * Check if a date is today
 */
export function isDateToday(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false
  const date = new Date(dateStr)
  const today = new Date()
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

/**
 * Format timestamp for chat/message display
 * Shows time for today, "I går" for yesterday, weekday for last week, or date
 */
export function formatMessageTimestamp(dateStr: string | null | undefined): string {
  if (!dateStr) return ''

  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return date.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })
  } else if (diffDays === 1) {
    return 'I går'
  } else if (diffDays < 7) {
    return date.toLocaleDateString('nb-NO', { weekday: 'short' })
  } else {
    return date.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })
  }
}

/**
 * Format relative time for past events
 * e.g., "Nå", "5 min siden", "2 timer siden", "3 dager siden"
 */
export function formatRelativeTimePast(dateStr: string | null | undefined): string {
  if (!dateStr) return ''

  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Nå'
  if (diffMins < 60) return `${diffMins} min siden`
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'time' : 'timer'} siden`
  if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'dag' : 'dager'} siden`
  return date.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })
}

/**
 * Extract day name from time schedule string
 * e.g., "Mandager, 18:00" -> "Mandag"
 * e.g., "Tirsdager, 09:00" -> "Tirsdag"
 */
export function extractDayName(schedule: string | null | undefined): string | null {
  if (!schedule) return null

  const dayMap: Record<string, string> = {
    'mandag': 'Mandag',
    'tirsdag': 'Tirsdag',
    'onsdag': 'Onsdag',
    'torsdag': 'Torsdag',
    'fredag': 'Fredag',
    'lørdag': 'Lørdag',
    'søndag': 'Søndag',
  }

  const lower = schedule.toLowerCase()
  for (const [day, name] of Object.entries(dayMap)) {
    if (lower.includes(day)) return name
  }
  return null
}

/**
 * Format course start time with scalable time-based display logic.
 *
 * For upcoming courses:
 * - ≤14 days: relative time ("I morgen", "Om 7 dager")
 * - >14 days: absolute date ("Starter 12. mars")
 *
 * For active/completed courses: status-based display
 */
export function formatCourseStartTime(
  startDate: string | null | undefined,
  status: 'active' | 'upcoming' | 'completed' | 'draft' | 'cancelled',
  courseType?: 'kursrekke' | 'enkeltkurs',
  currentWeek?: number,
  totalWeeks?: number
): string {
  // Active series: show week progress (null/undefined safe check)
  if (courseType === 'kursrekke' && status === 'active' && currentWeek != null && totalWeeks != null) {
    return `Uke ${currentWeek}/${totalWeeks}`;
  }

  // Active non-series: show "Pågår"
  if (status === 'active') {
    return 'Pågår';
  }

  // Completed: show "Fullført"
  if (status === 'completed') {
    return 'Fullført';
  }

  // Upcoming courses with start date
  if (startDate && status === 'upcoming') {
    const start = new Date(startDate);

    // Guard against invalid dates
    if (isNaN(start.getTime())) {
      return '';
    }

    // Normalize both dates to local midnight to avoid timezone drift
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);

    // Calculate days until start using midnight-to-midnight comparison
    const daysUntil = Math.round((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // If already started while status is "upcoming", return empty (no new state)
    if (daysUntil < 0) {
      return '';
    }

    // Today
    if (daysUntil === 0) {
      return 'I dag';
    }

    // Tomorrow
    if (daysUntil === 1) {
      return 'I morgen';
    }

    // Within 14 days: show relative time
    if (daysUntil <= 14) {
      // Special cases for clean week display
      if (daysUntil === 7) {
        return 'Om 1 uke';
      }
      if (daysUntil === 14) {
        return 'Om 2 uker';
      }

      // 2-13 days (excluding 7 and 14)
      return `Om ${daysUntil} dager`;
    }

    // More than 14 days: show absolute date with "Starter" prefix
    // Use original startDate string for formatting (preserves timezone info)
    const startYear = new Date(startDate).getFullYear();
    const currentYear = new Date().getFullYear();

    if (startYear !== currentYear) {
      return `Starter ${formatDateMedium(startDate)}`; // "Starter 15. januar 2027"
    }

    return `Starter ${formatDateShort(startDate)}`; // "Starter 12. mars"
  }

  // Fallback for draft/cancelled or missing data
  return '';
}
