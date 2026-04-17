import type { Course, CourseSession, CourseType } from '@/types/database';

export interface ScheduleEvent {
  id: string;
  courseId: string;
  title: string;
  startTime: string;
  endTime: string;
  location: string;
  status?: 'completed' | 'upcoming' | 'active';
  signups: number;
  maxCapacity: number | null;
  courseType?: CourseType;
}

export interface SessionWithCourse extends CourseSession {
  course: Course;
}

export const DAY_ABBR = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'] as const;
export const DAY_FULL = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag', 'Søndag'] as const;
export const MONTH_ABBR = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'] as const;

export const TIME_SLOTS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00',
] as const;
