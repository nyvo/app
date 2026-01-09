import { supabase } from '@/lib/supabase'
import type { CourseStyle, CourseType, CourseStatus, CourseLevel } from '@/types/database'

// Public course with computed fields for display
export interface PublicCourseWithDetails {
  id: string
  title: string
  description: string | null
  course_type: CourseType
  status: CourseStatus
  level: CourseLevel | null
  location: string | null
  time_schedule: string | null
  duration: number | null
  max_participants: number | null
  price: number | null
  start_date: string | null
  end_date: string | null
  image_url: string | null
  style: CourseStyle | null
  organization_id: string
  spots_available: number
  organization: {
    name: string
    slug: string
  } | null
}

export interface PublicCoursesFilters {
  styleId?: string
  level?: string
  fromDate?: string
  organizationSlug?: string
  limit?: number
  offset?: number
}

// Fetch all published courses (status != 'draft') for public viewing
export async function fetchPublicCourses(
  filters?: PublicCoursesFilters
): Promise<{
  data: PublicCourseWithDetails[] | null
  error: Error | null
  count?: number
}> {
  let query = supabase
    .from('courses')
    .select(`
      id,
      title,
      description,
      course_type,
      status,
      level,
      location,
      time_schedule,
      duration,
      max_participants,
      price,
      start_date,
      end_date,
      image_url,
      organization_id,
      style:course_styles(id, name, normalized_name, color),
      organization:organizations(name, slug)
    `, { count: filters?.limit ? 'exact' : undefined })
    .neq('status', 'draft')
    .order('start_date', { ascending: true })

  // Apply filters
  if (filters?.styleId) {
    query = query.eq('style_id', filters.styleId)
  }
  if (filters?.level) {
    query = query.eq('level', filters.level)
  }
  if (filters?.fromDate) {
    query = query.gte('start_date', filters.fromDate)
  }
  if (filters?.organizationSlug) {
    query = query.eq('organization.slug', filters.organizationSlug)
  }

  // Apply pagination
  const limit = filters?.limit || 20 // Default 20 courses per page
  const offset = filters?.offset || 0

  query = query.range(offset, offset + limit - 1)

  const { data: courses, error: coursesError, count } = await query

  if (coursesError) {
    return { data: null, error: coursesError as Error }
  }

  if (!courses || courses.length === 0) {
    return { data: [], error: null }
  }

  // Get signup counts for all courses in one query
  const courseIds = courses.map(c => c.id)
  const { data: signupCounts, error: signupError } = await supabase
    .from('signups')
    .select('course_id')
    .in('course_id', courseIds)
    .eq('status', 'confirmed')

  if (signupError) {
    // Signup count fetch failed, continue with zero counts
  }

  // Count signups per course
  const signupCountMap: Record<string, number> = {}
  for (const signup of signupCounts || []) {
    signupCountMap[signup.course_id] = (signupCountMap[signup.course_id] || 0) + 1
  }

  // Map to public format with spots available
  const publicCourses: PublicCourseWithDetails[] = courses.map(course => {
    const maxParticipants = course.max_participants || 0
    const confirmedCount = signupCountMap[course.id] || 0
    const spotsAvailable = Math.max(0, maxParticipants - confirmedCount)

    return {
      id: course.id,
      title: course.title,
      description: course.description,
      course_type: course.course_type as CourseType,
      status: course.status as CourseStatus,
      level: course.level as CourseLevel | null,
      location: course.location,
      time_schedule: course.time_schedule,
      duration: course.duration,
      max_participants: course.max_participants,
      price: course.price,
      start_date: course.start_date,
      end_date: course.end_date,
      image_url: course.image_url,
      organization_id: course.organization_id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      style: course.style as any as CourseStyle | null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      organization: course.organization as any,
      spots_available: spotsAvailable,
    }
  })

  // Filter out past courses
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const activeCourses = publicCourses.filter(course => {
    const relevantDateStr = course.end_date || course.start_date
    if (!relevantDateStr) return true // No date = show course

    const relevantDate = new Date(relevantDateStr)
    relevantDate.setHours(23, 59, 59, 999) // End of day

    return relevantDate >= today
  })

  return { data: activeCourses, error: null, count: count || undefined }
}

// Fetch a single course by ID for public detail page
export async function fetchPublicCourseById(
  courseId: string
): Promise<{ data: PublicCourseWithDetails | null; error: Error | null }> {
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select(`
      id,
      title,
      description,
      course_type,
      status,
      level,
      location,
      time_schedule,
      duration,
      max_participants,
      price,
      start_date,
      end_date,
      image_url,
      organization_id,
      style:course_styles(id, name, normalized_name, color),
      organization:organizations(name, slug)
    `)
    .eq('id', courseId)
    .neq('status', 'draft')
    .single()

  if (courseError) {
    return { data: null, error: courseError as Error }
  }

  if (!course) {
    return { data: null, error: new Error('Course not found') }
  }

  // Get signup count for this course
  const { count, error: countError } = await supabase
    .from('signups')
    .select('*', { count: 'exact', head: true })
    .eq('course_id', courseId)
    .eq('status', 'confirmed')

  if (countError) {
    // Signup count fetch failed, continue with zero count
  }

  const confirmedCount = count || 0
  const maxParticipants = course.max_participants || 0
  const spotsAvailable = Math.max(0, maxParticipants - confirmedCount)

  const publicCourse: PublicCourseWithDetails = {
    id: course.id,
    title: course.title,
    description: course.description,
    course_type: course.course_type as CourseType,
    status: course.status as CourseStatus,
    level: course.level as CourseLevel | null,
    location: course.location,
    time_schedule: course.time_schedule,
    duration: course.duration,
    max_participants: course.max_participants,
    price: course.price,
    start_date: course.start_date,
    end_date: course.end_date,
    image_url: course.image_url,
    organization_id: course.organization_id,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    style: course.style as any as CourseStyle | null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    organization: course.organization as any,
    spots_available: spotsAvailable,
  }

  return { data: publicCourse, error: null }
}

// Fetch available course styles for filter dropdown
export async function fetchPublicCourseStyles(): Promise<{
  data: CourseStyle[] | null
  error: Error | null
}> {
  const { data, error } = await supabase
    .from('course_styles')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    return { data: null, error: error as Error }
  }

  return { data: data as CourseStyle[], error: null }
}
