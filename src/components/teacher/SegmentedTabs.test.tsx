import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SegmentedTabs } from './SegmentedTabs';

const tabs = [
  { key: 'a', label: 'Alpha' },
  { key: 'b', label: 'Beta' },
] as const;

describe('SegmentedTabs disabled', () => {
  it('fires onChange when enabled', () => {
    const onChange = vi.fn();
    render(<SegmentedTabs value="a" onChange={onChange} tabs={[...tabs]} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Beta' }));
    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('does not fire onChange and marks buttons aria-disabled when disabled', () => {
    const onChange = vi.fn();
    render(<SegmentedTabs value="a" onChange={onChange} tabs={[...tabs]} disabled />);
    const beta = screen.getByRole('tab', { name: 'Beta' });
    expect(beta).toHaveAttribute('aria-disabled', 'true');
    expect(beta).toBeDisabled();
    fireEvent.click(beta);
    expect(onChange).not.toHaveBeenCalled();
  });
});
