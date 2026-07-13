import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchCourseById, fetchCourseSessions, fetchDropInTier } from '@/services/courses';
import { fetchSignupsByCourseWithProfiles, type SignupWithProfile } from '@/services/signups';
import { useRealtimeSubscription } from '@/hooks/use-realtime-subscription';
import { GENERIC_ERROR } from '@/lib/error-strings';
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
    instructorId: courseData.instructor_id ?? null,
    instructorName: courseData.instructor_name ?? null,
  };
}

export type MappedCourse = ReturnType<typeof mapCourseToComponentFormat>;

export interface UseCourseDetailReturn {
  course: MappedCourse | null;
  sessions: CourseSession[];
  participants: SignupWithProfile[];
  loading: boolean;
  /** Sessions query still resolving — the editor is not yet authoritative. */
  sessionsLoading: boolean;
  /** Sessions query failed — the schedule is unknown, so a save must not treat
   *  an empty editor as "delete everything". */
  sessionsError: boolean;
  participantsLoading: boolean;
  participantsError: boolean;
  /** The course was fetched and genuinely does not exist (row not found). */
  notFound: boolean;
  /** The course fetch failed (network/RLS) — distinct from not-found; retryable. */
  courseLoadError: boolean;
  error: string | null;
  maxParticipants: number;
  setCourse: React.Dispatch<React.SetStateAction<MappedCourse | null>>;
  setSessions: React.Dispatch<React.SetStateAction<CourseSession[]>>;
  setParticipants: React.Dispatch<React.SetStateAction<SignupWithProfile[]>>;
  setMaxParticipants: React.Dispatch<React.SetStateAction<number>>;
  refetchParticipants: () => Promise<void>;
  refetch: () => void;
}

/**
 * Course detail server state on TanStack Query. External API is unchanged
 * from the useState era, so CoursePage/CourseDrawer work as before — but the
 * data now lives in the query cache: CourseDrawer's second invocation shares
 * this page's fetch instead of duplicating it, and drawer → page navigation
 * renders from cache.
 *
 * The set* "setters" write through to the cache (setQueryData). They exist
 * for the legacy hand-patching in CoursePage's save flow; the endgame is
 * mutations + invalidation, at which point they disappear.
 *
 * refetchOnWindowFocus is OFF for these keys: CoursePage holds unsaved form
 * state that effects re-sync from `sessions`/`course`, so a background
 * refetch mid-edit could wipe user input. Data changes only via explicit
 * refetch()/refetchParticipants() (+ the realtime subscription), exactly as
 * before.
 */
export function useCourseDetail(courseId: string | undefined): UseCourseDetailReturn {
  const queryClient = useQueryClient();

  // maxParticipants is FORM state (the editable capacity field): dirty-checked
  // against course.capacity, submitted on save, reset by Forkast. It is
  // initialized from the course once per courseId / explicit refetch — never
  // by cache writes, which would wipe an unsaved capacity edit when an
  // instant-commit action (image upload, drop-in toggle) patches the course.
  const [maxParticipants, setMaxParticipants] = useState(0);
  const initedForRef = useRef<string | null>(null);

  const courseQuery = useQuery({
    queryKey: ['course-detail', courseId],
    enabled: !!courseId,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<MappedCourse | null> => {
      const [courseResult, dropInTier] = await Promise.all([
        fetchCourseById(courseId!),
        fetchDropInTier(courseId!),
      ]);
      if (courseResult.error) throw courseResult.error;
      // A drop-in fetch blip must fail the whole query, not silently render
      // drop-in as "off" (which a subsequent save would persist).
      if (dropInTier.error) throw dropInTier.error;
      if (!courseResult.data) return null; // not found
      return mapCourseToComponentFormat(courseResult.data, dropInTier.active, dropInTier.price);
    },
  });

  useEffect(() => {
    if (courseQuery.data && courseId && initedForRef.current !== courseId) {
      initedForRef.current = courseId;
      setMaxParticipants(courseQuery.data.capacity);
    }
  }, [courseQuery.data, courseId]);

  const sessionsQuery = useQuery({
    queryKey: ['course-sessions', courseId],
    enabled: !!courseId,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<CourseSession[]> => {
      const { data, error } = await fetchCourseSessions(courseId!);
      if (error) throw error;
      return data ?? [];
    },
  });

  const participantsQuery = useQuery({
    queryKey: ['course-participants', courseId],
    enabled: !!courseId,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<SignupWithProfile[]> => {
      const { data, error } = await fetchSignupsByCourseWithProfiles(courseId!);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Cache-writing setters, API-compatible with the old useState dispatchers.
  const setCourse = useCallback<React.Dispatch<React.SetStateAction<MappedCourse | null>>>(
    (action) => {
      queryClient.setQueryData<MappedCourse | null>(['course-detail', courseId], (prev) =>
        typeof action === 'function' ? action(prev ?? null) : action,
      );
    },
    [queryClient, courseId],
  );

  const setSessions = useCallback<React.Dispatch<React.SetStateAction<CourseSession[]>>>(
    (action) => {
      queryClient.setQueryData<CourseSession[]>(['course-sessions', courseId], (prev) =>
        typeof action === 'function' ? action(prev ?? []) : action,
      );
    },
    [queryClient, courseId],
  );

  const setParticipants = useCallback<React.Dispatch<React.SetStateAction<SignupWithProfile[]>>>(
    (action) => {
      queryClient.setQueryData<SignupWithProfile[]>(['course-participants', courseId], (prev) =>
        typeof action === 'function' ? action(prev ?? []) : action,
      );
    },
    [queryClient, courseId],
  );

  const refetchParticipants = useCallback(async () => {
    if (!courseId) return;
    // Background refetch: on error TanStack keeps the last-known data.
    await participantsQuery.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, participantsQuery.refetch]);

  // Subscribe to real-time updates for this course's participants
  useRealtimeSubscription(
    { table: 'signups', filter: `course_id=eq.${courseId}` },
    refetchParticipants,
    !!courseId
  );

  const refetch = useCallback(() => {
    // Full reload (used after saves): re-init maxParticipants from the fresh
    // course, matching the old refetchKey behavior.
    initedForRef.current = null;
    void queryClient.invalidateQueries({ queryKey: ['course-detail', courseId] });
    void queryClient.invalidateQueries({ queryKey: ['course-sessions', courseId] });
  }, [queryClient, courseId]);

  const notFound =
    !!courseId && !courseQuery.isPending && !courseQuery.isError && courseQuery.data === null;
  const courseLoadError = courseQuery.isError;

  const error = !courseId
    ? 'Fant ikke kurset.'
    : courseQuery.isError
      ? GENERIC_ERROR
      : !courseQuery.isPending && courseQuery.data === null
        ? 'Fant ikke kurset.'
        : null;

  return {
    course: courseQuery.data ?? null,
    sessions: sessionsQuery.data ?? [],
    participants: participantsQuery.data ?? [],
    loading: !!courseId && courseQuery.isPending,
    sessionsLoading: !!courseId && sessionsQuery.isPending,
    sessionsError: sessionsQuery.isError,
    participantsLoading: !!courseId && participantsQuery.isPending,
    participantsError: participantsQuery.isError,
    notFound,
    courseLoadError,
    error,
    maxParticipants,
    setCourse,
    setSessions,
    setParticipants,
    setMaxParticipants,
    refetchParticipants,
    refetch,
  };
}
