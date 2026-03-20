// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { Resend } from 'npm:resend@4.0.0'
import { escapeHtml } from '../_shared/auth.ts'

const resendKey = Deno.env.get('RESEND_API_KEY')
if (!resendKey) {
  console.error('RESEND_API_KEY not configured')
}

/** Format a kroner amount with Norwegian thousands separator, e.g. "2 200 kr". */
function formatKr(amount: number | null | undefined): string {
  if (!amount) return 'Gratis';
  return `${amount.toLocaleString('nb-NO')} kr`;
}

const resend = new Resend(resendKey || '')

// Configure your domain - update this after verifying domain in Resend
const FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'onboarding@resend.dev'
const FROM_NAME = Deno.env.get('RESEND_FROM_NAME') || 'Ease'

const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') || '*'
const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/** Validate URL scheme to prevent javascript: / data: injection in href attributes */
function safeUrl(url: string): string {
  if (!url) return ''
  try {
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) return ''
    return encodeURI(url)
  } catch {
    return ''
  }
}

interface SendEmailRequest {
  to: string
  subject: string
  html: string
  text?: string
  replyTo?: string
  // Template-based emails
  template?: 'new-message' | 'signup-confirmation' | 'course-reminder' | 'booking-failed' | 'course-cancelled' | 'student-cancellation' | 'teacher-cancellation' | 'payment-link'
  templateData?: Record<string, string>
}

