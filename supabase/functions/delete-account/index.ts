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
  deletable: boolean
}

// Extract the object path of a seller-logos Storage URL. Returns null for
// external/malformed URLs so we never attempt to delete something outside our
// own bucket.
function extractSellerLogoPath(url: string | null): string | null {
  if (!url) return null
  const marker = '/seller-logos/'
  const i = url.indexOf(marker)
  if (i === -1) return null
  let path = url.slice(i + marker.length)
  const q = path.indexOf('?')
  if (q !== -1) path = path.slice(0, q)
  try {
    path = decodeURIComponent(path)
  } catch {
    return null
  }
  return path.length > 0 ? path : null
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

    // Capture seller-logo Storage paths for the studios that will be anonymized,
    // BEFORE deletion — close_and_anonymize_seller nulls logo_url in the cascade,
    // so we can't read them afterwards. We only remove the objects once the user
    // delete actually succeeds (below), so a guard abort never deletes a logo for
    // a still-active studio.
    const dormantIds = (blockers.dormant_studios ?? []).map((s) => s.seller_id)
    let logoPaths: string[] = []
    if (dormantIds.length > 0) {
      const { data: logos } = await supabase
        .from('sellers')
        .select('logo_url')
        .in('id', dormantIds)
      logoPaths = (logos ?? [])
        .map((r) => extractSellerLogoPath((r as { logo_url: string | null }).logo_url))
        .filter((p): p is string => p !== null)
    }

    // Delete the auth user → cascades to the profile. The BEFORE DELETE guard on
    // profiles does the rest atomically: re-checks blockers (aborts if one
    // appeared), closes + anonymizes any dormant studios, and redacts the user's
    // booking notifications — so nothing is half-applied if this call fails.
    const { error: delErr } = await supabase.auth.admin.deleteUser(userId)
    if (delErr) {
      console.error('auth.admin.deleteUser failed:', delErr)
      return errorResponse(
        'Kontoen kan ikke slettes akkurat nå. Kontakt support hvis det vedvarer.',
        409,
        req,
      )
    }

    // Best-effort: remove the now-anonymized studios' logo objects from Storage
    // (the column was already nulled atomically by the guard). Non-fatal — the
    // account is already deleted; a leftover object is a minor cleanup miss.
    if (logoPaths.length > 0) {
      const { error: rmErr } = await supabase.storage.from('seller-logos').remove(logoPaths)
      if (rmErr) console.error('seller-logos cleanup failed (non-fatal):', rmErr)
    }

    return successResponse({ ok: true }, 200, req)
  } catch (err) {
    console.error('delete-account error:', err)
    return errorResponse('Noe gikk galt', 500, req)
  }
})
