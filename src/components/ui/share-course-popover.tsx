import { useState } from 'react';
import { Check, Copy, Send } from '@/lib/icons';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { useCopyToClipboard } from '@/components/ui/copy-button';

interface ShareCoursePopoverProps {
  courseUrl: string;
  courseTitle?: string;
  /** Height of the default trigger — match the buttons sharing its row. */
  size?: React.ComponentProps<typeof Button>['size'];
  children?: React.ReactNode;
}

/**
 * Share popover — minimal 2026 pattern. Two paths:
 *  - **Copy lenke** — universal, always visible.
 *  - **Del med…** — only when `navigator.share` is available (mobile). Hands
 *    off to the OS share sheet so the user gets every installed app
 *    (Messenger, Signal, AirDrop, etc.) without us hardcoding a list.
 *
 * We intentionally don't list specific channels (WhatsApp, email, social
 * networks) — copy-link covers desktop, the native share sheet covers mobile,
 * and hand-rolled channel buttons read as marketing template.
 */
export function ShareCoursePopover({
  courseUrl,
  courseTitle = 'kurset',
  size = 'default',
  children,
}: ShareCoursePopoverProps) {
  const [open, setOpen] = useState(false);
  const { copied, copy } = useCopyToClipboard();

  const canNativeShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const handleCopy = () => void copy(courseUrl);

  const handleNativeShare = async () => {
    try {
      await navigator.share({
        title: courseTitle,
        text: `Se kurset: ${courseTitle}`,
        url: courseUrl,
      });
      setOpen(false);
    } catch {
      // User dismissed or share failed silently — no toast needed.
    }
  };

  const cleanUrl = courseUrl.replace(/^https?:\/\//, '');

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children || (
          <Button size={size}>
            <Send data-icon="inline-start" />
            Del kurs
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2" align="end">
        <button
          type="button"
          onClick={handleCopy}
          className="w-full flex items-center gap-3 rounded-sm px-3 py-2.5 text-left text-sm outline-none hover:bg-muted focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring ring-inset transition-colors cursor-pointer"
        >
          <div className="size-8 rounded-md bg-muted flex items-center justify-center shrink-0">
            {copied ? (
              <Check className="size-4 text-foreground" strokeWidth={2.25} />
            ) : (
              <Copy className="size-4 text-foreground-muted" strokeWidth={1.75} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-foreground">
              {copied ? 'Lenke kopiert' : 'Kopier lenke'}
            </p>
            <p className="text-sm text-foreground-muted truncate">{cleanUrl}</p>
          </div>
        </button>

        {canNativeShare && (
          <button
            type="button"
            onClick={handleNativeShare}
            className="w-full flex items-center gap-3 rounded-sm px-3 py-2.5 text-left text-sm outline-none hover:bg-muted focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring ring-inset transition-colors cursor-pointer"
          >
            <div className="size-8 rounded-md bg-muted flex items-center justify-center shrink-0">
              <Send className="size-4 text-foreground-muted" strokeWidth={1.75} />
            </div>
            <p className="font-medium text-foreground">Del med…</p>
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
