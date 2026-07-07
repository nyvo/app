import { describe, it, expect } from 'vitest'
import { queryClient } from './query-client'

// react-query normalizes a boolean/number `retry` option into a function
// internally, so pull the effective function back out to test the policy
// directly rather than re-implementing react-query's retry loop here.
function retryFn(failureCount: number, error: unknown): boolean {
  const retry = queryClient.getDefaultOptions().queries?.retry
  if (typeof retry !== 'function') throw new Error('retry is not a function')
  return retry(failureCount, error as Error) as boolean
}

describe('queryClient retry policy', () => {
  it('does not retry a 404 (status on the error)', () => {
    expect(retryFn(0, { status: 404 })).toBe(false)
  })

  it('does not retry a 400 (status nested under error.context)', () => {
    expect(retryFn(0, { context: { status: 400 } })).toBe(false)
  })

  it('does not retry a 499', () => {
    expect(retryFn(0, { status: 499 })).toBe(false)
  })

  it('retries a 500 once', () => {
    expect(retryFn(0, { status: 500 })).toBe(true)
    expect(retryFn(1, { status: 500 })).toBe(false)
  })

  it('retries a network error (no status) once', () => {
    expect(retryFn(0, new Error('network down'))).toBe(true)
    expect(retryFn(1, new Error('network down'))).toBe(false)
  })
})
