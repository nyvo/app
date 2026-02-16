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

