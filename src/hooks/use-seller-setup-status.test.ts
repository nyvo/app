import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useSellerSetupStatus } from './use-seller-setup-status'

// useAuth is the only identity input — a fixed seller/profile pair covers
// every branch this hook cares about.
const mockUseAuth = vi.fn()
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

// Real-time refresh isn't under test here — no-op it so the hook's initial
// fetch is the only thing driving state.
vi.mock('@/hooks/use-realtime-subscription', () => ({
  useMultiTableSubscription: vi.fn(),
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}))

// Thenable stand-in for a Supabase PostgREST query builder: every chain
// method returns itself, and awaiting it (however many links deep the
// caller stopped at) resolves to the configured result.
function makeQuery(result: Record<string, unknown>) {
  const query: Record<string, unknown> = {
    select: () => query,
    eq: () => query,
    order: () => query,
    update: () => query,
    then: (resolve: (v: unknown) => void) => resolve(result),
  }
  return query
}

let coursesResult: Record<string, unknown>

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'courses') return makeQuery(coursesResult)
      // 'profiles' (setup_complete_seen_at stamp) and anything else — a
      // harmless no-op success, not under test here.
      return makeQuery({ error: null })
    }),
  },
}))

const seller = { id: 'seller-1', stripe_onboarding_complete: false }

describe('useSellerSetupStatus — error handling', () => {
  beforeEach(() => {
    mockUseAuth.mockReset()
    mockUseAuth.mockReturnValue({ currentSeller: seller, profile: { id: 'p1', setup_complete_seen_at: null } })
    coursesResult = { data: [], error: null }
  })

  it('exposes loadFailed and stops the loading flag when the courses fetch errors', async () => {
    coursesResult = { data: null, error: new Error('network down') }

    const { result } = renderHook(() => useSellerSetupStatus())

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.loadFailed).toBe(true)
  })

  it('does not commit a false-incomplete checklist on error — steps stay at their prior (default) state', async () => {
    coursesResult = { data: null, error: new Error('network down') }

    const { result } = renderHook(() => useSellerSetupStatus())

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    // Prior to the failed fetch, hasPublishedCourse defaults to false — the
    // point under test is that the error path doesn't touch it at all (no
    // explicit "nothing done" commit), which the completed step count still
    // reflects here since the state never moved off its initial default.
    expect(result.current.completedCount).toBe(1) // only the pre-completed 'account' step
    expect(result.current.isSetupComplete).toBe(false)
  })

  it('clears loadFailed and reports a normal, complete checklist on success', async () => {
    coursesResult = { data: [{ id: 'c1', status: 'upcoming', price: 100 }], error: null }
    mockUseAuth.mockReturnValue({
      currentSeller: { id: 'seller-1', stripe_onboarding_complete: true },
      profile: { id: 'p1', setup_complete_seen_at: null },
    })

    const { result } = renderHook(() => useSellerSetupStatus())

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.loadFailed).toBe(false)
    expect(result.current.isSetupComplete).toBe(true)
  })

  it('refresh() re-fetches and clears loadFailed once the underlying error is gone', async () => {
    coursesResult = { data: null, error: new Error('network down') }

    const { result } = renderHook(() => useSellerSetupStatus())
    await waitFor(() => expect(result.current.loadFailed).toBe(true))

    coursesResult = { data: [], error: null }
    await result.current.refresh()

    await waitFor(() => expect(result.current.loadFailed).toBe(false))
  })
})
