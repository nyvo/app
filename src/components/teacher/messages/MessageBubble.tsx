import { CheckCheck } from '@/lib/icons';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/ui/user-avatar';
import { formatMessageTimestamp } from '@/utils/dateFormatting';
import type { Message } from '@/types/database';
import type { ConversationWithDetails } from '@/services/messages';

interface MessageBubbleProps {
  message: Message;
  participant: ConversationWithDetails['participant'];
}

export function MessageBubble({ message, participant }: MessageBubbleProps) {
  const isOutgoing = message.is_outgoing;

  return (
    <div
      className={`flex items-end gap-3 max-w-[85%] sm:max-w-[70%] group ${
        isOutgoing ? 'self-end flex-row-reverse' : 'self-start'
      }`}
    >
      {isOutgoing ? (
        <Badge className="mb-1 flex size-8 items-center justify-center rounded-full px-0 text-xs shrink-0">
          Du
        </Badge>
      ) : (
        <UserAvatar
          name={participant?.name}
          email={participant?.email}
          src={participant?.avatar_url}
          size="sm"
          className="mb-1"
        />
      )}

      <div className={`flex flex-col gap-1 ${isOutgoing ? 'items-end' : ''}`}>
        <div
          className={`rounded-lg px-4 py-3 ${
            isOutgoing
              ? 'bg-primary text-primary-foreground rounded-br-sm'
              : 'bg-card border border-border text-foreground rounded-bl-sm'
          }`}
        >
          <p className="text-sm">
            {message.content}
          </p>
        </div>
        <span
          className={`text-xs tabular-nums flex items-center gap-1 text-tertiary-foreground ${
            isOutgoing ? 'pr-1' : 'pl-1'
          }`}
        >
          {formatMessageTimestamp(message.created_at)}
          {isOutgoing && message.is_read && (
            <CheckCheck className="size-3 text-success" />
          )}
        </span>
      </div>
    </div>
  );
}
