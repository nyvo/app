import { Search, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/ui/search-input';
import { SectionLoader } from '@/components/ui/section-loader';
import { EmptyState } from '@/components/ui/empty-state';
import { UserAvatar } from '@/components/ui/user-avatar';
import { formatMessageTimestamp } from '@/utils/dateFormatting';
import type { ConversationWithDetails } from '@/services/messages';

interface ConversationListProps {
  conversations: ConversationWithDetails[];
  activeConversationId: string | null;
  isComposing: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelect: (conversation: ConversationWithDetails) => void;
  onNewMessage: () => void;
  loading: boolean;
}

export function ConversationList({
  conversations,
  activeConversationId,
  isComposing,
  searchQuery,
  onSearchChange,
  onSelect,
  onNewMessage,
  loading,
}: ConversationListProps) {
  return (
    <div className="flex h-full flex-col">
      {/* List Header */}
      <div className="border-b border-border px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-medium text-foreground">Samtaler</h2>
          <Button onClick={onNewMessage} size="compact" className="gap-2">
            <Plus className="h-3.5 w-3.5" />
            Ny melding
          </Button>
        </div>
        <SearchInput
          value={searchQuery}
          onChange={onSearchChange}
          placeholder="Søk"
          aria-label="Søk i meldinger"
        />
      </div>

      {/* Conversations Scroll Area */}
      <div className="custom-scrollbar flex-1 space-y-1 overflow-y-auto px-3 py-3">
        {loading ? (
          <SectionLoader size="md" />
        ) : conversations.length === 0 ? (
          <EmptyState
            icon={Search}
            title={searchQuery ? 'Ingen treff' : 'Ingen meldinger'}
            description={searchQuery ? 'Prøv et annet søkeord.' : 'Nye meldinger vises her.'}
            variant="compact"
            className="mt-8"
          />
        ) : (
          conversations.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => onSelect(conversation)}
              className={`group relative flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left ios-ease ${
                activeConversationId === conversation.id && !isComposing
                  ? 'border-border bg-surface-muted'
                  : conversation.is_read
                  ? 'border-transparent hover:bg-surface-muted opacity-70 hover:opacity-100'
                  : 'border-transparent hover:bg-surface-muted'
              }`}
            >
              <div className="relative shrink-0">
                <UserAvatar
                  name={conversation.participant?.name}
                  email={conversation.participant?.email}
                  src={conversation.participant?.avatar_url}
                  size="lg"
                  className={activeConversationId !== conversation.id && conversation.unread_count === 0 ? 'opacity-90 group-hover:opacity-100' : ''}
                />
                {conversation.unread_count > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-xxs font-medium text-primary-foreground border-2 border-surface">
                    {conversation.unread_count}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-sm font-medium truncate ${
                      activeConversationId === conversation.id && !isComposing
                        ? 'text-foreground'
                        : conversation.is_read ? 'text-muted-foreground' : 'text-foreground'
                    }`}
                  >
                    {conversation.participant?.name || conversation.participant?.email || 'Ukjent'}
                  </span>
                  <span className="text-xs font-medium tracking-wide text-muted-foreground">
                    {formatMessageTimestamp(conversation.updated_at)}
                  </span>
                </div>
                <p
                  className={`truncate ${
                    conversation.unread_count > 0
                      ? 'text-sm font-medium text-foreground'
                      : activeConversationId === conversation.id
                      ? 'text-sm font-medium text-muted-foreground'
                      : 'text-sm text-muted-foreground'
                  }`}
                >
                  {conversation.last_message?.content || 'Ingen meldinger'}
                </p>
              </div>
              {conversation.unread_count > 0 && (
                <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" role="img" aria-label="Ulest" />
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
