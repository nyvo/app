import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import OnboardingPage from './OnboardingPage'

// useAuth drives every branch of the onboarding page.
const mockUseAuth = vi.fn()
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

// BuyerSetup awaits the email claim + prefill fetch before mounting its form;
// stub both so the buyer branch resolves instantly with no claimed signup.
vi.mock('@/services/signups', () => ({
  claimMySignups: vi.fn(async () => ({ count: 0, error: null })),
  fetchLatestClaimedContact: vi.fn(async () => ({ data: null, error: null })),
}))

const user = { id: 'u1' }

function authState(overrides: Record<string, unknown>) {
  return {
    user,
    isInitialized: true,
    isLoading: false,
    signOut: vi.fn(),
    setRole: vi.fn(async () => ({ error: null })),
    completeBuyerOnboarding: vi.fn(async () => ({ error: null })),
    ensureSeller: vi.fn(async () => ({ seller: null, error: null })),
    markOnboardingComplete: vi.fn(async () => ({ error: null })),
    ...overrides,
  }
}

function renderOnboarding(url: string, state: ReturnType<typeof authState>) {
  mockUseAuth.mockReturnValue(state)
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/overview" element={<div>overview page</div>} />
        <Route path="/join/abc" element={<div>join page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('OnboardingPage intent handling', () => {
  beforeEach(() => {
    mockUseAuth.mockReset()
  })

  it('shows the role chooser for context-free visits (no intent)', () => {
    renderOnboarding(
      '/onboarding',
      authState({
        profile: { role: null, onboarding_completed_at: null, name: null, email: 'a@b.no', phone: null },
      }),
    )
    expect(screen.getByText('Velg kontotype')).toBeInTheDocument()
  })

  it('pre-sets the role from intent and skips the chooser', async () => {
    const setRole = vi.fn(async () => ({ error: null }))
    renderOnboarding(
      '/onboarding?intent=seller',
      authState({
        setRole,
        profile: { role: null, onboarding_completed_at: null, name: null, email: 'a@b.no', phone: null },
      }),
    )
    // Chooser must not flash while the intent write is in flight.
    expect(screen.queryByText('Velg kontotype')).not.toBeInTheDocument()
    await waitFor(() => expect(setRole).toHaveBeenCalledWith('seller'))
    expect(setRole).toHaveBeenCalledTimes(1)
  })

  // The key invariant: intent never overrides a role chosen in an earlier
  // session — a buyer following a seller-intent link stays a buyer.
  it('does not override an existing role on conflicting intent', async () => {
    const setRole = vi.fn(async () => ({ error: null }))
    renderOnboarding(
      '/onboarding?intent=seller',
      authState({
        setRole,
        profile: { role: 'buyer', onboarding_completed_at: null, name: 'Kari', email: 'a@b.no', phone: null },
      }),
    )
    // Buyer setup renders; setRole is never called.
    await waitFor(() => expect(screen.getByText('Litt om deg')).toBeInTheDocument())
    expect(setRole).not.toHaveBeenCalled()
  })

  it('redirects already-onboarded users to next instead of onboarding', () => {
    renderOnboarding(
      '/onboarding?intent=seller&next=%2Fjoin%2Fabc',
      authState({
        profile: { role: 'seller', onboarding_completed_at: '2026-01-01T00:00:00Z', name: 'Kari', email: 'a@b.no', phone: null },
      }),
    )
    expect(screen.getByText('join page')).toBeInTheDocument()
  })
})
