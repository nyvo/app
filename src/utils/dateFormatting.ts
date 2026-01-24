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
 * Extract time from a time schedule string
 * e.g., "Tirsdager, 18:00" -> "18:00"
 */
export function extractTimeFromSchedule(schedule: string | null | undefined): string {
  if (!schedule) return ''
  const timeMatch = schedule.match(/(\d{1,2}:\d{2})/)
  return timeMatch ? timeMatch[1] : ''
}

/**
 * Format a datetime for expiry display
 * e.g., "mandag 15. januar, 14:30"
 */
export function formatExpiryDateTime(date: Date): string {
  return date.toLocaleString('nb-NO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit'
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
