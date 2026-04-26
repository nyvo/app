import { supabase, typedFrom } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import type {
  TicketType,
  TicketTypeInsert,
  TicketTypeUpdate,
} from '@/types/database'

/**
 * Service layer for ticket types (course_signup_packages).
 *
 * The table is named "course_signup_packages" for back-compat, but the model
 * is "ticket types" everywhere — every priced unit (full course, multi-week
 * package, drop-in for one session) is a row, distinguished by ticket_kind.
 *
 * RLS gates these calls: org owners/admins can create/update/delete rows
 * whose course_id belongs to their org. The teacher editor relies on those
 * policies — service-layer code does no extra membership checks.
 */

export interface ListTicketTypesResult {
  data: TicketType[]
  error: Error | null
}

/**
 * Fetch all tier rows for a course, including inactive ones (org members
 * see the full set so they can edit/re-enable archived tiers; the public
 * RPC `available_ticket_types` filters for buyers).
 */
export async function fetchTicketTypesForCourse(
  courseId: string,
): Promise<ListTicketTypesResult> {
  const { data, error } = await supabase
    .from('course_signup_packages')
    .select('*')
    .eq('course_id', courseId)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    logger.error('fetchTicketTypesForCourse failed:', error)
    return { data: [], error: error as Error }
  }
  return { data: (data ?? []) as TicketType[], error: null }
}

export async function createTicketType(
  input: TicketTypeInsert,
): Promise<{ data: TicketType | null; error: Error | null }> {
  const { data, error } = await typedFrom('course_signup_packages')
    .insert(input)
    .select()
    .single()

  if (error) {
    logger.error('createTicketType failed:', error)
    return { data: null, error: error as Error }
  }
  return { data: data as TicketType, error: null }
}

export async function updateTicketType(
  id: string,
  patch: TicketTypeUpdate,
): Promise<{ data: TicketType | null; error: Error | null }> {
  const { data, error } = await typedFrom('course_signup_packages')
    .update(patch)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    logger.error('updateTicketType failed:', error)
    return { data: null, error: error as Error }
  }
  return { data: data as TicketType, error: null }
}

/**
 * Soft delete (`is_active = false`). Hard delete is only safe when no
 * signups reference the row. The RLS DELETE policy permits hard delete,
 * but the FK from signups.ticket_type_id is `NO ACTION` — so trying to
 * hard-delete a referenced row will fail at the DB. Soft delete is the
 * preferred path for any tier with historical signups.
 */
export async function deactivateTicketType(
  id: string,
): Promise<{ error: Error | null }> {
  const { error } = await typedFrom('course_signup_packages')
    .update({ is_active: false })
    .eq('id', id)

  if (error) {
    logger.error('deactivateTicketType failed:', error)
    return { error: error as Error }
  }
  return { error: null }
}

export async function reactivateTicketType(
  id: string,
): Promise<{ error: Error | null }> {
  const { error } = await typedFrom('course_signup_packages')
    .update({ is_active: true })
    .eq('id', id)

  if (error) {
    logger.error('reactivateTicketType failed:', error)
    return { error: error as Error }
  }
  return { error: null }
}

/**
 * Hard delete — only works if no signup references this tier (FK is NO ACTION).
 * Returns the FK violation as an Error so the caller can surface the right
 * message (typically: "Use 'Arkiver' instead — this tier has past signups").
 */
export async function deleteTicketType(
  id: string,
): Promise<{ error: Error | null }> {
  const { error } = await typedFrom('course_signup_packages')
    .delete()
    .eq('id', id)

  if (error) {
    logger.error('deleteTicketType failed:', error)
    return { error: error as Error }
  }
  return { error: null }
}

/**
 * Make a tier the default. Atomically: clears the previous default first
 * (the partial unique index `WHERE is_default` requires only one true row
 * per course at any time, so we can't just flip the new one — we have to
 * unset the old one in the same logical step).
 */
export async function setDefaultTicketType(
  courseId: string,
  ticketTypeId: string,
): Promise<{ error: Error | null }> {
  // Step 1: unset any current default for this course.
  const { error: unsetErr } = await typedFrom('course_signup_packages')
    .update({ is_default: false })
    .eq('course_id', courseId)
    .eq('is_default', true)

  if (unsetErr) {
    logger.error('setDefaultTicketType (unset) failed:', unsetErr)
    return { error: unsetErr as Error }
  }

  // Step 2: set the new default.
  const { error: setErr } = await typedFrom('course_signup_packages')
    .update({ is_default: true })
    .eq('id', ticketTypeId)

  if (setErr) {
    logger.error('setDefaultTicketType (set) failed:', setErr)
    return { error: setErr as Error }
  }

  return { error: null }
}

/**
 * "Dupliser som rabatt" — copies the source tier with audience flipped to
 * `student` and a default 25% discount applied to the price. Caller can
 * tweak the resulting form before saving. Returns the prepared Insert
 * shape rather than persisting, so the editor can show the form prefilled.
 */
export function buildDiscountDuplicate(source: TicketType): TicketTypeInsert {
  const discountedPrice = Math.round(source.price * 0.75)
  return {
    course_id: source.course_id,
    label: `${source.label} — student`,
    description: source.description,
    price: discountedPrice,
    weeks: source.weeks,
    ticket_kind: source.ticket_kind,
    audience: 'student',
    is_full_course: source.is_full_course,
    is_active: true,
    is_default: false,
    display_order: source.display_order + 1,
    sales_starts_at: source.sales_starts_at,
    sales_ends_at: source.sales_ends_at,
    max_quantity: source.max_quantity,
  }
}
