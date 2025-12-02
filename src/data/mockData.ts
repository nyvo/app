import type { 
  UpcomingClass, 
  TeacherStats, 
  Message as DashboardMessage, 
  Course, 
  Registration, 
  Signup,
  SignupStatus
} from '@/types/dashboard';

// --- Types for Messages Page (originally local) ---
export interface Conversation {
  id: string;
  name: string;
  avatar?: string;
  initials?: string;
  lastMessage: string;
  timestamp: string;
  isOnline?: boolean; // keeping for type compatibility but will hide in UI
  unreadCount?: number;
  isActive?: boolean;
  isRead?: boolean;
}

export interface MessageDetail {
  id: string;
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
  price: string; // e.g. "2400 NOK"
  progress?: number; // 0-100
  currentWeek?: number;
  totalWeeks?: number;
  startDate?: string; // e.g. "Starts in 5 days"
  attendeeAvatars?: string[];
  description?: string;
  instructor?: Instructor;
  level?: string; // e.g. "Alle", "Nybegynner", "Viderekommen"
}

// --- Types for Signups Page ---
export interface SignupWithTimestamps extends Signup {
  classDateTime: Date;
  registeredAtTimestamp: Date;
}


// --- Mock Data ---

export const mockUpcomingClass: UpcomingClass = {
  id: '1',
  title: 'Vinyasa Flow: Morgenflyt',
  type: 'course-series',
  startTime: '08:00',
  endTime: '09:15',
  date: 'Ons, 24. Okt',
  location: 'Studio A',
  attendees: 18,
  capacity: 20,
  startsIn: 'Starter om 30 min',
};

export const mockStats: TeacherStats = {
  activeStudents: 142,
  attendanceRate: 85,
  attendanceData: [40, 60, 50, 80, 90, 30],
};

// Dashboard Messages
export const mockDashboardMessages: DashboardMessage[] = [
  {
    id: '1',
    sender: { name: 'Sarah Jensen', avatar: '' }, // Removed avatar URL
    content: 'Gleder meg til timen! 🙏',
    timestamp: '2m',
    isOnline: false,
  },
  {
    id: '2',
    sender: { name: 'Marc Olsen', avatar: '' },
    content: 'Kan jeg ta med en gjest?',
    timestamp: '1t',
  },
  {
    id: '3',
    sender: { name: 'Lara Croft', avatar: '' },
    content: 'Må dessverre avbestille.',
    timestamp: '3t',
  },
];

// Dashboard Courses
export const mockDashboardCourses: Course[] = [
  {
    id: '1',
    title: 'Privattime',
    subtitle: 'med Michael T. • Studio B',
    time: '14:00',
    type: 'private',
  },
  {
    id: '2',
    title: 'Kveldsstretch',
    subtitle: 'Online • Zoom',
    time: '17:30',
    type: 'online',
  },
  {
    id: '3',
    title: 'Yin Yoga',
    subtitle: 'Rolig flyt • Studio A',
    time: '19:00',
    type: 'yin',
  },
  {
    id: '4',
    title: 'Meditasjon',
    subtitle: 'Mindfulness • Studio C',
    time: '20:15',
    type: 'meditation',
  },
];

// Dashboard Registrations
export const mockRegistrations: Registration[] = [
  {
    id: '1',
    participant: { name: 'Emma Larsen', email: 'emma.larsen@gmail.com', initials: 'EL' },
    course: 'Vinyasa Flow',
    courseTime: 'Ons 23. Okt, 16:00',
    courseType: 'vinyasa',
    registeredAt: '5m',
    status: 'confirmed',
  },
  {
    id: '2',
    participant: { name: 'Jonas Berg', email: 'jonas.berg@outlook.com', initials: 'JB' },
    course: 'Yin Yoga',
    courseTime: 'Tor 24. Okt, 18:00',
    courseType: 'yin',
    registeredAt: '23m',
    status: 'waitlist',
  },
  {
    id: '3',
    participant: { name: 'Maja Holm', email: 'maja.holm@gmail.com', initials: 'MH' },
    course: 'Privattime',
    courseTime: 'Fre 25. Okt, 09:00',
    courseType: 'private',
    registeredAt: '1t',
    status: 'confirmed',
  },
  {
    id: '4',
    participant: { name: 'Anders Nilsen', email: 'anders.n@hotmail.com', initials: 'AN' },
    course: 'Meditasjon',
    courseTime: 'Lør 26. Okt, 10:00',
    courseType: 'meditation',
    registeredAt: '2t',
    status: 'cancelled',
  },
];

