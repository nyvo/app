import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { isValidEmail } from '@/lib/utils'

interface SendEmailResult {
  success: boolean
  messageId?: string
  error?: string
}

// Send a broadcast from a teacher to course participants (e.g. announcements,
// schedule changes). Uses the server-side teacher-broadcast template so the
// message body is escaped on the edge function — no raw HTML from the client.
export async function sendTeacherBroadcast(
  to: string,
  data: {
    courseId: string
    courseName: string
    message: string
    organizationName: string
  },
): Promise<SendEmailResult> {
  if (!isValidEmail(to)) {
    return { success: false, error: `Ugyldig e-postadresse: ${to}` }
  }

  try {
    const { data: resp, error } = await supabase.functions.invoke('send-email', {
      body: {
        to,
        template: 'teacher-broadcast',
        templateData: data,
      },
    })

    if (error) {
      logger.error('Teacher broadcast error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, messageId: resp?.messageId }
  } catch (err) {
    logger.error('Teacher broadcast exception:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Ukjent feil' }
  }
}

// Send a new message notification to a recipient
export async function sendNewMessageNotification(
  recipientEmail: string,
  senderName: string,
  messagePreview: string,
  conversationUrl: string,
  conversationId: string,
  organizationName?: string,
  replyTo?: string
): Promise<SendEmailResult> {
  if (!isValidEmail(recipientEmail)) {
    return { success: false, error: `Ugyldig e-postadresse: ${recipientEmail}` }
  }

  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        to: recipientEmail,
        template: 'new-message',
        templateData: {
          conversationId,
          senderName,
          messagePreview: messagePreview.slice(0, 150), // Limit preview length
          conversationUrl,
          organizationName: organizationName || 'Ease',
        },
        replyTo,
      },
    })

    if (error) {
      logger.error('New message notification error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, messageId: data?.messageId }
  } catch (err) {
    logger.error('New message notification exception:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Ukjent feil' }
  }
}

