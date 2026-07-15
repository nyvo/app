import { describe, it, expect, vi, beforeEach } from 'vitest'

const getSession = vi.fn()
const getUser = vi.fn()
const signOut = vi.fn()
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => getSession(...args),
      getUser: (...args: unknown[]) => getUser(...args),
      signOut: (...args: unknown[]) => signOut(...args),
    },
  },
}))

import { recoverIfSessionDead } from './session-recovery'

describe('recoverIfSessionDead', () => {
  beforeEach(() => {
    getSession.mockReset()
    getUser.mockReset()
    signOut.mockReset()
    signOut.mockResolvedValue({ error: null })
  })

  it('no-ops for guests (no local session)', async () => {
    getSession.mockResolvedValue({ data: { session: null }, error: null })
    await recoverIfSessionDead()
    expect(getUser).not.toHaveBeenCalled()
    expect(signOut).not.toHaveBeenCalled()
  })

  it('keeps a session that getUser confirms alive', async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 't' } }, error: null })
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    await recoverIfSessionDead()
    expect(signOut).not.toHaveBeenCalled()
  })

  it('keeps the session on a transient getUser failure (flaky network)', async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 't' } }, error: null })
    getUser.mockResolvedValue({
      data: { user: null },
      error: { name: 'AuthRetryableFetchError', status: 0 },
    })
    await recoverIfSessionDead()
    expect(signOut).not.toHaveBeenCalled()
  })

  it('clears a definitively dead session locally (revoked elsewhere)', async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 't' } }, error: null })
    getUser.mockResolvedValue({
      data: { user: null },
      error: { name: 'AuthApiError', status: 403, code: 'session_not_found' },
    })
    await recoverIfSessionDead()
    // Local scope only: recovery must never revoke sessions in other tabs.
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' })
  })

  it('never throws back into the error path', async () => {
    getSession.mockRejectedValue(new Error('boom'))
    await expect(recoverIfSessionDead()).resolves.toBeUndefined()
    expect(signOut).not.toHaveBeenCalled()
  })
})
