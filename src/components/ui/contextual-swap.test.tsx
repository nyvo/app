import { render, screen } from '@testing-library/react'

import { ContextualSwap } from '@/components/ui/contextual-swap'

describe('ContextualSwap', () => {
  it('keeps both states in one grid cell and exposes only the active state', () => {
    const { rerender } = render(
      <ContextualSwap
        active={false}
        activeContent={<span>Skjul</span>}
        inactiveContent={<span>Vis</span>}
      />,
    )

    expect(screen.getByText('Vis').parentElement).not.toHaveAttribute('aria-hidden')
    expect(screen.getByText('Skjul').parentElement).toHaveAttribute('aria-hidden', 'true')

    rerender(
      <ContextualSwap
        active
        activeContent={<span>Skjul</span>}
        inactiveContent={<span>Vis</span>}
      />,
    )

    expect(screen.getByText('Vis').parentElement).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByText('Skjul').parentElement).not.toHaveAttribute('aria-hidden')
  })
})
