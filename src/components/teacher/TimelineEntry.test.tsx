import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TimelineEntry } from './TimelineEntry';

describe('TimelineEntry', () => {
  it('keeps the left-aligned date, rail, and card in three horizontal columns', () => {
    const { container } = render(
      <TimelineEntry date={<span>14. jul</span>} rail next>
        <span>Course card</span>
      </TimelineEntry>,
    );

    const timeline = container.firstElementChild;
    const columns = timeline?.children;

    expect(columns).toHaveLength(3);
    expect(columns?.[0]).toHaveTextContent('14. jul');
    expect(columns?.[0]).toHaveClass('text-left');
    expect(columns?.[2]).toHaveTextContent('Course card');
  });

  it('uses the solid ink marker for the next session', () => {
    const { container } = render(
      <TimelineEntry rail next>
        <span>Course card</span>
      </TimelineEntry>,
    );

    expect(container.querySelector('.size-2')).toHaveClass('bg-foreground');
  });
});
