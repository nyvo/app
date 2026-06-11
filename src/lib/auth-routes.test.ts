import { describe, it, expect } from 'vitest'
import {
  AUTH_ROUTES,
  parseAuthIntent,
  resolvePostAuthDestination,
  sanitizeNextPath,
} from './auth-routes'

describe('parseAuthIntent', () => {
  it('accepts the two valid intents', () => {
    expect(parseAuthIntent('buyer')).toBe('buyer')
    expect(parseAuthIntent('seller')).toBe('seller')
  })

  it('rejects everything else', () => {
    expect(parseAuthIntent(null)).toBeNull()
    expect(parseAuthIntent(undefined)).toBeNull()
    expect(parseAuthIntent('')).toBeNull()
    expect(parseAuthIntent('admin')).toBeNull()
    expect(parseAuthIntent('SELLER')).toBeNull()
  })
})

describe('sanitizeNextPath', () => {
  it('accepts same-origin absolute paths', () => {
    expect(sanitizeNextPath('/join/abc123')).toBe('/join/abc123')
    expect(sanitizeNextPath('/studio#samarbeid')).toBe('/studio#samarbeid')
  })

  it('rejects external and malformed targets', () => {
    expect(sanitizeNextPath(null)).toBeNull()
    expect(sanitizeNextPath('')).toBeNull()
    expect(sanitizeNextPath('https://evil.com')).toBeNull()
    expect(sanitizeNextPath('//evil.com')).toBeNull()
    expect(sanitizeNextPath('overview')).toBeNull()
  })
})

describe('resolvePostAuthDestination', () => {
  const pending = { onboarding_completed_at: null }
  const done = { onboarding_completed_at: '2026-01-01T00:00:00Z' }

  it('routes onboarded users to the fallback', () => {
    expect(resolvePostAuthDestination(done)).toBe(AUTH_ROUTES.dashboard)
    expect(resolvePostAuthDestination(done, '/join/abc')).toBe('/join/abc')
  })

  it('routes pending users to bare /onboarding with no context', () => {
    expect(resolvePostAuthDestination(pending)).toBe(AUTH_ROUTES.onboarding)
    expect(resolvePostAuthDestination(null)).toBe(AUTH_ROUTES.onboarding)
  })

  it('carries intent and a non-default next into the onboarding URL', () => {
    expect(resolvePostAuthDestination(pending, AUTH_ROUTES.dashboard, 'seller')).toBe(
      '/onboarding?intent=seller',
    )
    expect(resolvePostAuthDestination(pending, '/join/abc', 'seller')).toBe(
      '/onboarding?intent=seller&next=%2Fjoin%2Fabc',
    )
    expect(resolvePostAuthDestination(pending, '/join/abc')).toBe(
      '/onboarding?next=%2Fjoin%2Fabc',
    )
  })

  it('omits next when it is the default dashboard', () => {
    expect(resolvePostAuthDestination(pending, AUTH_ROUTES.dashboard)).toBe(
      AUTH_ROUTES.onboarding,
    )
  })
})
