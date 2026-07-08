import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ErrorBoundary } from './ErrorBoundary'

// Silence the expected React error logging that a caught throw produces.
vi.mock('@/lib/monitoring', () => ({ captureError: vi.fn() }))

function Boom({ crash }: { crash: boolean }) {
  if (crash) throw new Error('boom')
  return <div>recovered content</div>
}

describe('ErrorBoundary reset', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows the fallback after a child throws', () => {
    render(
      <MemoryRouter>
        <ErrorBoundary resetKeys={['/a']}>
          <Boom crash />
        </ErrorBoundary>
      </MemoryRouter>,
    )
    expect(screen.getByText('Noe gikk galt')).toBeInTheDocument()
  })

  it('clears the error when a resetKey changes (e.g. navigation)', () => {
    const { rerender } = render(
      <MemoryRouter>
        <ErrorBoundary resetKeys={['/a']}>
          <Boom crash />
        </ErrorBoundary>
      </MemoryRouter>,
    )
    expect(screen.getByText('Noe gikk galt')).toBeInTheDocument()

    // Navigate: resetKey flips and the child no longer throws → recovers.
    rerender(
      <MemoryRouter>
        <ErrorBoundary resetKeys={['/b']}>
          <Boom crash={false} />
        </ErrorBoundary>
      </MemoryRouter>,
    )
    expect(screen.getByText('recovered content')).toBeInTheDocument()
    expect(screen.queryByText('Noe gikk galt')).not.toBeInTheDocument()
  })

  it('stays on the fallback while the resetKey is unchanged', () => {
    const { rerender } = render(
      <MemoryRouter>
        <ErrorBoundary resetKeys={['/a']}>
          <Boom crash />
        </ErrorBoundary>
      </MemoryRouter>,
    )
    expect(screen.getByText('Noe gikk galt')).toBeInTheDocument()

    rerender(
      <MemoryRouter>
        <ErrorBoundary resetKeys={['/a']}>
          <Boom crash={false} />
        </ErrorBoundary>
      </MemoryRouter>,
    )
    expect(screen.getByText('Noe gikk galt')).toBeInTheDocument()
    expect(screen.queryByText('recovered content')).not.toBeInTheDocument()
  })
})
