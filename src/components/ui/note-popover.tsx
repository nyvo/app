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
          className={`inline-flex items-center justify-center h-8 w-8 rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-elevated transition-colors ${className || ''}`}
          aria-label="Vis notater"
          title="Vis notater"
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
