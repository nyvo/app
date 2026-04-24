// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { Resend } from 'npm:resend@4.0.0'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { escapeHtml, getCorsHeaders } from '../_shared/auth.ts'

const resendKey = Deno.env.get('RESEND_API_KEY')
if (!resendKey) {
  console.error('RESEND_API_KEY not configured')
}

/** Format a kroner amount with Norwegian thousands separator, e.g. "2 200 kr". */
function formatKr(amount: number | null | undefined): string {
  return `${(amount ?? 0).toLocaleString('nb-NO')} kr`;
}

const resend = new Resend(resendKey || '')

// Configure your domain - update this after verifying domain in Resend
const FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'onboarding@resend.dev'
const FROM_NAME = Deno.env.get('RESEND_FROM_NAME') || 'Ease'

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
  template?: 'new-message' | 'teacher-broadcast' | 'signup-confirmation' | 'course-reminder' | 'booking-failed' | 'course-cancelled' | 'course-schedule-change' | 'student-cancellation' | 'teacher-cancellation' | 'payment-link'
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

function getCourseScheduleChangeTemplate(data: Record<string, string>): { subject: string; html: string; text: string } {
  const participantName = escapeHtml(data.participantName)
  const courseName = escapeHtml(data.courseName)
  const oldDate = escapeHtml(data.oldDate)
  const oldTime = escapeHtml(data.oldTime)
  const newDate = escapeHtml(data.newDate)
  const newTime = escapeHtml(data.newTime)
  const organizationName = escapeHtml(data.organizationName)

  return {
    subject: `Endret tidspunkt: ${data.courseName}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #18181b; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { font-size: 24px; font-weight: 600; color: #1a1a1a; }
    .info-box { background: #f5f5f5; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .change-row { display: block; margin: 6px 0; }
    .label { color: #737373; font-size: 14px; }
    .old-value { color: #737373; text-decoration: line-through; }
    .new-value { color: #18181b; font-weight: 600; }
    .footer { margin-top: 40px; text-align: center; color: #737373; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Ease</div>
    </div>

    <p>Hei ${participantName || ''},</p>

    <p>Tidspunktet for <strong>${courseName}</strong> er endret.</p>

    <div class="info-box">
      <p class="change-row"><span class="label">Dato:</span> <span class="old-value">${oldDate}</span> → <span class="new-value">${newDate}</span></p>
      <p class="change-row"><span class="label">Tidspunkt:</span> <span class="old-value">${oldTime}</span> → <span class="new-value">${newTime}</span></p>
    </div>

    <p>Ta kontakt med oss hvis du ikke kan møte på det nye tidspunktet.</p>

    <div class="footer">
      <p>Hilsen,<br>${organizationName || 'Ease'}</p>
    </div>
  </div>
</body>
</html>`,
    text: `Hei ${participantName || ''}, tidspunktet for ${data.courseName} er endret fra ${data.oldDate} ${data.oldTime} til ${data.newDate} ${data.newTime}. Ta kontakt med oss hvis du ikke kan møte.\n\nHilsen,\n${data.organizationName || 'Ease'}`
  }
}

