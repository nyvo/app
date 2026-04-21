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
            'cursor-pointer smooth-transition hover:bg-muted-foreground/10 hover:text-foreground',
            className,
          )}
        >
          <MessageSquare aria-hidden="true" />
          Les notat
        </button>
      </PopoverTrigger>
      <PopoverContent align="center" side="top" className="w-56 p-3">
        <div className="flex items-start gap-2">
          <MessageSquare className="size-3.5 text-muted-foreground shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-sm text-muted-foreground leading-relaxed">{note}</p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
