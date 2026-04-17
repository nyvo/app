import { Smile, Send } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const EMOJIS = ['😊', '🙏', '👋', '🧘', '✨', '💚', '🌸', '💪', '🙌', '🌞', '🍵', '🤸'];

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  sending?: boolean;
  placeholder?: string;
  rows?: number;
}

export function ChatInput({
  value,
  onChange,
  onSend,
  disabled,
  sending,
  placeholder = 'Skriv en melding',
  rows = 1,
}: ChatInputProps) {
  return (
    <div className="bg-background px-6 pb-6 pt-2 lg:px-8">
      <div className="relative flex flex-col gap-2 rounded-lg border border-input bg-transparent p-2 focus-within:ring-2 focus-within:ring-ring/50 dark:bg-input/30 ios-ease">
        <Textarea
          rows={rows}
          placeholder={placeholder}
          aria-label={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          disabled={disabled || sending}
          className="border-0 bg-transparent px-3 py-2 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 hover:border-transparent max-h-32 min-h-[44px]"
        />

        <div className="flex items-center justify-between px-2 pb-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-muted-foreground" aria-label="Velg emoji">
                <Smile />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64 p-2">
              <div className="grid grid-cols-6 gap-1" role="group" aria-label="Velg emoji">
                {EMOJIS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => onChange(value + emoji)}
                    aria-label={emoji}
                    className="rounded p-2 text-xl transition-[background-color] hover:bg-muted"
                  >
                    <span aria-hidden="true">{emoji}</span>
                  </button>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            disabled={disabled || !value.trim() || sending}
            size="compact"
            className="gap-2"
            onClick={onSend}
            aria-label={sending ? 'Sender melding' : 'Send melding'}
          >
            {sending ? (
              <><Spinner size="sm" aria-hidden="true" /><span className="sr-only">Sender</span></>
            ) : (
              <>
                <span>Send</span>
                <Send className="h-3.5 w-3.5" aria-hidden="true" />
              </>
            )}
          </Button>
        </div>
      </div>
      <p className="text-xs font-medium tracking-wide mt-3 text-center text-muted-foreground">
        Trykk <span className="text-xs font-medium text-muted-foreground">Enter</span> for å sende
      </p>
    </div>
  );
}
