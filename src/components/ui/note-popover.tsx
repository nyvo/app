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
          className={`inline-flex items-center justify-center h-8 w-8 hover:bg-surface-elevated rounded-md text-warning hover:text-warning/80 ios-ease ${className || ''}`}
          title={note}
        >
          <StickyNote className="h-4 w-4 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="center" side="top" className="w-56 p-3">
        <p className="text-xs text-text-secondary leading-relaxed">{note}</p>
      </PopoverContent>
    </Popover>
  );
}
