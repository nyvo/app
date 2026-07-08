/**
 * Date formatting utilities
 * Consolidates date formatting logic used across the application
 */

import { toLocalDate } from './dateUtils'

/**
 * Format a date string to Norwegian long format
 * e.g., "mandag 15. januar 2024"
 */
export function formatDateLong(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const date = toLocalDate(dateStr)
  if (isNaN(date.getTime())) return ''
  return date.toLocaleDateString('nb-NO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

/**
 * Format timestamp for chat/message display
 * Shows time for today, "I går" for yesterday, weekday for last week, or date
 */
export function formatMessageTimestamp(dateStr: string | null | undefined): string {
  if (!dateStr) return ''

  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return ''
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
  if (isNaN(date.getTime())) return ''
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


