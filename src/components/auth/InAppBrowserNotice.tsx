import { cn } from '@/lib/utils'
import {
  androidBrowserEscapeUrl,
  isAndroid,
  isMetaInAppBrowser,
  metaAppLabel,
} from '@/lib/in-app-browser'

/**
 * Quiet info note shown only inside Meta webviews (Facebook/Messenger/
 * Instagram), on auth + onboarding surfaces. Those webviews reload the SPA
 * mid-flow and Google OAuth is hard-blocked in them, so we nudge the user out.
 * One plain statement — no how-to instructions (ratified 2026-07-21). Android
 * additionally gets a working escape link (`intent:` reopens the page in the
 * real browser); iOS has no sanctioned escape, so statement only.
 * Renders nothing everywhere else.
 */
export function InAppBrowserNotice({ className }: { className?: string }) {
  if (!isMetaInAppBrowser()) return null
  const escapeUrl = isAndroid() ? androidBrowserEscapeUrl() : null

  return (
    <div className={cn('rounded-xl bg-info-subtle px-3.5 py-2.5 text-sm leading-relaxed text-info', className)}>
      Siden virker best utenfor {metaAppLabel()}.
      {escapeUrl && (
        <>
          {' '}
          <a href={escapeUrl} className="font-medium underline underline-offset-2">
            Åpne i nettleser
          </a>
        </>
      )}
    </div>
  )
}
