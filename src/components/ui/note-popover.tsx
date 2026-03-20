import { StickyNote } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

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
          className={`inline-flex items-center justify-center h-8 w-8 rounded-lg transition-colors text-text-tertiary hover:text-text-primary hover:bg-surface-elevated ${className || ''}`}
          aria-label="Vis notat"
          title="Vis notat"
        >
          <StickyNote className="h-4 w-4 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="center" side="top" className="w-56 p-3">
        <div className="flex items-start gap-2">
          <StickyNote className="h-3.5 w-3.5 text-text-tertiary shrink-0 mt-0.5" />
          <p className="text-sm text-text-secondary leading-relaxed">{note}</p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
