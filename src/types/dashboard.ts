export type CourseType = 'private' | 'online' | 'yin' | 'meditation' | 'vinyasa' | 'course-series';

export interface UpcomingClass {
  id: string;
  title: string;
  type: CourseType;
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
  type: CourseType;
}

export interface TeacherStats {
  activeStudents: number;
  attendanceRate: number;
  attendanceData: number[];
}

export type PaymentStatus = 'paid' | 'pending' | 'failed';

// Status types (used by both Registration and Signup)
export type SignupStatus = 'confirmed' | 'waitlist' | 'cancelled' | 'course_cancelled';

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
  courseType: CourseType;
  registeredAt: string;
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
  waitlistPosition?: number;
  paymentType: SignupPaymentType;
  paymentDetails?: string;
  note?: string;
}
