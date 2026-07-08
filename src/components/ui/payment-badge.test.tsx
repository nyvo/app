import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PaymentBadge } from './payment-badge';
import type { PaymentStatus } from '@/types/database';

describe('PaymentBadge', () => {
  it('renders the known label for a valid status', () => {
    render(<PaymentBadge status="failed" visibility="always" />);
    expect(screen.getByText('Betaling feilet')).toBeInTheDocument();
  });

  it('falls back to a muted badge with the raw value instead of throwing on an unknown status', () => {
    const unknown = 'disputed' as PaymentStatus;
    expect(() => render(<PaymentBadge status={unknown} visibility="always" />)).not.toThrow();
    expect(screen.getByText('disputed')).toBeInTheDocument();
  });
});
