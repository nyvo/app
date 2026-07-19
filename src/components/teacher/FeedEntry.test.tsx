import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FeedEntry } from './FeedEntry';

describe('FeedEntry', () => {
  it('keeps the left-aligned date and card in two horizontal columns', () => {
    const { container } = render(
      <FeedEntry date={<span>14. jul</span>}>
        <span>Course card</span>
      </FeedEntry>,
    );

    const row = container.firstElementChild;
    const columns = row?.children;

    expect(columns).toHaveLength(2);
    expect(columns?.[0]).toHaveTextContent('14. jul');
    expect(columns?.[0]).toHaveClass('text-left');
    expect(columns?.[1]).toHaveTextContent('Course card');
  });

  it('renders the stacked date above the content when provided', () => {
    const { container } = render(
      <FeedEntry date={<span>14. jul</span>} stackedDate={<span>I dag · 14. jul</span>}>
        <span>Course card</span>
      </FeedEntry>,
    );

    const content = container.firstElementChild?.children[1];
    expect(content?.firstElementChild).toHaveTextContent('I dag · 14. jul');
    expect(content?.firstElementChild).toHaveClass('sm:hidden');
  });
});
