// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { Resend } from 'npm:resend@4.0.0'
import { escapeHtml } from '../_shared/auth.ts'

const resendKey = Deno.env.get('RESEND_API_KEY')
if (!resendKey) {
  console.error('RESEND_API_KEY not configured')
}

const resend = new Resend(resendKey || '')

// Configure your domain - update this after verifying domain in Resend
const FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'onboarding@resend.dev'
const FROM_NAME = Deno.env.get('RESEND_FROM_NAME') || 'Ease'

const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') || '*'
const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SendEmailRequest {
  to: string
  subject: string
  html: string
  text?: string
  replyTo?: string
  // Template-based emails
  template?: 'new-message' | 'signup-confirmation' | 'course-reminder' | 'booking-failed'
  templateData?: Record<string, string>
}

// Email templates
function getNewMessageTemplate(data: Record<string, string>): { subject: string; html: string; text: string } {
  const senderName = escapeHtml(data.senderName)
  const messagePreview = escapeHtml(data.messagePreview)
  const conversationUrl = encodeURI(data.conversationUrl || '')
  const organizationName = escapeHtml(data.organizationName)

  return {
    subject: `Ny melding fra ${senderName}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { font-size: 24px; font-weight: bold; color: #10b981; }
    .message-box { background: #f9fafb; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #10b981; }
    .message-preview { font-style: italic; color: #6b7280; }
    .button { display: inline-block; background: #10b981; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500; margin: 20px 0; }
    .footer { margin-top: 40px; text-align: center; color: #9ca3af; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Ease</div>
    </div>

    <p>Hei,</p>

    <p>Du har mottatt en ny melding fra <strong>${senderName}</strong>:</p>

    <div class="message-box">
      <p class="message-preview">"${messagePreview}..."</p>
    </div>

    <p style="text-align: center;">
      <a href="${conversationUrl}" class="button">Svar på melding</a>
    </p>

    <div class="footer">
      <p>Hilsen,<br>${organizationName || 'Ease'}</p>
      <p style="font-size: 12px;">Du mottar denne e-posten fordi du er registrert hos ${organizationName || 'oss'}.</p>
    </div>
  </div>
</body>
</html>
    `,
    text: `
Hei,

Du har mottatt en ny melding fra ${senderName}:

"${messagePreview}..."

Klikk her for å svare: ${conversationUrl}

Hilsen,
${organizationName || 'Ease'}
    `.trim()
  }
}

function getBookingFailedTemplate(data: Record<string, string>): { subject: string; html: string; text: string } {
  const courseName = escapeHtml(data.courseName)
  const reason = escapeHtml(data.reason)
  const wasCharged = data.wasCharged

  return {
    subject: `Påmelding ikke gjennomført: ${courseName}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { font-size: 24px; font-weight: bold; color: #10b981; }
    .warning-badge { background: #fef3c7; color: #92400e; display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: 500; margin-bottom: 20px; }
    .info-box { background: #f0fdf4; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #10b981; }
    .footer { margin-top: 40px; text-align: center; color: #9ca3af; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Ease</div>
    </div>

    <p style="text-align: center;"><span class="warning-badge">Påmelding ikke fullført</span></p>

    <p>Hei,</p>

    <p>Vi beklager, men din påmelding til <strong>${courseName}</strong> kunne ikke gjennomføres.</p>

    <p>${reason}</p>

    <div class="info-box">
      <p><strong>Du har ikke blitt belastet.</strong></p>
      <p>Betalingsautorisasjonen har blitt kansellert, og ingen penger er trukket fra kontoen din.</p>
    </div>

    <p>Hvis du fortsatt ønsker å delta, kan du prøve igjen.</p>

    <div class="footer">
      <p>Hilsen,<br>Ease</p>
    </div>
  </div>
</body>
</html>
    `,
    text: `
Hei,

Vi beklager, men din påmelding til ${courseName} kunne ikke gjennomføres.

${reason}

Du har ikke blitt belastet. Betalingsautorisasjonen har blitt kansellert, og ingen penger er trukket fra kontoen din.

Hvis du fortsatt ønsker å delta, kan du prøve igjen.

Hilsen,
Ease
    `.trim()
  }
}

