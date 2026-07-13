import { supabase } from '@/lib/supabase';
import type { Instructor } from '@/types/database';

// ---------------------------------------------------------------------------
// A studio's saved instructor names (no logins — see the 2026-07-14 spec).
// courses.instructor_name is the denormalized display copy the public pages
// read; renameInstructor keeps it in sync. Deleting an instructor nulls the
// FK (ON DELETE SET NULL) but leaves instructor_name on existing courses, so
// past attribution stays truthful — until that course's settings are next
// saved, at which point the form commits whatever it shows (see
// CourseSettingsTab: an unset picker saves as no instructor and clears the
// retained name).
// ---------------------------------------------------------------------------

export async function fetchInstructors(
  sellerId: string,
): Promise<{ data: Instructor[]; error: Error | null }> {
  const { data, error } = await supabase
    .from('instructors')
    .select('*')
    .eq('seller_id', sellerId)
    .order('name');
  if (error) return { data: [], error: error as Error };
  return { data: (data ?? []) as Instructor[], error: null };
}

export async function createInstructor(
  sellerId: string,
  name: string,
): Promise<{ data: Instructor | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('instructors')
    .insert({ seller_id: sellerId, name: name.trim() })
    .select()
    .single();
  if (error) return { data: null, error: error as Error };
  return { data: data as Instructor, error: null };
}

/** Renames the saved entry, then syncs the denormalized display name on that
 * instructor's courses. Two sequential statements (not atomic): a failure
 * between them leaves course rows one rename behind, which the next rename
 * repairs — accepted in the spec. */
export async function renameInstructor(
  id: string,
  name: string,
): Promise<{ error: Error | null }> {
  const trimmed = name.trim();
  const { error } = await supabase.from('instructors').update({ name: trimmed }).eq('id', id);
  if (error) return { error: error as Error };
  const { error: syncError } = await supabase
    .from('courses')
    .update({ instructor_name: trimmed })
    .eq('instructor_id', id);
  if (syncError) return { error: syncError as Error };
  return { error: null };
}

export async function deleteInstructor(id: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('instructors').delete().eq('id', id);
  if (error) return { error: error as Error };
  return { error: null };
}
