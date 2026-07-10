import { cn } from '@/lib/utils';

interface FieldErrorProps {
  /** Stable id so the input can target it via aria-describedby. */
  id?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Canonical inline form-field error. Renders below an input as a short,
 * bold, danger-colored message. Use the input's `aria-describedby` to pair
 * the input with the message via the `id` prop.
 *
 * The built-in `mt-2` OWNS the input↔error gap (8px, per the spacing ladder).
 * Inside a `grid gap-2` field stack, pass `className="mt-0"` so the grid gap
 * owns it instead — never let both mechanisms stack.
 *
 * For form-level errors (submit failed, page-load failed), use
 * <Alert variant="error" size="sm"> instead — those are not field errors.
 */
export function FieldError({ id, children, className }: FieldErrorProps) {
  return (
    <p
      id={id}
      role="alert"
      className={cn('mt-2 text-xs font-medium text-danger animate-in fade-in-0 duration-150', className)}
    >
      {children}
    </p>
  );
}