function getTeacherBroadcastTemplate(data: Record<string, string>): { subject: string; html: string; text: string } {
  const courseName = escapeHtml(data.courseName)
  const organizationName = escapeHtml(data.organizationName)
  // Preserve newlines in the user-typed message by escaping HTML first, then
  // converting \n → <br>. escapeHtml ensures no raw tags get through.
  const escapedBody = escapeHtml(data.message).replace(/\n/g, '<br>')

  return {
    subject: `Melding fra ${organizationName}: ${courseName}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #18181b; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { font-size: 24px; font-weight: 600; color: #1a1a1a; }
    .message-box { background: #f5f5f5; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .footer { margin-top: 40px; text-align: center; color: #737373; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Ease</div>
    </div>
    <p>Hei,</p>
    <p>Du har mottatt en melding om <strong>${courseName}</strong>:</p>
    <div class="message-box">
      <p>${escapedBody}</p>
    </div>
    <div class="footer">
      <p>Hilsen,<br>${organizationName}</p>
    </div>
  </div>
</body>
</html>`,
    text: `Hei,\n\nDu har mottatt en melding om ${data.courseName}:\n\n${data.message}\n\nHilsen,\n${data.organizationName}`
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

    <p>Påmeldingen til <strong>${courseName}</strong> ble ikke fullført.</p>

    <p>${reason}</p>

    <div class="info-box">
      <p><strong>Du er ikke belastet.</strong></p>
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

    <p>Din påmelding til <strong>${courseName}</strong> er bekreftet.</p>

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
      <p>Vi gleder oss til å se deg.</p>
      <p>Hilsen,<br>${organizationName || 'Ease'}</p>
    </div>
  </div>
</body>
</html>
    `,
    text: `
Hei,

Din påmelding til ${courseName} er bekreftet.

Kurs: ${courseName}
${courseDate ? `Dato: ${courseDate}` : ''}
${courseTime ? `Tid: ${courseTime}` : ''}
${location ? `Sted: ${location}` : ''}

Vi gleder oss til å se deg.

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

    <p><strong>${courseName}</strong> starter snart.</p>

    <div class="details-box">
      <div class="detail-row"><span class="detail-label">Kurs:</span> <span>${courseName}</span></div>
      ${courseDate ? `<div class="detail-row"><span class="detail-label">Dato:</span> <span>${courseDate}</span></div>` : ''}
      ${courseTime ? `<div class="detail-row"><span class="detail-label">Tid:</span> <span>${courseTime}</span></div>` : ''}
      ${location ? `<div class="detail-row"><span class="detail-label">Sted:</span> <span>${location}</span></div>` : ''}
    </div>

    <p>Vi gleder oss til å se deg.</p>

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

Vi gleder oss til å se deg.

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
  const refundAmount = Number(data.refundAmount) || 0
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
      <p><strong>${courseName}</strong> er dessverre avlyst.</p>
      ${reason ? `<p><em>Årsak: ${reason}</em></p>` : ''}
    </div>

    ${showRefund && refundAmount ? `
    <div class="refund-box">
      <p class="refund-title">Refusjon</p>
      <p>${formatKr(refundAmount)} refunderes til betalingskortet ditt innen 5–10 virkedager.</p>
    </div>
    ` : ''}

    <p>Ta kontakt med oss hvis du har spørsmål.</p>

    <div class="footer">
      <p>Hilsen,<br>${organizationName || 'Ease'}</p>
    </div>
  </div>
</body>
</html>
    `,
    text: `Hei ${participantName || ''}, ${courseName} er dessverre avlyst.${showRefund && refundAmount ? ` ${formatKr(refundAmount)} refunderes til betalingskortet ditt innen 5–10 virkedager.` : ''}${reason ? ` Årsak: ${reason}` : ''} Har du spørsmål, ta kontakt med oss.`
  }
}

function getStudentCancellationTemplate(data: Record<string, string>): { subject: string; html: string; text: string } {
  const participantName = escapeHtml(data.participantName)
  const courseName = escapeHtml(data.courseName)
  const organizationName = escapeHtml(data.organizationName)
  const refundAmount = Number(data.refundAmount) || 0
  const refunded = data.refunded === 'true'

  return {
    subject: refunded ? 'Avbestilling bekreftet – Refusjon behandlet' : 'Avbestilling bekreftet',
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
    .details-box { background: #f9fafb; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .footer { margin-top: 40px; text-align: center; color: #9ca3af; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Ease</div>
    </div>

    ${refunded ? `
      <p style="text-align: center;">
        <span class="status-badge refunded">Refusjon behandlet</span>
      </p>
    ` : ''}

    <p>Hei ${participantName || ''},</p>

    <p>Avbestillingen fra <strong>${courseName || 'kurset'}</strong> er bekreftet.</p>

    ${refunded && refundAmount ? `
      <div class="details-box">
        <p><strong>Refusjon:</strong> ${formatKr(refundAmount)} refunderes til betalingskortet ditt innen 5\u201310 virkedager.</p>
      </div>
    ` : ''}

    <div class="footer">
      <p>Hilsen,<br>${organizationName || 'Ease'}</p>
    </div>
  </div>
</body>
</html>
    `,
    text: refunded
      ? `Hei ${participantName || ''}, avbestillingen fra ${courseName || 'kurset'} er bekreftet. ${formatKr(refundAmount || 0)} refunderes innen 5\u201310 virkedager.`
      : `Hei ${participantName || ''}, avbestillingen fra ${courseName || 'kurset'} er bekreftet.`
  }
}

