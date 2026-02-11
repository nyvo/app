import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { fetchCourseById, fetchCourseSessions } from '@/services/courses';
import { fetchSignupsByCourseWithProfiles, type SignupWithProfile } from '@/services/signups';
import { useRealtimeSubscription } from '@/hooks/use-realtime-subscription';
import type { Course, CourseSession } from '@/types/database';

// Helper to map database course to component format
export function mapCourseToComponentFormat(courseData: Course & { signups_count: number }) {
  const priceNumber = courseData.price || 0;
  const estimatedRevenue = priceNumber * courseData.signups_count;
  const descriptionParts = courseData.description?.split('\n\n') || [''];

  // Format duration
  const formatDuration = () => {
    if (courseData.total_weeks) return `${courseData.total_weeks} uker`;
    if (courseData.duration) return `${courseData.duration} min`;
    return '';
  };

  // Map course_type to courseType
  const courseTypeMap: Record<string, 'kursrekke' | 'enkeltkurs'> = {
    'course-series': 'kursrekke',
    'event': 'enkeltkurs',
    'online': 'enkeltkurs',
  };

  return {
    title: courseData.title,
    status: courseData.status,
    date: courseData.time_schedule || '',
    location: courseData.location || 'Ikke angitt',
    enrolled: courseData.signups_count,
    capacity: courseData.max_participants || 0,
    price: priceNumber,
    estimatedRevenue: estimatedRevenue,
    description: descriptionParts[0] || '',
    description2: descriptionParts[1] || '',
    level: (() => {
      switch (courseData.level) {
        case 'nybegynner': return 'Nybegynner';
        case 'viderekommen': return 'Viderekommen';
        case 'alle': return 'Middels';
        default: return 'Middels';
      }
    })(),
    duration: formatDuration(),
    durationMinutes: courseData.duration || 60,
    courseType: courseTypeMap[courseData.course_type] || 'enkeltkurs',
    totalWeeks: courseData.total_weeks || 0,
    currentWeek: courseData.current_week || 0,
    timeSchedule: courseData.time_schedule || '',
    imageUrl: courseData.image_url || null,
    startDate: courseData.start_date || null,
    endDate: courseData.end_date || null,
  };
}

export type MappedCourse = ReturnType<typeof mapCourseToComponentFormat>;

export interface UseCourseDetailReturn {
  course: MappedCourse | null;
  sessions: CourseSession[];
  participants: SignupWithProfile[];
  loading: boolean;
  participantsLoading: boolean;
  error: string | null;
  maxParticipants: number;
  setCourse: React.Dispatch<React.SetStateAction<MappedCourse | null>>;
  setSessions: React.Dispatch<React.SetStateAction<CourseSession[]>>;
  setParticipants: React.Dispatch<React.SetStateAction<SignupWithProfile[]>>;
  setMaxParticipants: React.Dispatch<React.SetStateAction<number>>;
  refetchParticipants: () => Promise<void>;
  refetch: () => void;
}

export function useCourseDetail(courseId: string | undefined): UseCourseDetailReturn {
  // State for fetched course data
  const [courseData, setCourseData] = useState<MappedCourse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [maxParticipants, setMaxParticipants] = useState(0);

  // Sessions state (for Kursplan)
  const [sessions, setSessions] = useState<CourseSession[]>([]);
  const [_sessionsLoading, setSessionsLoading] = useState(false);

  // Participants state (for Deltakere tab)
  const [participants, setParticipants] = useState<SignupWithProfile[]>([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);

  // Refetch trigger
  const [refetchKey, setRefetchKey] = useState(0);

  // Fetch course data from Supabase
  useEffect(() => {
    async function loadCourse() {
      if (!courseId) {
        setError('Ugyldig kurs-ID');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await fetchCourseById(courseId);

        if (fetchError || !data) {
          setError('Kurset ble ikke funnet');
          return;
        }

        const mappedCourse = mapCourseToComponentFormat(data);
        setCourseData(mappedCourse);
        setMaxParticipants(mappedCourse.capacity);
      } catch {
        setError('En feil oppstod');
      } finally {
        setIsLoading(false);
      }
    }

    loadCourse();
  }, [courseId, refetchKey]);

  // Fetch sessions when course is loaded
  useEffect(() => {
    async function loadSessions() {
      if (!courseId || !courseData) return;

      // Fetch sessions for both course series AND multi-day events
      setSessionsLoading(true);
      try {
        const { data: sessionsData } = await fetchCourseSessions(courseId);
        if (sessionsData) {
          setSessions(sessionsData);
        }
      } catch (err) {
        logger.error('Failed to load sessions:', err);
      } finally {
        setSessionsLoading(false);
      }
    }

    loadSessions();
  }, [courseId, courseData]);

  // Fetch participants when course is loaded
  useEffect(() => {
    async function loadParticipants() {
      if (!courseId) return;

      setParticipantsLoading(true);
      try {
        const { data: participantsData, error } = await fetchSignupsByCourseWithProfiles(courseId);
        if (error) {
          return;
        }
        if (participantsData) {
          setParticipants(participantsData);
        }
      } catch (err) {
        logger.error('Failed to load participants:', err);
      } finally {
        setParticipantsLoading(false);
      }
    }

    loadParticipants();
  }, [courseId]);

  // Real-time refetch for participants
  const refetchParticipants = useCallback(async () => {
    if (!courseId) return;

    try {
      const participantsResult = await fetchSignupsByCourseWithProfiles(courseId);

      if (participantsResult.data) {
        setParticipants(participantsResult.data);
      }
    } catch {
      // Silent fail for real-time updates
    }
  }, [courseId]);

  // Subscribe to real-time updates for this course's participants
  useRealtimeSubscription(
    { table: 'signups', filter: `course_id=eq.${courseId}` },
    refetchParticipants,
    !!courseId
  );

  const refetch = useCallback(() => {
    setRefetchKey(prev => prev + 1);
  }, []);

  return {
    course: courseData,
    sessions,
    participants,
    loading: isLoading,
    participantsLoading,
    error,
    maxParticipants,
    setCourse: setCourseData,
    setSessions,
    setParticipants,
    setMaxParticipants,
    refetchParticipants,
    refetch,
  };
}
