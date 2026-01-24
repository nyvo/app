/**
 * String utility functions
 */

/**
 * Get initials from a name (1-2 characters)
 * e.g., "John Doe" -> "JD", "Alice" -> "A", null -> "?"
 */
export function getInitials(name: string | null | undefined): string {
  if (!name || name.trim() === '') return '?'

  return name
    .trim()
    .split(' ')
    .filter(part => part.length > 0)
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Truncate text to a maximum length with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 1) + '…'
}

/**
 * Capitalize the first letter of a string
 */
export function capitalizeFirst(text: string): string {
  if (!text) return ''
  return text.charAt(0).toUpperCase() + text.slice(1)
}
