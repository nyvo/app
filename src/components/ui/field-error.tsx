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
 * For form-level errors (submit failed, page-load failed), use
 * <Alert variant="error" size="sm"> instead — those are not field errors.
 */
export function FieldError({ id, children, className }: FieldErrorProps) {
  return (
    <p
      id={id}
      role="alert"
      className={cn('mt-1.5 text-xs font-medium text-danger', className)}
    >
      {children}
    </p>
  );
}
