// Delete account — removes the caller's login + profile only.
//
// Safety model (see docs/account-deletion-design.md): this NEVER deletes or
// alters business content. It deletes the auth user, which cascades to the
// profile; FK rules clear the profile's own references (instructor_id,
// invited_by, buyer_id -> NULL) and memberships, while paid bookings/payments
// are retained. The BEFORE DELETE guard on profiles is the atomic backstop: it
// refuses if the user is a sole seller owner, an active-course instructor, or
// owns Storage objects. We re-check those here first so the user gets a clear,
// specific reason instead of a generic failure.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { verifyAuth, handleCors, errorResponse, successResponse } from '../_shared/auth.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

interface Studio { seller_id: string; name: string | null }
interface Blockers {
  blocking_studios: Studio[]
  dormant_studios: Studio[]
  active_instructor_courses: { course_id: string; title: string | null }[]
  owned_storage_objects: number
  deletable: boolean
}

function blockerMessage(b: Blockers): string {
  if (b.blocking_studios.length > 0) {
    const name = b.blocking_studios[0]?.name?.trim()
    return name
      ? `Du har aktive kurs eller uavsluttede betalinger i «${name}». Fullfør eller avlys disse før du kan slette kontoen.`
      : 'Du har et studio med aktive kurs eller uavsluttede betalinger. Fullfør eller avlys disse før du kan slette kontoen.'
  }
  if (b.active_instructor_courses.length > 0) {
    return 'Du er satt som instruktør på aktive eller kommende kurs. Fjern deg fra disse kursene før du sletter kontoen.'
  }
  if (b.owned_storage_objects > 0) {
    return 'Du har opplastede bilder knyttet til kontoen. Kontakt support, så hjelper vi deg med å slette kontoen.'
  }
  return 'Kontoen kan ikke slettes automatisk akkurat nå. Kontakt support.'
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const auth = await verifyAuth(req)
    if (!auth.authenticated || !auth.userId) {
      return errorResponse(auth.error || 'Du er ikke logget inn.', 401, req)
    }
    const userId = auth.userId
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Pre-check blockers (service-role helper). The DB guard is still the
    // ultimate, atomic backstop — this just produces a friendly reason.
    const { data, error: blockerErr } = await supabase.rpc('_account_deletion_blockers', {
      p_user_id: userId,
    })
    if (blockerErr) {
      console.error('blocker check failed:', blockerErr)
      return errorResponse('Kunne ikke sjekke kontoen. Prøv igjen.', 500, req)
    }
    const blockers = data as Blockers
    if (!blockers.deletable) {
      return errorResponse(blockerMessage(blockers), 409, req)
    }

    // Dormant studios this user solely owns are closed + anonymized first — their
    // financial records are kept, the studio becomes an ownerless tombstone. (A
    // studio with unfinished business would have blocked above.)
    for (const studio of blockers.dormant_studios) {
      const { error: closeErr } = await supabase.rpc('close_and_anonymize_seller', {
        p_seller_id: studio.seller_id,
      })
      if (closeErr) {
        console.error('close_and_anonymize_seller failed:', studio.seller_id, closeErr)
        return errorResponse('Kunne ikke avslutte studioet automatisk. Kontakt support.', 500, req)
      }
    }

    // Delete the auth user → cascades to the profile. The BEFORE DELETE guard
    // re-evaluates atomically and aborts if a blocker appeared in between.
    const { error: delErr } = await supabase.auth.admin.deleteUser(userId)
    if (delErr) {
      console.error('auth.admin.deleteUser failed:', delErr)
      return errorResponse(
        'Kontoen kan ikke slettes akkurat nå. Kontakt support hvis det vedvarer.',
        409,
        req,
      )
    }

    return successResponse({ ok: true }, 200, req)
  } catch (err) {
    console.error('delete-account error:', err)
    return errorResponse('Noe gikk galt', 500, req)
  }
})
