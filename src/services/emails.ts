import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { isValidEmail } from '@/lib/utils'

interface SendEmailResult {
  success: boolean
  messageId?: string
  error?: string
}

// Send a raw email (for custom content)
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  options?: {
    text?: string
    replyTo?: string
  }
): Promise<SendEmailResult> {
  if (!isValidEmail(to)) {
    return { success: false, error: `Ugyldig e-postadresse: ${to}` }
  }

  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        to,
        subject,
        html,
        text: options?.text,
        replyTo: options?.replyTo,
      },
    })

    if (error) {
      logger.error('Email send error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, messageId: data?.messageId }
  } catch (err) {
    logger.error('Email send exception:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Ukjent feil' }
  }
}

// Send a new message notification to a recipient
export async function sendNewMessageNotification(
  recipientEmail: string,
  senderName: string,
  messagePreview: string,
  conversationUrl: string,
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

