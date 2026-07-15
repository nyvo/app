// send-email — single dispatcher for all transactional emails.
//
// Service-role only: invoked from other Edge Functions (stripe-connect-webhook,
// sweep-pending-payments, cron jobs).
// The frontend never calls this directly — user-triggered emails route
// through their own purpose-built Edge Function which validates the
// caller's authority, then forwards to this dispatcher via the
// _shared/email.ts helper.
//
// Templates live in ./templates/ as React Email TSX components. Add a new
// template by: (1) creating the .tsx file, (2) adding the case below,
// (3) extending the type in _shared/email.ts.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { Resend } from 'resend'
import { render } from '@react-email/render'
import { handleCors, errorResponse, successResponse } from '../_shared/auth.ts'
import OrderConfirm, { type OrderConfirmProps } from './templates/order-confirm.tsx'
import RefundReceipt, { type RefundReceiptProps } from './templates/refund-receipt.tsx'
import ClassReminder, { type ClassReminderProps } from './templates/class-reminder.tsx'
import SupportMessage, { type SupportMessageProps } from './templates/support-message.tsx'
import SessionRescheduled, { type SessionRescheduledProps } from './templates/session-rescheduled.tsx'
import CourseMessage, { type CourseMessageProps } from './templates/course-message.tsx'
import BookingNotification, { type BookingNotificationProps } from './templates/booking-notification.tsx'
import CourseCancelled, { type CourseCancelledProps } from './templates/course-cancelled.tsx'
import SignupCancelled, { type SignupCancelledProps } from './templates/signup-cancelled.tsx'

const resendApiKey = Deno.env.get('RESEND_API_KEY') || ''
const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || ''
const fromName = Deno.env.get('RESEND_FROM_NAME') || 'Openspot'
const fromAddress = fromEmail ? `${fromName} <${fromEmail}>` : ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

type EmailTemplate =
  | 'order-confirm'
  | 'refund-receipt'
  | 'class-reminder'
  | 'support-message'
  | 'session-rescheduled'
  | 'course-message'
  | 'booking-notification'
  | 'course-cancelled'
  | 'signup-cancelled'

interface SendEmailRequest {
  template: EmailTemplate
  to: string
  props:
    | OrderConfirmProps
    | RefundReceiptProps
    | ClassReminderProps
    | SupportMessageProps
    | SessionRescheduledProps
    | CourseMessageProps
    | BookingNotificationProps
    | CourseCancelledProps
    | SignupCancelledProps
  /** Optional override for the auto-generated subject line */
  subject?: string
  /** Optional reply-to address passed through to Resend. */
  replyTo?: string
}

function defaultSubject(template: EmailTemplate, props: SendEmailRequest['props']): string {
  switch (template) {
    case 'order-confirm':
      return `Påmelding bekreftet — ${(props as OrderConfirmProps).courseTitle}`
    case 'refund-receipt':
      return `Refusjon bekreftet — ${(props as RefundReceiptProps).amount}`
    case 'class-reminder':
      return `Påminnelse: ${(props as ClassReminderProps).courseTitle}`
    case 'support-message':
      return `Hjelp: ${(props as SupportMessageProps).supportSubject}`
    case 'session-rescheduled': {
      const p = props as SessionRescheduledProps
      return `Ny tid: ${p.courseTitle} — ${p.newDate}`
    }
    case 'course-message':
      return (props as CourseMessageProps).subject
    case 'booking-notification':
      return `Ny påmelding — ${(props as BookingNotificationProps).courseTitle}`
    case 'course-cancelled':
      return `Avlyst: ${(props as CourseCancelledProps).courseTitle}`
    case 'signup-cancelled':
      return `Avmeldt: ${(props as SignupCancelledProps).courseTitle}`
  }
}

function renderTemplate(template: EmailTemplate, props: SendEmailRequest['props']) {
  switch (template) {
    case 'order-confirm':
      return OrderConfirm(props as OrderConfirmProps)
    case 'refund-receipt':
      return RefundReceipt(props as RefundReceiptProps)
    case 'class-reminder':
      return ClassReminder(props as ClassReminderProps)
    case 'support-message':
      return SupportMessage(props as SupportMessageProps)
    case 'session-rescheduled':
      return SessionRescheduled(props as SessionRescheduledProps)
    case 'course-message':
      return CourseMessage(props as CourseMessageProps)
    case 'booking-notification':
      return BookingNotification(props as BookingNotificationProps)
    case 'course-cancelled':
      return CourseCancelled(props as CourseCancelledProps)
    case 'signup-cancelled':
      return SignupCancelled(props as SignupCancelledProps)
  }
}

Deno.serve(async (req: Request) => {
  const cors = handleCors(req)
  if (cors) return cors

  // Service-role only — system emails, never client-callable.
  const auth = req.headers.get('authorization')
  if (!serviceRoleKey || auth !== `Bearer ${serviceRoleKey}`) {
    return errorResponse('Unauthorized', 401, req)
  }

  if (!resendApiKey) {
    return errorResponse('RESEND_API_KEY not configured', 500, req)
  }

  if (!fromAddress) {
    return errorResponse('RESEND_FROM_EMAIL not configured', 500, req)
  }

  let body: SendEmailRequest
  try {
    body = await req.json()
  } catch {
    return errorResponse('Invalid JSON', 400, req)
  }

  const { template, to, props, subject, replyTo } = body

  if (!template || !to || !props) {
    return errorResponse('Missing required fields: template, to, props', 400, req)
  }

  if (!['order-confirm', 'refund-receipt', 'class-reminder', 'support-message', 'session-rescheduled', 'course-message', 'booking-notification', 'course-cancelled', 'signup-cancelled'].includes(template)) {
    return errorResponse(`Unknown template: ${template}`, 400, req)
  }

  try {
    const element = renderTemplate(template, props)
    const html = await render(element)
    const text = await render(element, { plainText: true })

    const resend = new Resend(resendApiKey)
    const normalizedReplyTo = replyTo?.trim() || undefined
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to,
      subject: subject || defaultSubject(template, props),
      html,
      text,
      replyTo: normalizedReplyTo,
    })

    if (error) {
      console.error('[send-email] resend error', { template, error: error.message })
      return errorResponse(`Resend error: ${error.message}`, 502, req)
    }

    return successResponse({ id: data?.id }, 200, req)
  } catch (err) {
    // Catch render-pipeline / Resend SDK throws so they don't surface as a
    // generic Deno 500 with an empty body — callers (including the sweep)
    // log this verbatim and retry.
    const message = err instanceof Error ? err.message : String(err)
    console.error('[send-email] unhandled', { template, message })
    return errorResponse(`Render or send failed: ${message}`, 500, req)
  }
})
