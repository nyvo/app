import { supabase } from '@/lib/supabase';

export interface SupportCourseOption {
  id: string;
  title: string;
  status: string;
  startDate: string | null;
}

export interface SupportSignupOption {
  id: string;
  participantName: string;
  participantEmail: string;
  status: string;
  paymentStatus: string | null;
}

export async function fetchSupportCourses(
  sellerId: string,
): Promise<{ data: SupportCourseOption[]; error: Error | null }> {
  const { data, error } = await supabase
    .from('courses')
    .select('id, title, status, start_date')
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) return { data: [], error: error as Error };

  return {
    data: (data ?? []).map((course) => ({
      id: course.id,
      title: course.title,
      status: course.status,
      startDate: course.start_date,
    })),
    error: null,
  };
}

export async function fetchSupportSignups(
  courseId: string,
): Promise<{ data: SupportSignupOption[]; error: Error | null }> {
  const { data, error } = await supabase
    .from('signups')
    .select('id, participant_name, participant_email, status, payment_status')
    .eq('course_id', courseId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) return { data: [], error: error as Error };

  return {
    data: (data ?? []).map((signup) => ({
      id: signup.id,
      participantName: signup.participant_name,
      participantEmail: signup.participant_email,
      status: signup.status,
      paymentStatus: signup.payment_status,
    })),
    error: null,
  };
}