// Email templates
function getNewMessageTemplate(data: Record<string, string>): { subject: string; html: string; text: string } {
  const senderName = escapeHtml(data.senderName)
  const messagePreview = escapeHtml(data.messagePreview)
  const conversationUrl = safeUrl(data.conversationUrl || '')
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
      <p style="font-size: 12px;">Du mottar denne e-posten fordi du har en konto hos ${organizationName || 'oss'}.</p>
    </div>
  </div>
</body>
</html>
    `,
    text: `
Hei,

Du har mottatt en ny melding fra ${senderName}:

"${messagePreview}..."

Svar her: ${conversationUrl}

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
    subject: `Påmelding ikke fullført: ${courseName}`,
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

    <p>Vi beklager, men din påmelding til <strong>${courseName}</strong> kunne ikke fullføres.</p>

    <p>${reason}</p>

    <div class="info-box">
      <p><strong>Du har ikke blitt belastet.</strong></p>
      <p>Ingen penger er trukket fra kontoen din.</p>
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

Vi beklager, men din påmelding til ${courseName} kunne ikke fullføres.

${reason}

Du har ikke blitt belastet. Ingen penger er trukket fra kontoen din.

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
  const courseUrl = safeUrl(data.courseUrl || '')

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

function getCourseReminderTemplate(data: Record<string, string>): { subject: string; html: string; text: string } {
  const courseName = escapeHtml(data.courseName)
  const courseDate = escapeHtml(data.courseDate)
  const courseTime = escapeHtml(data.courseTime)
  const location = escapeHtml(data.location)
  const organizationName = escapeHtml(data.organizationName)

  return {
    subject: `Påminnelse: ${courseName} starter snart`,
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
    .reminder-badge { background: #dbeafe; color: #1e40af; display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: 500; margin-bottom: 20px; }
    .details-box { background: #f9fafb; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .detail-row { display: flex; margin-bottom: 10px; }
    .detail-label { color: #6b7280; min-width: 100px; }
    .footer { margin-top: 40px; text-align: center; color: #9ca3af; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Ease</div>
    </div>

    <p style="text-align: center;"><span class="reminder-badge">Påminnelse</span></p>

    <p>Hei,</p>

    <p>Dette er en vennlig påminnelse om at <strong>${courseName}</strong> starter snart.</p>

    <div class="details-box">
      <div class="detail-row"><span class="detail-label">Kurs:</span> <span>${courseName}</span></div>
      ${courseDate ? `<div class="detail-row"><span class="detail-label">Dato:</span> <span>${courseDate}</span></div>` : ''}
      ${courseTime ? `<div class="detail-row"><span class="detail-label">Tid:</span> <span>${courseTime}</span></div>` : ''}
      ${location ? `<div class="detail-row"><span class="detail-label">Sted:</span> <span>${location}</span></div>` : ''}
    </div>

    <p>Vi gleder oss til å se deg!</p>

    <div class="footer">
      <p>Hilsen,<br>${organizationName || 'Ease'}</p>
    </div>
  </div>
</body>
</html>
    `,
    text: `
Hei,

Påminnelse: ${courseName} starter snart.

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

function getCourseCancelledTemplate(data: Record<string, string>): { subject: string; html: string; text: string } {
  const participantName = escapeHtml(data.participantName)
  const courseName = escapeHtml(data.courseName)
  const reason = escapeHtml(data.reason)
  const organizationName = escapeHtml(data.organizationName)
  const refundAmount = data.refundAmount // numeric, no escaping needed
  const showRefund = data.showRefund === 'true'

  return {
    subject: `Kurs avlyst: ${courseName}`,
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
    .alert-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .alert-title { color: #991b1b; font-weight: 600; margin-bottom: 8px; }
    .refund-box { background: #dcfce7; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .refund-title { color: #166534; font-weight: 600; margin-bottom: 8px; }
    .footer { margin-top: 40px; text-align: center; color: #9ca3af; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Ease</div>
    </div>

    <p>Hei ${participantName || ''},</p>

    <div class="alert-box">
      <p class="alert-title">Kurset er avlyst</p>
      <p>Vi må dessverre informere om at <strong>${courseName}</strong> er avlyst.</p>
      ${reason ? `<p><em>Årsak: ${reason}</em></p>` : ''}
    </div>

    ${showRefund && refundAmount ? `
    <div class="refund-box">
      <p class="refund-title">Refusjon</p>
      <p>${formatKr(refundAmount)} vil bli tilbakebetalt til din betalingsmetode innen 5-10 virkedager.</p>
    </div>
    ` : ''}

    <p>Vi beklager eventuelle ulemper dette måtte medføre.</p>

    <div class="footer">
      <p>Hilsen,<br>${organizationName || 'Ease'}</p>
    </div>
  </div>
</body>
</html>
    `,
    text: `Hei ${participantName || ''}, vi må dessverre informere om at ${courseName} er avlyst.${showRefund && refundAmount ? ` ${formatKr(refundAmount)} vil bli tilbakebetalt innen 5-10 virkedager.` : ''} Vi beklager eventuelle ulemper.${reason ? ` Årsak: ${reason}` : ''}`
  }
}

function getStudentCancellationTemplate(data: Record<string, string>): { subject: string; html: string; text: string } {
  const participantName = escapeHtml(data.participantName)
  const courseName = escapeHtml(data.courseName)
  const organizationName = escapeHtml(data.organizationName)
  const refundAmount = data.refundAmount
  const canGetRefund = data.canGetRefund === 'true'

  return {
    subject: canGetRefund ? 'Avbestilling bekreftet – Refusjon behandlet' : 'Avbestilling bekreftet',
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
    .status-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: 500; margin-bottom: 20px; }
    .refunded { background: #dcfce7; color: #166534; }
    .no-refund { background: #fef3c7; color: #92400e; }
    .details-box { background: #f9fafb; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .footer { margin-top: 40px; text-align: center; color: #9ca3af; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Ease</div>
    </div>

    <p style="text-align: center;">
      <span class="status-badge ${canGetRefund ? 'refunded' : 'no-refund'}">
        ${canGetRefund ? 'Avbestilling med refusjon' : 'Avbestilling uten refusjon'}
      </span>
    </p>

    <p>Hei ${participantName || ''},</p>

    <p>Din avbestilling fra <strong>${courseName || 'kurset'}</strong> er bekreftet.</p>

    <div class="details-box">
      ${canGetRefund && refundAmount ? `
        <p><strong>Refusjon:</strong> ${formatKr(refundAmount)} vil bli refundert til betalingskortet ditt innen 5\u201310 virkedager.</p>
      ` : `
        <p><strong>Merk:</strong> Siden avbestillingen skjedde mindre enn 48 timer f\u00f8r kursstart, kan vi dessverre ikke tilby refusjon i henhold til v\u00e5re avbestillingsvilk\u00e5r.</p>
      `}
    </div>

    <div class="footer">
      <p>Hilsen,<br>${organizationName || 'Ease'}</p>
    </div>
  </div>
</body>
</html>
    `,
    text: canGetRefund
      ? `Hei ${participantName || ''}, din avbestilling fra ${courseName || 'kurset'} er bekreftet. Refusjon på ${formatKr(refundAmount || 0)} vil bli refundert innen 5\u201310 virkedager.`
      : `Hei ${participantName || ''}, din avbestilling fra ${courseName || 'kurset'} er bekreftet. Siden avbestillingen skjedde mindre enn 48 timer f\u00f8r kursstart, kan vi dessverre ikke tilby refusjon.`
  }
}

function getTeacherCancellationTemplate(data: Record<string, string>): { subject: string; html: string; text: string } {
  const participantName = escapeHtml(data.participantName)
  const courseName = escapeHtml(data.courseName)
  const courseDate = escapeHtml(data.courseDate)
  const courseTime = escapeHtml(data.courseTime)
  const organizationName = escapeHtml(data.organizationName)
  const refundAmount = data.refundAmount
  const refunded = data.refunded === 'true'

  return {
    subject: `Avmelding: ${courseName}`,
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
    .status-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: 500; margin-bottom: 20px; }
    .cancelled { background: #fee2e2; color: #991b1b; }
    .details-box { background: #f9fafb; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .info-box { background: #f0fdf4; border-radius: 12px; padding: 16px; margin: 20px 0; border-left: 4px solid #10b981; }
    .footer { margin-top: 40px; text-align: center; color: #9ca3af; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Ease</div>
    </div>

    <p style="text-align: center;">
      <span class="status-badge cancelled">Påmelding avmeldt</span>
    </p>

    <p>Hei ${participantName || ''},</p>

    <p>Din påmelding til <strong>${courseName}</strong> har blitt avmeldt av ${organizationName || 'studiet'}.</p>

    <div class="details-box">
      <p><strong>Kurs:</strong> ${courseName}</p>
      ${courseDate ? `<p><strong>Dato:</strong> ${courseDate}</p>` : ''}
      ${courseTime ? `<p><strong>Tid:</strong> ${courseTime}</p>` : ''}
    </div>

    ${refunded && refundAmount ? `
    <div class="info-box">
      <p><strong>Refusjon:</strong> ${formatKr(refundAmount)} vil bli tilbakebetalt til din betalingsmetode innen 5\u201310 virkedager.</p>
    </div>
    ` : ''}

    <p>Ta kontakt med ${organizationName || 'oss'} hvis du har spørsmål.</p>

    <div class="footer">
      <p>Hilsen,<br>${organizationName || 'Ease'}</p>
    </div>
  </div>
</body>
</html>
    `,
    text: refunded
      ? `Hei ${participantName || ''}, din påmelding til ${courseName} har blitt avmeldt av ${organizationName || 'studiet'}. Refusjon på ${formatKr(refundAmount || 0)} vil bli tilbakebetalt innen 5-10 virkedager.`
      : `Hei ${participantName || ''}, din påmelding til ${courseName} har blitt avmeldt av ${organizationName || 'studiet'}. Ta kontakt med oss hvis du har spørsmål.`
  }
}

function getPaymentLinkTemplate(data: Record<string, string>): { subject: string; html: string; text: string } {
  const participantName = escapeHtml(data.participantName)
  const courseName = escapeHtml(data.courseName)
  const courseDate = escapeHtml(data.courseDate)
  const courseTime = escapeHtml(data.courseTime)
  const totalPrice = data.totalPrice
  const paymentUrl = safeUrl(data.paymentUrl || '')
  const organizationName = escapeHtml(data.organizationName)

  return {
    subject: `Fullfør betaling: ${courseName}`,
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
    .status-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: 500; margin-bottom: 20px; }
    .pending { background: #fef3c7; color: #92400e; }
    .details-box { background: #f9fafb; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .button { display: inline-block; background: #10b981; color: white; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 600; margin: 20px 0; }
    .footer { margin-top: 40px; text-align: center; color: #9ca3af; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Ease</div>
    </div>

    <p style="text-align: center;">
      <span class="status-badge pending">Betaling venter</span>
    </p>

    <p>Hei ${participantName || ''},</p>

    <p>Vi ser at betalingen for <strong>${courseName}</strong> ikke er fullført ennå. Bruk lenken nedenfor for å fullføre betalingen.</p>

    <div class="details-box">
      <p><strong>Kurs:</strong> ${courseName}</p>
      ${courseDate ? `<p><strong>Dato:</strong> ${courseDate}</p>` : ''}
      ${courseTime ? `<p><strong>Tid:</strong> ${courseTime}</p>` : ''}
      <p><strong>Beløp:</strong> ${formatKr(totalPrice)}</p>
    </div>

    <p style="text-align: center;">
      <a href="${paymentUrl}" class="button">Betal nå</a>
    </p>

    <p style="text-align: center; font-size: 12px; color: #9ca3af;">
      Eller kopier denne lenken: ${paymentUrl}
    </p>

    <p>Ta kontakt med ${organizationName} hvis du har spørsmål.</p>

    <div class="footer">
      <p>Hilsen,<br>${organizationName || 'Ease'}</p>
    </div>
  </div>
</body>
</html>
    `,
    text: `Hei ${participantName || ''}, vi ser at betalingen for ${courseName} ikke er fullført. Bruk denne lenken for å betale: ${paymentUrl}. Beløp: ${formatKr(totalPrice)}.`
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

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!body.to || !emailRegex.test(body.to)) {
      return new Response(
        JSON.stringify({ error: 'Invalid or missing recipient email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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
        case 'course-reminder':
          emailContent = getCourseReminderTemplate(body.templateData)
          break
        case 'course-cancelled':
          emailContent = getCourseCancelledTemplate(body.templateData)
          break
        case 'student-cancellation':
          emailContent = getStudentCancellationTemplate(body.templateData)
          break
        case 'teacher-cancellation':
          emailContent = getTeacherCancellationTemplate(body.templateData)
          break
        case 'payment-link':
          emailContent = getPaymentLinkTemplate(body.templateData)
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
