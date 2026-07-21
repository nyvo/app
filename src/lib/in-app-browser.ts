/**
 * Meta in-app browser (webview) handling.
 *
 * Links shared on Facebook/Messenger/Instagram open in Meta's embedded
 * webview, which reloads the page on app switch/rotation (losing SPA state
 * mid-flow) and is blocked outright by Google OAuth (403 disallowed_useragent).
 * Detection is deliberately narrow — FBAN/FBAV (Facebook/Messenger) and
 * Instagram UA tokens only. Generic webview heuristics false-positive on real
 * browsers, and these two families are where our marketing traffic comes from.
 */

const META_WEBVIEW_RE = /FBAN|FBAV|Instagram/

export function isMetaInAppBrowser(ua: string = navigator.userAgent): boolean {
  return META_WEBVIEW_RE.test(ua)
}

/** Which Meta app owns the webview — for user-facing copy. */
export function metaBrowserLabel(ua: string = navigator.userAgent): string {
  return ua.includes('Instagram') ? 'Instagram-nettleseren' : 'Facebook-nettleseren'
}

export function isAndroid(ua: string = navigator.userAgent): boolean {
  return /Android/.test(ua)
}

/**
 * Android `intent:` URL that reopens the given page in the device's default
 * browser — the documented escape from Meta webviews (see shalanah/inapp-debugger).
 * iOS has no Apple-approved equivalent (x-safari-https:// is unreliable in
 * Meta's webview), so callers fall back to instructional copy there.
 * Returns null for non-http(s) or unparseable URLs.
 */
export function androidBrowserEscapeUrl(href: string = window.location.href): string | null {
  let url: URL
  try {
    url = new URL(href)
  } catch {
    return null
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
  const scheme = url.protocol.slice(0, -1)
  return `intent://${url.host}${url.pathname}${url.search}#Intent;scheme=${scheme};end`
}
