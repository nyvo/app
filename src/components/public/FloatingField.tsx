import * as React from 'react';
import { cn } from '@/lib/utils';

interface FloatingFieldProps extends Omit<React.ComponentPropsWithoutRef<'input'>, 'placeholder'> {
  /** Rests as the field's content at text-base; floats to an 11px top-left
   *  caption once the field is focused or has a value. */
  label: string;
  id: string;
}

/**
 * Floating-label field — the intentional public-page input grammar (booking,
 * checkout), distinct from the dashboard's static-label `Field`. Matches the
 * mock's `.fl` shell (52px, `rounded-xl` = 10px, `border-input`) via CSS
 * `peer` selectors on `:placeholder-shown`, so it needs no focus/filled
 * state in React and works with controlled values and browser autofill
 * alike. See docs/design/booking-detail-cta-first.html and the
 * "public-page-input-style" memory note.
 */
export const FloatingField = React.forwardRef<HTMLInputElement, FloatingFieldProps>(
  function FloatingField({ label, id, className, ...props }, ref) {
    return (
      <div className="relative">
        <input
          ref={ref}
          id={id}
          placeholder=" "
          className={cn(
            // 52px shell: pt-22 + pb-6 + text-base line-height 24 = 52 exactly.
            // The arbitrary paddings encode the float geometry, not spacing drift.
            'peer h-[52px] w-full min-w-0 rounded-xl border border-input bg-surface px-4 pt-[22px] pb-[6px] text-base text-foreground outline-none transition-colors duration-150 ease-out placeholder:text-transparent',
            'focus-visible:border-foreground focus-visible:ring-2 focus-visible:ring-ring-subtle',
            'aria-invalid:border-danger aria-invalid:ring-2 aria-invalid:ring-danger/20',
            'disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-50',
            className,
          )}
          {...props}
        />
        <label
          htmlFor={id}
          className={cn(
            'pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base text-foreground-muted transition-[top,transform,font-size,color] duration-150 ease-out',
            'peer-focus:top-[13px] peer-focus:translate-y-0 peer-focus:text-[11px]',
            'peer-[:not(:placeholder-shown)]:top-[13px] peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-[11px]',
          )}
        >
          {label}
        </label>
      </div>
    );
  },
);
