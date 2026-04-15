import { ChevronLeft, MoreHorizontal, Trash2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { UserAvatar } from '@/components/ui/user-avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import type { Message } from '@/types/database';
import type { ConversationWithDetails } from '@/services/messages';

interface ChatViewProps {
  conversation: ConversationWithDetails;
  messages: Message[];
  messageText: string;
  onMessageTextChange: (value: string) => void;
  onSend: () => void;
  onDelete: () => void;
  onBack: () => void;
  sending: boolean;
}

export function ChatView({
  conversation,
  messages,
  messageText,
  onMessageTextChange,
  onSend,
  onDelete,
  onBack,
  sending,
}: ChatViewProps) {
  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden">
      {/* Header */}
      <header className="shrink-0 flex items-center justify-between border-b border-border bg-background px-6 py-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            className="md:hidden -ml-2 text-muted-foreground hover:text-foreground"
            onClick={onBack}
            aria-label="Tilbake til samtaler"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <div className="relative">
            <UserAvatar
              name={conversation.participant?.name}
              email={conversation.participant?.email}
              src={conversation.participant?.avatar_url}
              size="lg"
              ringClassName="ring-2 ring-white"
            />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-medium truncate text-foreground">
              {conversation.participant?.name || conversation.participant?.email || 'Ukjent'}
            </h3>
            <p className="text-xs font-medium tracking-wide truncate text-muted-foreground">
              {conversation.participant?.email || 'Elev'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-foreground rounded-full" aria-label="Flere handlinger">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                className="text-primary focus:text-primary [&_svg]:text-primary"
                onClick={onDelete}
              >
                <Trash2 />
                Slett samtale
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Messages Area */}
      <div className="custom-scrollbar flex flex-1 flex-col space-y-6 overflow-y-auto p-6">
        {messages.length === 0 ? (
          <EmptyState
            icon={Send}
            title="Ingen meldinger ennå"
            description="Send den første meldingen for å starte samtalen."
            className="flex-1"
          />
        ) : (
          <>
            {/* Time Separator */}
            <div className="flex justify-center">
              <span className="text-xs font-semibold tracking-widest uppercase rounded-full bg-surface-muted px-3 py-1 text-muted-foreground">
                I dag
              </span>
            </div>

            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                participant={conversation.participant}
              />
            ))}
          </>
        )}
      </div>

      {/* Input Area */}
      <ChatInput
        value={messageText}
        onChange={onMessageTextChange}
        onSend={onSend}
        sending={sending}
      />
    </div>
  );
}
