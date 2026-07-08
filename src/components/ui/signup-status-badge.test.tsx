import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SignupStatusBadge } from './signup-status-badge';
import type { PaymentStatus } from '@/types/database';

describe('SignupStatusBadge', () => {
  it('shows "Venter på betaling" for a pending payment', () => {
    render(<SignupStatusBadge status="confirmed" paymentStatus="pending" />);
    expect(screen.getByText('Venter på betaling')).toBeInTheDocument();
  });

  it('shows "Betaling feilet" for a failed payment', () => {
    render(<SignupStatusBadge status="confirmed" paymentStatus="failed" />);
    expect(screen.getByText('Betaling feilet')).toBeInTheDocument();
  });

  it('shows "Påmeldt" for a paid signup', () => {
    render(<SignupStatusBadge status="confirmed" paymentStatus="paid" />);
    expect(screen.getByText('Påmeldt')).toBeInTheDocument();
  });

  it('shows "Påmeldt" for a null payment status (free signup)', () => {
    render(<SignupStatusBadge status="confirmed" paymentStatus={null as unknown as PaymentStatus} />);
    expect(screen.getByText('Påmeldt')).toBeInTheDocument();
  });

  it('shows "Refundert" when payment is refunded, taking precedence over signup status', () => {
    render(<SignupStatusBadge status="confirmed" paymentStatus="refunded" />);
    expect(screen.getByText('Refundert')).toBeInTheDocument();
  });

  it('shows "Avbestilt" for a cancelled signup', () => {
    render(<SignupStatusBadge status="cancelled" paymentStatus="paid" />);
    expect(screen.getByText('Avbestilt')).toBeInTheDocument();
  });

  it('falls back to the raw value for an unrecognized payment status', () => {
    const unknown = 'disputed' as PaymentStatus;
    expect(() => render(<SignupStatusBadge status="confirmed" paymentStatus={unknown} />)).not.toThrow();
    expect(screen.getByText('disputed')).toBeInTheDocument();
  });
});
