import { useState, useEffect, useCallback } from 'react';
import { fetchCourseById, fetchCourseSessions, fetchDropInTierActive } from '@/services/courses';
import { fetchSignupsByCourseWithProfiles, type SignupWithProfile } from '@/services/signups';
import { useRealtimeSubscription } from '@/hooks/use-realtime-subscription';
import type { Course, CourseSession } from '@/types/database';

// Helper to map database course to component format
function mapCourseToComponentFormat(
  courseData: Course & { signups_count: number },
  allowsDropIn: boolean,
) {
  const priceNumber = courseData.price || 0;
  const estimatedRevenue = priceNumber * courseData.signups_count;
  const descriptionParts = courseData.description?.split('\n\n') || [''];

  // Format duration
  const formatDuration = () => {
    if (courseData.total_weeks) return `${courseData.total_weeks} uker`;
    if (courseData.duration) return `${courseData.duration} min`;
    return '';
  };

  // Map db format → legacy UI label
  const courseTypeLabel: 'kursrekke' | 'enkeltkurs' =
    courseData.format === 'series' ? 'kursrekke' : 'enkeltkurs';

  return {
    title: courseData.title,
    slug: courseData.slug,
    status: courseData.status,
    date: courseData.time_schedule || '',
    location: courseData.location || 'Ikke angitt',
    enrolled: courseData.signups_count,
    capacity: courseData.max_participants || 0,
    price: priceNumber,
    estimatedRevenue: estimatedRevenue,
    description: descriptionParts[0] || '',
    description2: descriptionParts[1] || '',
    duration: formatDuration(),
    durationMinutes: courseData.duration || 60,
    courseType: courseTypeLabel,
    totalWeeks: courseData.total_weeks || 0,
    currentWeek: 0,
    timeSchedule: courseData.time_schedule || '',
    imageUrl: courseData.image_url || null,
    startDate: courseData.start_date || null,
    endDate: courseData.end_date || null,
    createdAt: courseData.created_at || null,
    format: courseData.format,
    allowsDropIn,
    acceptsLateSignups: courseData.accepts_late_signups,
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
        setError('Fant ikke kurset.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const [courseResult, dropInActive] = await Promise.all([
          fetchCourseById(courseId),
          fetchDropInTierActive(courseId),
        ]);

        if (courseResult.error || !courseResult.data) {
          setError('Fant ikke kurset.');
          return;
        }

        const mappedCourse = mapCourseToComponentFormat(courseResult.data, dropInActive);
        setCourseData(mappedCourse);
        setMaxParticipants(mappedCourse.capacity);
      } catch {
        setError('Noe gikk galt. Prøv igjen.');
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

      setSessionsLoading(true);
      const { data: sessionsData } = await fetchCourseSessions(courseId);
      if (sessionsData) {
        setSessions(sessionsData);
      }
      setSessionsLoading(false);
    }

    loadSessions();
  }, [courseId, courseData]);

  // Fetch participants when course is loaded
  useEffect(() => {
    async function loadParticipants() {
      if (!courseId) return;

      setParticipantsLoading(true);
      const { data: participantsData } = await fetchSignupsByCourseWithProfiles(courseId);
      if (participantsData) {
        setParticipants(participantsData);
      }
      setParticipantsLoading(false);
    }

    loadParticipants();
  }, [courseId]);

  const refetchParticipants = useCallback(async () => {
    if (!courseId) return;
    const { data } = await fetchSignupsByCourseWithProfiles(courseId);
    if (data) setParticipants(data);
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
