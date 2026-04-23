import {
  embed,
  redirect as dinteroRedirect,
  type DinteroCheckoutInstance,
} from '@dintero/checkout-web-sdk'
import { logger } from '@/lib/logger'

export type { DinteroCheckoutInstance }

export interface CreateSessionResponse {
  sid: string
  url: string
  merchantReference: string
}

interface EmbedOptions {
  container: HTMLDivElement
  sid: string
  onPaymentAuthorized: (transactionId: string) => void
  onPaymentError: (message: string) => void
  onSessionCancel: () => void
  language?: string
}

export async function embedDinteroCheckout(options: EmbedOptions): Promise<DinteroCheckoutInstance> {
  return embed({
    container: options.container,
    sid: options.sid,
    language: options.language ?? 'no',
    onPayment: (event) => {
      options.onPaymentAuthorized(event.transaction_id)
    },
    onPaymentError: (event) => {
      const message = event.error || 'Betalingen feilet. Prøv igjen.'
      logger.warn('Dintero payment error', { type: event.type, message })
      options.onPaymentError(message)
    },
    onSessionCancel: () => {
      options.onSessionCancel()
    },
  })
}

export function redirectToDinteroCheckout(sid: string): void {
  dinteroRedirect({ sid })
}
