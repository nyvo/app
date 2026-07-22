import { Suspense } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'

// useAuth is the only dependency that decides this guard's behavior.
const mockUseAuth = vi.fn()
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

type AuthState = {
  isInitialized: boolean
  isLoading: boolean
  user: { id: string } | null
  profile: { onboarding_completed_at: string | null } | null
  initPromise?: Promise<void>
}

function renderGuarded(state: AuthState) {
  // The real initPromise settles when auth boot finishes; before init the
  // guard suspends on it, so tests default to a promise that never settles.
  mockUseAuth.mockReturnValue({ initPromise: new Promise<void>(() => {}), ...state })
  return render(
    <MemoryRouter initialEntries={['/protected']}>
      {/* Mirrors the RootChrome boundary the guard suspends into. */}
      <Suspense fallback={<div>route fallback</div>}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                <div>protected content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/auth" element={<div>auth page</div>} />
          <Route path="/onboarding" element={<div>onboarding page</div>} />
        </Routes>
      </Suspense>
    </MemoryRouter>,
  )
}

const user = { id: 'u1' }
const onboardedProfile = { onboarding_completed_at: '2026-01-01T00:00:00Z' }

describe('ProtectedRoute', () => {
  beforeEach(() => {
    mockUseAuth.mockReset()
  })

  // The regression: a background refresh flips isLoading=true after init.
  // The old guard returned null on isLoading, unmounting the whole shell
  // (sidebar + page) and dropping any click in flight. It must keep
  // rendering children instead.
  it('keeps rendering children while loading once initialized', () => {
    renderGuarded({ isInitialized: true, isLoading: true, user, profile: onboardedProfile })
    expect(screen.getByText('protected content')).toBeInTheDocument()
  })

  it('renders children for an initialized, authenticated, onboarded user', () => {
    renderGuarded({ isInitialized: true, isLoading: false, user, profile: onboardedProfile })
    expect(screen.getByText('protected content')).toBeInTheDocument()
  })

  // Before init the guard suspends on initPromise so the route-level loader
  // stays up (one continuous indicator across chunk + auth phases, #249).
  it('suspends into the route boundary before auth is initialized', () => {
    renderGuarded({ isInitialized: false, isLoading: true, user: null, profile: null })
    expect(screen.getByText('route fallback')).toBeInTheDocument()
    expect(screen.queryByText('protected content')).not.toBeInTheDocument()
    expect(screen.queryByText('auth page')).not.toBeInTheDocument()
    expect(screen.queryByText('onboarding page')).not.toBeInTheDocument()
  })

  // Authenticated, mid background refresh (isLoading): profile null is
  // transient — hold rather than route on a missing onboarding flag.
  it('holds when authenticated but profile is loading (background refresh)', () => {
    renderGuarded({ isInitialized: true, isLoading: true, user, profile: null })
    expect(screen.queryByText('protected content')).not.toBeInTheDocument()
    expect(screen.queryByText('onboarding page')).not.toBeInTheDocument()
    expect(screen.queryByText('auth page')).not.toBeInTheDocument()
    expect(screen.queryByText('Noe gikk galt')).not.toBeInTheDocument()
  })

  // Settled (not loading) with a still-missing profile means the profile fetch
  // genuinely failed — surface a retry instead of a permanent white screen.
  it('shows the server-error state when settled with no profile', () => {
    renderGuarded({ isInitialized: true, isLoading: false, user, profile: null })
    expect(screen.getByText('Noe gikk galt')).toBeInTheDocument()
    expect(screen.queryByText('protected content')).not.toBeInTheDocument()
    expect(screen.queryByText('auth page')).not.toBeInTheDocument()
  })

  it('redirects to /auth when initialized with no user', () => {
    renderGuarded({ isInitialized: true, isLoading: false, user: null, profile: null })
    expect(screen.getByText('auth page')).toBeInTheDocument()
    expect(screen.queryByText('protected content')).not.toBeInTheDocument()
  })

  it('redirects to /onboarding when the profile has not completed onboarding', () => {
    renderGuarded({
      isInitialized: true,
      isLoading: false,
      user,
      profile: { onboarding_completed_at: null },
    })
    expect(screen.getByText('onboarding page')).toBeInTheDocument()
    expect(screen.queryByText('protected content')).not.toBeInTheDocument()
  })

  // Deep-link preservation: the guarded target rides along as ?next= so
  // onboarding can return the user there on completion.
  it('carries the deep-link target as ?next= on the onboarding redirect', () => {
    function OnboardingProbe() {
      const location = useLocation()
      return <div>onboarding search: {location.search}</div>
    }
    mockUseAuth.mockReturnValue({
      isInitialized: true,
      isLoading: false,
      user,
      profile: { onboarding_completed_at: null },
    })
    render(
      <MemoryRouter initialEntries={['/protected?tab=2']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                <div>protected content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/onboarding" element={<OnboardingProbe />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(
      screen.getByText(`onboarding search: ?next=${encodeURIComponent('/protected?tab=2')}`),
    ).toBeInTheDocument()
  })
})
