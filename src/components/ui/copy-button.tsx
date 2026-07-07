import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Check, Copy } from '@/lib/icons';
import { Button, type ButtonProps } from '@/components/ui/button';

const COPY_REVERT_MS = 1500;

/**
 * Shared "copy to clipboard" timing + failure copy. Exported on its own so
 * surfaces whose row anatomy doesn't fit a pill button (e.g.
 * share-course-popover's list-item rows) can still share the 1.5s revert and
 * the "Kunne ikke kopiere" failure toast instead of re-implementing it.
 */
export function useCopyToClipboard() {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), COPY_REVERT_MS);
      return true;
    } catch {
      toast.error('Kunne ikke kopiere');
      return false;
    }
  };

  return { copied, copy };
}

interface CopyButtonProps extends Omit<ButtonProps, 'onClick' | 'children'> {
  /** Text copied to the clipboard. */
  value: string;
  /** Default: "Kopier". */
  label?: string;
  /** Default: "Kopiert". */
  copiedLabel?: string;
}

/**
 * Secondary pill button with a Copy→Check icon swap. Reverts to the resting
 * label 1.5s after a successful copy; a failed copy (clipboard permission,
 * insecure context) surfaces the shared "Kunne ikke kopiere" toast instead of
 * flipping the icon.
 */
export function CopyButton({
  value,
  label = 'Kopier',
  copiedLabel = 'Kopiert',
  variant = 'secondary',
  type = 'button',
  ...props
}: CopyButtonProps) {
  const { copied, copy } = useCopyToClipboard();

  return (
    <Button type={type} variant={variant} onClick={() => void copy(value)} {...props}>
      {copied ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
      {copied ? copiedLabel : label}
    </Button>
  );
}
