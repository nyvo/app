import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import {
  verifyAuth,
  handleCors,
  errorResponse,
  successResponse,
} from '../_shared/auth.ts'
import { sendEmail } from '../_shared/email.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const supportEmail = Deno.env.get('SUPPORT_EMAIL') || 'hei@framio.no'

interface SupportMessageRequest {
  subject: string
  message: string
  sellerId?: string | null
}

const SUBJECTS = new Set([
  'Kurs og påmeldinger',
  'Betaling og utbetaling',
  'Studio og innstillinger',
  'Innlogging og konto',
  'Annet',
])

Deno.serve(async (req: Request) => {
  const cors = handleCors(req)
  if (cors) return cors

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405, req)
  }

  const auth = await verifyAuth(req)
  if (!auth.authenticated || !auth.userId) {
    return errorResponse(auth.error || 'Unauthorized', 401, req)
  }

  let body: SupportMessageRequest
  try {
    body = await req.json()
  } catch {
    return errorResponse('Invalid JSON', 400, req)
  }

  const subject = (body.subject ?? '').trim()
  const message = (body.message ?? '').trim()
  const sellerId = (body.sellerId ?? '').trim()

  if (!SUBJECTS.has(subject)) {
    return errorResponse('Invalid subject', 400, req)
  }

  if (message.length < 2 || message.length > 4000) {
    return errorResponse('Message must be 2–4000 characters', 400, req)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('email, name')
    .eq('id', auth.userId)
    .maybeSingle()

  if (profileError || !profile) {
    return errorResponse('Profile not found', 404, req)
  }

  const senderEmail = (profile as { email: string; name: string | null }).email
  const senderName = (profile as { email: string; name: string | null }).name ?? ''
  let sellerName = ''

  if (sellerId) {
    const { data: membership, error: membershipError } = await supabase
      .from('seller_members')
      .select('seller:sellers(id, name)')
      .eq('user_id', auth.userId)
      .eq('seller_id', sellerId)
      .maybeSingle()

    if (membershipError) {
      console.error('[send-support-message] seller lookup failed', membershipError)
    }

    const seller = (membership as { seller?: { id: string; name: string } | null } | null)?.seller
    if (seller) {
      sellerName = seller.name
    }
  }

  const result = await sendEmail({
    template: 'support-message',
    to: supportEmail,
    replyTo: senderEmail,
    props: {
      userId: auth.userId,
      senderName,
      senderEmail,
      sellerId: sellerName ? sellerId : undefined,
      sellerName,
      supportSubject: subject,
      message,
    },
  })

  if (result.error) {
    console.error('[send-support-message] email error', result.error)
    return errorResponse('Could not send support message', 502, req)
  }

  return successResponse({ id: result.id }, 200, req)
})
