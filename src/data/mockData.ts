// --- Types for Messages Page ---
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

// --- Types for Courses Page ---
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
  type: 'private' | 'online' | 'yin' | 'meditation' | 'vinyasa' | 'course-series';
  courseType: CourseType;
  status: 'active' | 'upcoming' | 'completed' | 'draft';
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
  completedDate?: string;
  attendeeAvatars?: string[];
  description?: string;
  instructor?: Instructor;
  level?: string;
  imageUrl?: string | null;
}
