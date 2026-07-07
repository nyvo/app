import { describe, it, expect } from 'vitest'
import { withTimeout } from './with-timeout'

describe('withTimeout', () => {
  it('resolves with the promise value when it settles before the timeout', async () => {
    await expect(withTimeout(Promise.resolve('ok'), 50, 'Tidsavbrudd')).resolves.toBe('ok')
  })

  it('rejects with the original error when the promise rejects before the timeout', async () => {
    const rejected = Promise.reject(new Error('boom'))
    await expect(withTimeout(rejected, 50, 'Tidsavbrudd')).rejects.toThrow('boom')
  })

  it('rejects with the timeout message when the promise never settles in time', async () => {
    const never = new Promise(() => {})
    await expect(withTimeout(never, 10, 'Tidsavbrudd')).rejects.toThrow('Tidsavbrudd')
  })
})
