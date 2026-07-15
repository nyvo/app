import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FloatingField } from './FloatingField';

describe('FloatingField motion', () => {
  it('keeps an accessible label while animating only transform and color', () => {
    render(<FloatingField id="email" label="E-post" />);

    const input = screen.getByRole('textbox', { name: 'E-post' });
    const label = screen.getByText('E-post');

    expect(input).toHaveAttribute('placeholder', ' ');
    expect(label).toHaveClass('top-[8px]', 'origin-top-left', 'text-[11px]');
    expect(label).toHaveClass(
      'translate-y-[10px]',
      'scale-[1.4545]',
      'transition-[translate,scale,color]',
      '[transition-timing-function:var(--ease-out)]',
      'motion-reduce:transition-colors',
    );
    expect(label.className).not.toContain('transition-[top,transform,font-size,color]');
  });
});