function getSignupConfirmationTemplate(data: Record<string, string>): { subject: string; html: string; text: string } {
  const courseName = escapeHtml(data.courseName)
  const courseDate = escapeHtml(data.courseDate)
  const courseTime = escapeHtml(data.courseTime)
  const location = escapeHtml(data.location)
  const organizationName = escapeHtml(data.organizationName)
  const courseUrl = data.courseUrl ? encodeURI(data.courseUrl) : ''

  return {
    subject: `Bekreftelse: Du er påmeldt ${courseName}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { font-size: 24px; font-weight: bold; color: #10b981; }
    .success-badge { background: #dcfce7; color: #166534; display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: 500; margin-bottom: 20px; }
    .details-box { background: #f9fafb; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .detail-row { display: flex; margin-bottom: 10px; }
    .detail-label { color: #6b7280; min-width: 100px; }
    .button { display: inline-block; background: #10b981; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500; margin: 20px 0; }
    .footer { margin-top: 40px; text-align: center; color: #9ca3af; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Ease</div>
    </div>

    <p style="text-align: center;"><span class="success-badge">Påmelding bekreftet</span></p>

    <p>Hei,</p>

    <p>Din påmelding til <strong>${courseName}</strong> er bekreftet!</p>

    <div class="details-box">
      <div class="detail-row"><span class="detail-label">Kurs:</span> <span>${courseName}</span></div>
      ${courseDate ? `<div class="detail-row"><span class="detail-label">Dato:</span> <span>${courseDate}</span></div>` : ''}
      ${courseTime ? `<div class="detail-row"><span class="detail-label">Tid:</span> <span>${courseTime}</span></div>` : ''}
      ${location ? `<div class="detail-row"><span class="detail-label">Sted:</span> <span>${location}</span></div>` : ''}
    </div>

    ${courseUrl ? `
    <p style="text-align: center;">
      <a href="${courseUrl}" class="button">Se kursdetaljer</a>
    </p>
    ` : ''}

    <div class="footer">
      <p>Vi gleder oss til å se deg!</p>
      <p>Hilsen,<br>${organizationName || 'Ease'}</p>
    </div>
  </div>
</body>
</html>
    `,
    text: `
Hei,

Din påmelding til ${courseName} er bekreftet!

Kurs: ${courseName}
${courseDate ? `Dato: ${courseDate}` : ''}
${courseTime ? `Tid: ${courseTime}` : ''}
${location ? `Sted: ${location}` : ''}

Vi gleder oss til å se deg!

Hilsen,
${organizationName || 'Ease'}
    `.trim()
  }
}

const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

function verifyServiceRole(req: Request): boolean {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) return false
  const token = authHeader.replace('Bearer ', '')
  return token === supabaseServiceKey
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // This is an internal-only function - require service role key
  if (!verifyServiceRole(req)) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const body: SendEmailRequest = await req.json()

    let emailContent: { subject: string; html: string; text?: string }

    // Check if using a template
    if (body.template && body.templateData) {
      switch (body.template) {
        case 'new-message':
          emailContent = getNewMessageTemplate(body.templateData)
          break
        case 'signup-confirmation':
          emailContent = getSignupConfirmationTemplate(body.templateData)
          break
        case 'booking-failed':
          emailContent = getBookingFailedTemplate(body.templateData)
          break
        default:
          return new Response(
            JSON.stringify({ error: `Unknown template: ${body.template}` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
      }
    } else {
      // Direct email content
      if (!body.to || !body.subject || !body.html) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: to, subject, html' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      emailContent = {
        subject: body.subject,
        html: body.html,
        text: body.text
      }
    }

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: body.to,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
      reply_to: body.replyTo,
    })

    if (error) {
      console.error('Resend error:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, messageId: data?.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Send email error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