// Messages Page - Conversations
export const mockConversations: Conversation[] = [
  {
    id: '1',
    name: 'Kari Nordmann',
    initials: 'KN',
    lastMessage: 'Har dere matte jeg kan låne?',
    timestamp: '10:23',
    isOnline: true,
    isActive: true,
  },
  {
    id: '2',
    name: 'Lars Hansen',
    initials: 'LH',
    lastMessage: 'Takk for timen i går! Det var...',
    timestamp: '09:45',
    unreadCount: 1,
  },
  {
    id: '3',
    name: 'Erik Solberg',
    initials: 'ES',
    lastMessage: 'Den er grei, vi sees på onsdag.',
    timestamp: 'I går',
    isRead: true,
  },
  {
    id: '4',
    name: 'Sofia Berg',
    initials: 'SB',
    lastMessage: 'Kan jeg endre bookingen min?',
    timestamp: 'Man',
    isRead: true,
  },
  {
    id: '5',
    name: 'Anna Nilsen',
    initials: 'AN',
    lastMessage: 'Glemte vannflasken min...',
    timestamp: '20. Okt',
    isRead: true,
  },
];

// Messages Page - Chat Details
export const mockMessages: MessageDetail[] = [
  {
    id: '1',
    content: 'Hei! Jeg har meldt meg på Vinyasa Flow kl 16:00 i dag. Gleder meg! 😊',
    timestamp: '09:14',
    isOutgoing: false,
    avatar: '',
  },
  {
    id: '2',
    content: 'Hei Kari! Så hyggelig å høre. Velkommen skal du være.',
    timestamp: '09:30',
    isOutgoing: true,
    avatar: '',
    isRead: true,
  },
  {
    id: '3',
    content: 'Takk! Bare et lite spørsmål - har dere matte jeg kan låne, eller må jeg ta med egen?',
    timestamp: '10:23',
    isOutgoing: false,
    avatar: '',
  },
];

export const mockSignups: SignupWithTimestamps[] = [
  {
    id: '1',
    participant: {
      name: 'Kari Nordmann',
      email: 'kari.n@gmail.com',
      initials: 'KN',
    },
    className: 'Vinyasa Flow',
    classDate: 'Ons 23. Okt',
    classTime: '16:00',
    classDateTime: new Date('2024-10-23T16:00:00'),
    registeredAt: '2 timer siden',
    registeredAtTimestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    status: 'confirmed',
    paymentType: 'klippekort',
    paymentDetails: '2/10',
  },
  {
    id: '2',
    participant: {
      name: 'Lars Hansen',
      email: 'lars.hansen@outlook.com',
      initials: 'LH',
    },
    className: 'Ashtanga Intro',
    classDate: 'Tor 24. Okt',
    classTime: '18:00',
    classDateTime: new Date('2024-10-24T18:00:00'),
    registeredAt: 'I går',
    registeredAtTimestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
    status: 'waitlist',
    waitlistPosition: 1,
    paymentType: 'månedskort',
    note: 'Har en skade i skulderen, trenger tilpasninger.',
  },
  {
    id: '3',
    participant: {
      name: 'Ida Johansen',
      email: 'ida.j@hotmail.com',
      initials: 'IJ',
    },
    className: 'Yin Yoga',
    classDate: 'Fre 25. Okt',
    classTime: '09:00',
    classDateTime: new Date('2024-10-25T09:00:00'),
    registeredAt: '3 dager siden',
    registeredAtTimestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    status: 'cancelled',
    paymentType: 'unpaid',
  },
  {
    id: '4',
    participant: {
      name: 'Erik Solberg',
      email: 'erik.s@gmail.com',
      initials: 'ES',
    },
    className: 'Vinyasa Flow',
    classDate: 'Ons 23. Okt',
    classTime: '16:00',
    classDateTime: new Date('2024-10-23T16:00:00'),
    registeredAt: '4 timer siden',
    registeredAtTimestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
    status: 'confirmed',
    paymentType: 'drop-in',
    paymentDetails: 'Vipps',
    note: 'Ny elev, ønsker introduksjon.',
  },
  {
    id: '5',
    participant: {
      name: 'Sofia Berg',
      email: 'sofia.berg@gmail.com',
      initials: 'SB',
    },
    className: 'Pilates Core',
    classDate: 'Fre 25. Okt',
    classTime: '17:00',
    classDateTime: new Date('2024-10-25T17:00:00'),
    registeredAt: '1 dag siden',
    registeredAtTimestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
    status: 'confirmed',
    paymentType: 'halvårskort',
  },
];

// Default instructor for courses
const defaultInstructor: Instructor = {
  name: 'Kristoffer Nyvold',
  avatar: '',
  rating: 4.9,
  classesCount: 128,
};

