import { useState, useEffect, useCallback } from 'react';
import { fetchCourseById, fetchCourseSessions, fetchDropInTier } from '@/services/courses';
import { fetchSignupsByCourseWithProfiles, type SignupWithProfile } from '@/services/signups';
import { useRealtimeSubscription } from '@/hooks/use-realtime-subscription';
import type { Course, CourseSession } from '@/types/database';

// Helper to map database course to component format
function mapCourseToComponentFormat(
  courseData: Course & { signups_count: number },
  allowsDropIn: boolean,
  dropInPrice: number,
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
    location: courseData.location,
    locationAddress: courseData.location_address,
    locationLat: courseData.location_lat,
    locationLon: courseData.location_lon,
    locationPlaceId: courseData.location_place_id,
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
    dropInPrice,
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
  participantsError: boolean;
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
  // Failed fetch ≠ empty roster. Consumers must not render "ingen påmeldte"
  // (or offer hard-delete, which is gated on zero signup records) on a failure.
  const [participantsError, setParticipantsError] = useState(false);

  // Refetch trigger
  const [refetchKey, setRefetchKey] = useState(0);

  // Fetch course data from Supabase
  useEffect(() => {
    // Cancellation guard: without it, navigating course A → course B fast can
    // let A's slower response land last and render A's data under B's URL.
    let cancelled = false;
    async function loadCourse() {
      if (!courseId) {
        setError('Fant ikke kurset.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const [courseResult, dropInTier] = await Promise.all([
          fetchCourseById(courseId),
          fetchDropInTier(courseId),
        ]);
        if (cancelled) return;

        if (courseResult.error || !courseResult.data) {
          setError('Fant ikke kurset.');
          return;
        }

        const mappedCourse = mapCourseToComponentFormat(courseResult.data, dropInTier.active, dropInTier.price);
        setCourseData(mappedCourse);
        setMaxParticipants(mappedCourse.capacity);
      } catch {
        if (!cancelled) setError('Noe gikk galt. Prøv igjen.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadCourse();
    return () => {
      cancelled = true;
    };
  }, [courseId, refetchKey]);

  // Fetch sessions when course is loaded
  useEffect(() => {
    let cancelled = false;
    async function loadSessions() {
      if (!courseId || !courseData) return;

      setSessionsLoading(true);
      const { data: sessionsData } = await fetchCourseSessions(courseId);
      if (cancelled) return;
      if (sessionsData) {
        setSessions(sessionsData);
      }
      setSessionsLoading(false);
    }

    loadSessions();
    return () => {
      cancelled = true;
    };
  }, [courseId, courseData]);

  // Fetch participants when course is loaded
  useEffect(() => {
    let cancelled = false;
    async function loadParticipants() {
      if (!courseId) return;

      setParticipantsLoading(true);
      setParticipantsError(false);
      const { data: participantsData, error: participantsErr } = await fetchSignupsByCourseWithProfiles(courseId);
      if (cancelled) return;
      if (participantsErr) {
        setParticipantsError(true);
      } else if (participantsData) {
        setParticipants(participantsData);
      }
      setParticipantsLoading(false);
    }

    loadParticipants();
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  const refetchParticipants = useCallback(async () => {
    if (!courseId) return;
    // Background refetch: on error keep last-known data (don't flip to error).
    const { data } = await fetchSignupsByCourseWithProfiles(courseId);
    if (data) {
      setParticipants(data);
      setParticipantsError(false);
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
    participantsError,
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
