import { Search, Plus } from '@/lib/icons';
import { Badge } from '@/components/ui/badge';
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
      <div className="border-b border-border px-6 py-4 lg:px-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-foreground">Samtaler</h2>
          <Button onClick={onNewMessage} size="sm" className="gap-2">
            <Plus className="size-3.5" />
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
      <div className="custom-scrollbar flex-1 space-y-1 overflow-y-auto px-4 py-3 lg:px-6">
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
          conversations.map((conversation) => {
            const isSelected = activeConversationId === conversation.id && !isComposing;
            const isUnread = conversation.unread_count > 0;
            return (
              <button
                key={conversation.id}
                onClick={() => onSelect(conversation)}
                className={`group relative flex w-full items-start gap-3 rounded-lg px-4 py-3 text-left ios-ease outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50 ${
                  isSelected
                    ? 'bg-muted ring-1 ring-inset ring-border'
                    : 'hover:bg-muted/50'
                }`}
              >
                <div className="relative shrink-0">
                  <UserAvatar
                    name={conversation.participant?.name}
                    email={conversation.participant?.email}
                    src={conversation.participant?.avatar_url}
                    size="lg"
                  />
                  {isUnread && (
                    <Badge
                      aria-label={`${conversation.unread_count} uleste meldinger`}
                      className="absolute -top-1 -right-1 size-4 justify-center rounded-full px-0 text-xxs border-2 border-background"
                    >
                      <span aria-hidden="true">{conversation.unread_count}</span>
                    </Badge>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-sm truncate text-foreground ${
                        isUnread ? 'font-semibold' : 'font-medium'
                      }`}
                    >
                      {conversation.participant?.name || conversation.participant?.email || 'Ukjent'}
                    </span>
                    <span className="text-xs tabular-nums text-tertiary-foreground">
                      {formatMessageTimestamp(conversation.updated_at)}
                    </span>
                  </div>
                  <p
                    className={`truncate text-sm ${
                      isUnread ? 'font-medium text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {conversation.last_message?.content || 'Ingen meldinger'}
                  </p>
                </div>
                {isUnread && (
                  <div className="size-2 rounded-full bg-chart-2 shrink-0 mt-2" aria-hidden="true" />
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
