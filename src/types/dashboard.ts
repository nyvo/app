export type CourseStyleType = 'course-series' | 'event';

export interface UpcomingClass {
  id: string;
  title: string;
  type: CourseStyleType;
  startTime: string;
  endTime: string;
  date: string;
  location: string;
  attendees: number;
  capacity: number;
  startsIn: string;
}

export interface Message {
  id: string;
  sender: {
    name: string;
    avatar: string;
  };
  content: string;
  timestamp: string;
  isOnline?: boolean;
}

export interface Course {
  id: string;
  title: string;
  subtitle: string;
  time: string;
  type: CourseStyleType;
  /** ISO date string for the next session/start date */
  date?: string;
}

export interface TeacherStats {
  activeStudents: number;
  attendanceRate: number;
  attendanceData: number[];
}

export type PaymentStatus = 'paid' | 'pending' | 'failed' | 'refunded';

// Status types (used by both Registration and Signup)
export type SignupStatus = 'confirmed' | 'cancelled' | 'course_cancelled';

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
  /** Indicates signup needs teacher attention (payment failed, offer expiring, etc.) */
  hasException?: boolean;
}

// Signups page types
export type SignupPaymentType = 'klippekort' | 'månedskort' | 'drop-in' | 'halvårskort' | 'unpaid';

export interface Signup {
  id: string;
  participant: {
    name: string;
    email: string;
    avatar?: string;
    initials?: string;
  };
  className: string;
  classDate: string;
  classTime: string;
  registeredAt: string;
  status: SignupStatus;
  paymentType: SignupPaymentType;
  paymentDetails?: string;
  note?: string;
}

// --- Types for Messages Page (moved from mockData.ts) ---
export interface Conversation {
  id: string;
  name: string;
  avatar?: string;
  initials?: string;
  lastMessage: string;
  timestamp: string;
  isOnline?: boolean;
  unreadCount?: number;
  isActive?: boolean;
  isRead?: boolean;
}

export interface MessageDetail {
  id: string;
  conversationId: string;
  content: string;
  timestamp: string;
  isOutgoing: boolean;
  avatar?: string;
  isRead?: boolean;
}

// --- Types for Courses Page (moved from mockData.ts) ---
export type CourseType = 'kursrekke' | 'enkeltkurs';

export interface Instructor {
  name: string;
  avatar?: string;
  rating: number;
  classesCount: number;
}

export interface DetailedCourse {
  id: string;
  title: string;
  type: 'course-series' | 'event';
  courseType: CourseType;
  status: 'active' | 'upcoming' | 'completed' | 'draft' | 'cancelled';
  location: string;
  timeSchedule: string;
  duration: string;
  participants: number;
  maxParticipants: number;
  price: string;
  progress?: number;
  currentWeek?: number;
  totalWeeks?: number;
  startDate?: string;
  endDate?: string;
  completedDate?: string;
  attendeeAvatars?: string[];
  description?: string;
  instructor?: Instructor;
  level?: string;
  imageUrl?: string | null;
}
