// UI projection types for the teacher dashboard. Distinct from
// `@/types/database` Row types — these are display shapes pre-formatted
// for cards, lists, and timelines (e.g., signups + capacity merged onto
// the upcoming class). Keep this file lean: only types that real
// components import.

import type { SignupStatus } from '@/types/database';

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

/** Row in the recent-registrations list. */
export interface Registration {
  id: string;
  participant: {
    name: string;
    email: string;
    avatar?: string;
    initials?: string;
  };
  course: string;
  courseTime: string;
  courseType: CourseStyleType;
  registeredAt: string;
  /** ISO timestamp for filtering by age */
  createdAt: string;
  status: SignupStatus;
  /** Signed up from a registered account (not a guest) */
  isVerified?: boolean;
  /** Indicates signup needs teacher attention (payment failed, offer expiring, etc.) */
  hasException?: boolean;
  paymentStatus?: string;
}
