// UI projection types for the teacher dashboard. Distinct from
// `@/types/database` Row types — these are display shapes pre-formatted
// for cards, lists, and timelines (e.g., signups + capacity merged onto
// the upcoming class). Keep this file lean: only types that real
// components import.

/** Visual variant for course cards. Maps from courses.course_type. */
export type CourseStyleType = 'course-series' | 'event';

/** Compact card shape used by the teacher home/dashboard. */
export interface Course {
  id: string;
  title: string;
  subtitle: string;
  time: string;
  type: CourseStyleType;
  /** ISO date string for the next session/start date */
  date?: string;
  imageUrl?: string | null;
  /** Number of confirmed signups */
  signups?: number;
  /** Max participants (capacity) */
  capacity?: number;
}
