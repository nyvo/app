import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
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

function AuthProbe() {
  const location = useLocation()
  return <div>auth page: {location.search}</div>
}

function renderOnboarding(url: string, state: ReturnType<typeof authState>) {
  mockUseAuth.mockReturnValue(state)
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/overview" element={<div>overview page</div>} />
        <Route path="/join/abc" element={<div>join page</div>} />
        <Route path="/auth" element={<AuthProbe />} />
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
    expect(screen.getByText('Hva skal du bruke kontoen til?')).toBeInTheDocument()
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
    expect(screen.queryByText('Hva skal du bruke kontoen til?')).not.toBeInTheDocument()
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
    await waitFor(() => expect(screen.getByText('Bekreft opplysningene dine')).toBeInTheDocument())
    expect(setRole).not.toHaveBeenCalled()
  })

  it('shows concise seller account differences', () => {
    renderOnboarding(
      '/onboarding',
      authState({
        sellers: [],
        profile: { role: 'seller', onboarding_completed_at: null, name: 'Kari', email: 'a@b.no', phone: null },
      }),
    )

    expect(screen.getByText('Du holder egne kurs og mottar betalingene selv.')).toBeInTheDocument()
    expect(screen.getByText('Yogalærere kan vise kurs på studiosiden. Alle betalinger går til studioet.')).toBeInTheDocument()
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

  // Logged-out visitors bounce to /auth with intent/next preserved so the
  // context survives the round trip (closes the seller-intent-loss item).
  it('forwards intent/next to /auth when logged out', () => {
    renderOnboarding(
      '/onboarding?intent=seller&next=%2Fjoin%2Fabc',
      authState({ user: null, profile: null }),
    )
    expect(
      screen.getByText(`auth page: ?intent=seller&next=${encodeURIComponent('/join/abc')}`),
    ).toBeInTheDocument()
  })

  // Authenticated + initialized but the profile never loaded (transient boot
  // failure) → a retry surface, not a permanent white screen.
  it('shows the server-error state when authenticated but profile is missing', () => {
    renderOnboarding('/onboarding', authState({ profile: null }))
    expect(screen.getByText('Noe gikk galt')).toBeInTheDocument()
  })
})
