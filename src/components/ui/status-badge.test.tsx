import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge, type CourseStatus } from './status-badge';

describe('StatusBadge', () => {
  it('renders the known label for a valid status', () => {
    render(<StatusBadge status="active" />);
    expect(screen.getByText('Pågår')).toBeInTheDocument();
  });

  it('falls back to a neutral badge with the raw value instead of throwing on an unknown status', () => {
    const unknown = 'archived' as CourseStatus;
    expect(() => render(<StatusBadge status={unknown} />)).not.toThrow();
    expect(screen.getByText('archived')).toBeInTheDocument();
  });
});
