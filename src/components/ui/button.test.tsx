import { render, screen } from '@testing-library/react'

import { Button, buttonVariants } from '@/components/ui/button'

describe('Button press feedback', () => {
  it('uses the shared press timing without translating the control', () => {
    const classes = buttonVariants()

    expect(classes).toContain('motion-press')
    expect(classes).not.toContain('translate-y-px')
    expect(classes).not.toContain('duration-150 ease-out')
  })

  it('adds press scale by default without changing the button dimensions', () => {
    render(<Button>Fortsett</Button>)

    const button = screen.getByRole('button', { name: 'Fortsett' })
    expect(button).toHaveClass('active:not-aria-[haspopup]:scale-[0.96]')
    expect(button).toHaveClass('h-10')
  })

  it('supports a static opt-out for actions where movement is distracting', () => {
    render(<Button static>Lagre</Button>)

    expect(screen.getByRole('button', { name: 'Lagre' })).not.toHaveClass(
      'active:not-aria-[haspopup]:scale-[0.96]',
    )
  })
})
