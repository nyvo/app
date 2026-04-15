import { useState } from 'react';
import { ChevronLeft, X, Search, Paperclip, Smile, Send } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const EMOJIS = ['😊', '🙏', '👋', '🧘', '✨', '💚', '🌸', '💪', '🙌', '🌞', '🍵', '🤸'];

interface ComposeViewProps {
  onCancel: () => void;
  onSend: (recipient: string, body: string) => Promise<void>;
  sending: boolean;
}

export function ComposeView({ onCancel, onSend, sending }: ComposeViewProps) {
  const [recipient, setRecipient] = useState('');
  const [body, setBody] = useState('');

  const handleSend = () => {
    if (!recipient.trim() || !body.trim()) return;
    onSend(recipient.trim(), body.trim());
  };

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden">
      <header className="shrink-0 flex items-center justify-between border-b border-border bg-background px-6 py-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onCancel}
            className="md:hidden -ml-2 text-muted-foreground hover:text-foreground"
            aria-label="Tilbake"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <h3 className="text-base font-medium text-foreground">Ny melding</h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onCancel}
          className="rounded-full text-muted-foreground hover:text-foreground"
          aria-label="Lukk ny melding"
        >
          <X className="h-4 w-4" />
        </Button>
      </header>

      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <label htmlFor="compose-recipient" className="text-xs font-medium ml-1 text-foreground">Til</label>
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-foreground transition-[color] pointer-events-none" />
            <Input
              id="compose-recipient"
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="f.eks. navn@eksempel.no"
              autoFocus
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-3">
          <label htmlFor="compose-message-body" className="text-xs font-medium ml-1 text-foreground">Melding</label>
          <div className="rounded-lg border border-border bg-muted p-3 focus-within:ring-2 focus-within:ring-ring/50 ios-ease">
            <Textarea
              id="compose-message-body"
              rows={8}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Skriv meldingen din her"
              className="border-0 bg-transparent px-1 py-1 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 hover:border-transparent min-h-0 custom-scrollbar"
            />
            <div className="flex items-center justify-between pt-3 mt-2 border-t border-border">
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-muted-foreground" aria-label="Legg til vedlegg">
                  <Paperclip />
                </Button>
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
                          onClick={() => setBody(prev => prev + emoji)}
                          aria-label={emoji}
                          className="rounded p-2 text-xl transition-[background-color] hover:bg-muted"
                        >
                          <span aria-hidden="true">{emoji}</span>
                        </button>
                      ))}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <Button
                size="compact"
                className="gap-2"
                onClick={handleSend}
                disabled={!recipient.trim() || !body.trim() || sending}
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
        </div>
      </div>
    </div>
  );
}
