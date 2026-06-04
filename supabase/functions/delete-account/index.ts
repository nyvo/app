// Delete account — TEMPORARILY DISABLED for self-service.
//
// The previous implementation performed several separately-committed mutations
// (anonymize signups, anonymize payment_attempts, null FK refs) and then a hard
// seller delete that cascades through courses → signups → payment_attempts →
// payment_audit_log. That destroys financial records the law requires us to
// retain (bokføringsloven, 5 yrs). It was also buggy: the PII anonymization set
// participant_name/participant_email to NULL on NOT NULL columns, so the update
// failed silently and PII could survive a "successful" deletion. And with the
// new BEFORE DELETE retention trigger on courses, the seller delete now aborts
// for any owner of paid courses — leaving the earlier steps partially applied.
//
// Until a proper anonymization / tombstoning workflow exists, refuse up front —
// before any mutation — and route users to support for assisted deletion.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { verifyAuth, handleCors, errorResponse } from '../_shared/auth.ts'

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const auth = await verifyAuth(req)
    if (!auth.authenticated || !auth.userId) {
      return errorResponse(auth.error || 'Unauthorized', 401, req)
    }

    // Fail closed, before touching any data.
    return errorResponse(
      'Kontoen kan ikke slettes automatisk akkurat nå. Kontakt support, så hjelper vi deg med sletting og anonymisering.',
      409,
      req,
    )
  } catch (err) {
    console.error('delete-account error:', err)
    return errorResponse('Noe gikk galt', 500, req)
  }
})