function getTeacherCancellationTemplate(data: Record<string, string>): { subject: string; html: string; text: string } {
  const participantName = escapeHtml(data.participantName)
  const courseName = escapeHtml(data.courseName)
  const courseDate = escapeHtml(data.courseDate)
  const courseTime = escapeHtml(data.courseTime)
  const organizationName = escapeHtml(data.organizationName)
  const refundAmount = Number(data.refundAmount) || 0
  const refunded = data.refunded === 'true'

  return {
    subject: `Avbestilt: ${courseName}`,
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
      <span class="status-badge cancelled">Påmelding avbestilt</span>
    </p>

    <p>Hei ${participantName || ''},</p>

    <p>Din påmelding til <strong>${courseName}</strong> har blitt avbestilt av ${organizationName || 'studioet'}.</p>

    <div class="details-box">
      <p><strong>Kurs:</strong> ${courseName}</p>
      ${courseDate ? `<p><strong>Dato:</strong> ${courseDate}</p>` : ''}
      ${courseTime ? `<p><strong>Tid:</strong> ${courseTime}</p>` : ''}
    </div>

    ${refunded && refundAmount ? `
    <div class="info-box">
      <p><strong>Refusjon:</strong> ${formatKr(refundAmount)} refunderes til betalingskortet ditt innen 5\u201310 virkedager.</p>
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
      ? `Hei ${participantName || ''}, din påmelding til ${courseName} har blitt avbestilt av ${organizationName || 'studioet'}. ${formatKr(refundAmount || 0)} refunderes til betalingskortet ditt innen 5\u201310 virkedager.`
      : `Hei ${participantName || ''}, din påmelding til ${courseName} har blitt avbestilt av ${organizationName || 'studioet'}. Ta kontakt med oss hvis du har spørsmål.`
  }
}

function getPaymentLinkTemplate(data: Record<string, string>): { subject: string; html: string; text: string } {
  const participantName = escapeHtml(data.participantName)
  const courseName = escapeHtml(data.courseName)
  const courseDate = escapeHtml(data.courseDate)
  const courseTime = escapeHtml(data.courseTime)
  const totalPrice = Number(data.totalPrice) || 0
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

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

// Templates that authenticated users (not just service-role callers) may trigger.
// Every other template is server-initiated only (signup confirmation, refund, etc.)
// and would never legitimately be triggered by a client-side call.
const USER_TRIGGERABLE_TEMPLATES = new Set<string>(['teacher-broadcast', 'new-message'])

type Caller =
  | { kind: 'service-role' }
  | { kind: 'user'; userId: string }
  | { kind: 'unauthorized' }

async function verifyCaller(req: Request): Promise<Caller> {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) return { kind: 'unauthorized' }
  const token = authHeader.replace('Bearer ', '').trim()
  if (!token) return { kind: 'unauthorized' }

  // Service-role bypass: internal server-to-server calls.
  if (token === supabaseServiceKey) return { kind: 'service-role' }

  // Otherwise: resolve as a user JWT via Supabase Auth. A plain anon key returns
  // no user, so it falls through to unauthorized.
  try {
    const client = createClient(supabaseUrl, supabaseServiceKey)
    const { data, error } = await client.auth.getUser(token)
    if (error || !data.user) return { kind: 'unauthorized' }
    return { kind: 'user', userId: data.user.id }
  } catch {
    return { kind: 'unauthorized' }
  }
}

Deno.serve(async (req: Request) => {
  // Resolve CORS per-request so ALLOWED_ORIGIN whitelist + localhost dev
  // origins are both honoured. Used for preflight and every response below.
  const corsHeaders = getCorsHeaders(req.headers.get('origin'))

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const caller = await verifyCaller(req)
  if (caller.kind === 'unauthorized') {
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

    // Template is required — raw HTML path was removed to prevent arbitrary
    // HTML emails from being sent if the service-role key ever leaks. All
    // templates escape user input server-side.
    if (!body.template || !body.templateData) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: template, templateData' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Authenticated users can only trigger the user-facing templates; everything
    // else is server-initiated (signup confirmation, refund, cancellation, etc.).
    if (caller.kind === 'user' && !USER_TRIGGERABLE_TEMPLATES.has(body.template)) {
      return new Response(
        JSON.stringify({ error: `Users cannot trigger template: ${body.template}` }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    switch (body.template) {
      case 'new-message':
        emailContent = getNewMessageTemplate(body.templateData)
        break
      case 'teacher-broadcast':
        emailContent = getTeacherBroadcastTemplate(body.templateData)
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
      case 'course-schedule-change':
        emailContent = getCourseScheduleChangeTemplate(body.templateData)
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
