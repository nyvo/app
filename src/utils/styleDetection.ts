import Fuse from 'fuse.js'
import type { CourseStyle } from '@/types/database'

/**
 * Result of style detection including confidence score
 */
export interface StyleDetectionResult {
  style: CourseStyle | null
  confidence: number | null // 0-1, lower is better match (Fuse.js score)
}

/**
 * Detects yoga style from course title using fuzzy matching.
 * Handles typos (e.g., "Vinaysa" -> "Vinyasa") and partial matches.
 *
 * @param title - The course title to analyze
 * @param styles - Array of available course styles from database
 * @returns StyleDetectionResult with matched style and confidence score
 */
export function detectYogaStyle(
  title: string,
  styles: CourseStyle[]
): StyleDetectionResult {
  if (!title.trim() || styles.length === 0) {
    return { style: null, confidence: null }
  }

  const fuse = new Fuse(styles, {
    keys: ['name', 'normalized_name'],
    threshold: 0.4, // Allows for typos - lower = stricter matching
    ignoreLocation: true, // Match anywhere in the string
    includeScore: true,
  })

  const results = fuse.search(title)

  // Only return if we have a reasonably confident match (score < 0.4)
  if (results.length > 0 && results[0].score !== undefined && results[0].score < 0.4) {
    return {
      style: results[0].item,
      confidence: results[0].score
    }
  }

  return { style: null, confidence: null }
}

/**
 * Gets the display style for a course - either the assigned style or auto-detected from title.
 *
 * @param course - Course object with optional style and title
 * @param allStyles - All available styles for detection fallback
 * @returns The style to display, or null if none found
 */
export function getDisplayStyle(
  course: { style?: CourseStyle | null; title: string },
  allStyles: CourseStyle[]
): CourseStyle | null {
  // If course has an assigned style, use that
  if (course.style) {
    return course.style
  }

  // Otherwise, try to detect from title
  const result = detectYogaStyle(course.title, allStyles)
  return result.style
}
