import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { Seller } from '@/types/database'
import { AccountStatusBanner } from './AccountStatusBanner'

// Mutable auth value the mocked useAuth reads — set per case via renderBanner().
let mockSeller: Partial<Seller> | null = null
let mockHydrateFailed = false

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    currentSeller: mockSeller as Seller | null,
    currentSellerHydrateFailed: mockHydrateFailed,
  }),
}))

function renderBanner(
  seller: Partial<Seller> | null,
  opts: { hydrateFailed?: boolean; path?: string } = {},
) {
  mockSeller = seller
  mockHydrateFailed = opts.hydrateFailed ?? false
  return render(
    <MemoryRouter initialEntries={[opts.path ?? '/overview']}>
      <AccountStatusBanner />
    </MemoryRouter>,
  )
}

// Only the fields the banner reads matter; cast the rest away.
function seller(overrides: Partial<Seller>): Partial<Seller> {
  return {
    stripe_account_id: 'acct_test',
    stripe_account_status: 'enabled',
    stripe_onboarding_complete: true,
    stripe_payouts_enabled: true,
    stripe_requirements_due: false,
    ...overrides,
  }
}

const ALERT = () => screen.queryByRole('alert')

describe('AccountStatusBanner — requirements-aware gating', () => {
  it('healthy live account → hidden', () => {
    renderBanner(seller({}))
    expect(ALERT()).toBeNull()
  })

  it('restricted WITH requirements due → shows warning', () => {
    renderBanner(seller({ stripe_account_status: 'restricted', stripe_onboarding_complete: false, stripe_requirements_due: true }))
    expect(screen.getByText('Betalinger er ikke aktive')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Se status' })).toBeInTheDocument()
  })

  it('restricted WITHOUT requirements (Stripe verifying) → hidden [false-alarm fix]', () => {
    renderBanner(seller({ stripe_account_status: 'restricted', stripe_onboarding_complete: false, stripe_requirements_due: false }))
    expect(ALERT()).toBeNull()
  })

  it('rejected → shows danger regardless of requirements', () => {
    renderBanner(seller({ stripe_account_status: 'rejected', stripe_onboarding_complete: false, stripe_payouts_enabled: false, stripe_requirements_due: false }))
    expect(screen.getByText('Kontoen ble avvist')).toBeInTheDocument()
  })

  it('payouts paused (charges on, payouts off) WITH requirements → shows warning', () => {
    renderBanner(seller({ stripe_account_status: 'enabled', stripe_payouts_enabled: false, stripe_requirements_due: true }))
    expect(screen.getByText('Utbetalinger er satt på pause')).toBeInTheDocument()
  })

  it('payouts off WITHOUT requirements (verifying payouts) → hidden [false-alarm fix]', () => {
    renderBanner(seller({ stripe_account_status: 'enabled', stripe_payouts_enabled: false, stripe_requirements_due: false }))
    expect(ALERT()).toBeNull()
  })

  it('hydrate failed (unknown state) → hidden', () => {
    renderBanner(seller({ stripe_account_status: 'restricted', stripe_requirements_due: true }), { hydrateFailed: true })
    expect(ALERT()).toBeNull()
  })

  it('no connected account yet → hidden (get-started case, not a restriction)', () => {
    renderBanner(seller({ stripe_account_id: null, stripe_account_status: null, stripe_onboarding_complete: false, stripe_payouts_enabled: false, stripe_requirements_due: true }))
    expect(ALERT()).toBeNull()
  })

  it('suppressed on the payouts page itself even when action is needed', () => {
    renderBanner(seller({ stripe_account_status: 'restricted', stripe_onboarding_complete: false, stripe_requirements_due: true }), { path: '/settings/payouts' })
    expect(ALERT()).toBeNull()
  })
})
