import { MessageSquare } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { badgeVariants } from '@/components/ui/badge';

interface NotePopoverProps {
  note?: string;
  className?: string;
}

export function NotePopover({ note, className }: NotePopoverProps) {
  if (!note) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Les notat"
          className={cn(
            badgeVariants({ variant: 'neutral', shape: 'rect', size: 'md' }),
            'cursor-pointer transition-colors duration-150 hover:bg-muted hover:text-foreground',
            className,
          )}
        >
          <MessageSquare aria-hidden="true" />
          Les notat
        </button>
      </PopoverTrigger>
      <PopoverContent align="center" side="top" className="w-56 p-3">
        <div className="flex items-start gap-2">
          <MessageSquare className="size-3.5 text-foreground-muted shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-sm text-foreground-muted leading-relaxed">{note}</p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