// Courses Page Data (Refactored from hardcoded JSX)
export const mockDetailedCourses: DetailedCourse[] = [
  {
    id: '1',
    title: 'Vinyasa Flow: Nybegynner',
    type: 'vinyasa',
    courseType: 'kursrekke',
    status: 'active',
    location: 'Sal A - Hovedstudio',
    timeSchedule: 'Tirsdager, 18:00',
    duration: '8 uker',
    participants: 12,
    maxParticipants: 15,
    price: '2400 NOK',
    progress: 37,
    currentWeek: 3,
    totalWeeks: 8,
    attendeeAvatars: ['', '', ''],
    description: 'Denne Vinyasa-timen er designet for å gi deg en energisk start på dagen. Vi fokuserer på å synkronisere pust med bevegelse i en kontinuerlig flyt. Timen begynner med rolige pusteøvelser (Pranayama) før vi beveger oss gjennom dynamiske sekvenser som styrker kjernemuskulaturen og øker fleksibiliteten.\n\nPasser for de som ønsker å bygge varme og få energien til å flyte for resten av dagen.',
    instructor: defaultInstructor,
    level: 'Nybegynner',
  },
  {
    id: '2',
    title: 'Barsel Yoga & Baby',
    type: 'course-series',
    courseType: 'kursrekke',
    status: 'upcoming',
    location: 'Sal B - Lillesalen',
    timeSchedule: 'Torsdager, 10:30',
    duration: '6 uker',
    participants: 8,
    maxParticipants: 10,
    price: '1800 NOK',
    startDate: 'Starter om 5 dager',
    attendeeAvatars: ['', '', ''],
    totalWeeks: 6,
    description: 'Et rolig og trygt kurs for nybakte mødre og deres babyer. Vi fokuserer på å gjenoppbygge styrke i bekkenbunnen og magemuskulaturen, samtidig som vi skaper en fin stund sammen med babyen.\n\nInkluderer enkle øvelser du kan gjøre hjemme mellom timene.',
    instructor: defaultInstructor,
    level: 'Alle',
  },
  {
    id: '3',
    title: 'Pust & Avspenning',
    type: 'meditation',
    courseType: 'enkeltkurs',
    status: 'upcoming',
    location: 'Sal A - Hovedstudio',
    timeSchedule: 'Lør 24. Okt, 12:00',
    duration: '3 timer',
    participants: 22,
    maxParticipants: 25,
    price: '650 NOK',
    startDate: 'Starter om 3 dager',
    description: 'En workshop dedikert til pusteøvelser og dyp avspenning. Lær teknikker for å redusere stress og øke tilstedeværelse i hverdagen. Perfekt for deg som ønsker å finne mer ro.',
    instructor: defaultInstructor,
    level: 'Alle',
  },
  {
    id: '5',
    title: 'Yoga Retreat Helg',
    type: 'course-series',
    courseType: 'enkeltkurs',
    status: 'active',
    location: 'Fjordgården Retreat',
    timeSchedule: 'Fre-Søn, 15-17. Nov',
    duration: '3 dager',
    participants: 18,
    maxParticipants: 20,
    price: '4500 NOK',
    progress: 33,
    description: 'Tre dager med yoga, meditasjon og naturopplevelser ved fjorden. Inkluderer alle måltider, overnatting og guidede turer. En unik mulighet til å koble av og lade batteriene.',
    instructor: defaultInstructor,
    level: 'Alle',
  },
  {
    id: '4',
    title: 'Yin Yoga Kveldskurs',
    type: 'yin',
    courseType: 'kursrekke',
    status: 'completed',
    location: 'Sal A - Hovedstudio',
    timeSchedule: 'Mandager, 19:00',
    duration: '6 uker',
    participants: 14,
    maxParticipants: 15,
    price: '1800 NOK',
    attendeeAvatars: ['', '', ''],
    totalWeeks: 6,
    description: 'Et rolig kveldskurs med fokus på dype strekkøvelser og avspenning. Yin yoga er perfekt for å løse opp spenninger og forberede kroppen for en god natts søvn.',
    instructor: defaultInstructor,
    level: 'Alle',
  }
];

// Empty State Data Helpers
export const emptyStats: TeacherStats = {
  activeStudents: 0,
  attendanceRate: 0,
  attendanceData: [0, 0, 0, 0, 0, 0],
};

export const emptyDashboardMessages: DashboardMessage[] = [];
export const emptyDashboardCourses: Course[] = [];
export const emptyRegistrations: Registration[] = [];
export const emptyConversations: Conversation[] = [];
export const emptyMessages: MessageDetail[] = [];
export const emptySignups: SignupWithTimestamps[] = [];
export const emptyDetailedCourses: DetailedCourse[] = [];
