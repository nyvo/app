import { describe, it, expect } from 'vitest'
import {
  androidBrowserEscapeUrl,
  isAndroid,
  isMetaInAppBrowser,
  metaBrowserLabel,
} from './in-app-browser'

// Real UA captured from a production session (Facebook app on iPad, 2026-07-21).
const FB_IOS_UA =
  'Mozilla/5.0 (iPad; CPU OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/570.0.0.20.108;FBBV/1017680599;FBDV/iPad8,1;FBMD/iPad;FBSN/iPadOS;FBSV/26.5.2;FBSS/2;FBCR/;FBID/tablet;FBLC/nb_NO;FBOP/80]'
const IG_ANDROID_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0.0.0 Mobile Safari/537.36 Instagram 340.0.0.22.109'
const SAFARI_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5.2 Safari/605.1.15'
const CHROME_ANDROID_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36'

describe('isMetaInAppBrowser', () => {
  it('detects the Facebook iOS webview', () => {
    expect(isMetaInAppBrowser(FB_IOS_UA)).toBe(true)
  })

  it('detects the Instagram Android webview', () => {
    expect(isMetaInAppBrowser(IG_ANDROID_UA)).toBe(true)
  })

  it('does not flag real browsers', () => {
    expect(isMetaInAppBrowser(SAFARI_UA)).toBe(false)
    expect(isMetaInAppBrowser(CHROME_ANDROID_UA)).toBe(false)
  })
})

describe('metaBrowserLabel', () => {
  it('names the owning app', () => {
    expect(metaBrowserLabel(FB_IOS_UA)).toBe('Facebook-nettleseren')
    expect(metaBrowserLabel(IG_ANDROID_UA)).toBe('Instagram-nettleseren')
  })
})

describe('isAndroid', () => {
  it('splits platforms', () => {
    expect(isAndroid(IG_ANDROID_UA)).toBe(true)
    expect(isAndroid(FB_IOS_UA)).toBe(false)
  })
})

describe('androidBrowserEscapeUrl', () => {
  it('builds an intent URL preserving host, path and query', () => {
    expect(androidBrowserEscapeUrl('https://www.upnext.no/auth?intent=seller')).toBe(
      'intent://www.upnext.no/auth?intent=seller#Intent;scheme=https;end',
    )
  })

  it('rejects non-http schemes and garbage', () => {
    expect(androidBrowserEscapeUrl('javascript:alert(1)')).toBeNull()
    expect(androidBrowserEscapeUrl('not a url')).toBeNull()
  })
})
