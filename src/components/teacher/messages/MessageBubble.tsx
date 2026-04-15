import { CheckCheck } from '@/lib/icons';
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
        <div className="text-xs font-medium tracking-wide mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shrink-0">
          Du
        </div>
      ) : (
        <UserAvatar
          name={participant?.name}
          email={participant?.email}
          src={participant?.avatar_url}
          size="sm"
          className="mb-1 opacity-80 group-hover:opacity-100 transition-opacity"
        />
      )}

      <div className={`flex flex-col gap-1 ${isOutgoing ? 'items-end' : ''}`}>
        <div
          className={`rounded-lg px-4 py-3 ${
            isOutgoing
              ? 'bg-muted text-foreground rounded-br-sm'
              : 'bg-muted rounded-bl-sm'
          }`}
        >
          <p
            className={`text-sm leading-relaxed ${
              isOutgoing ? '' : 'text-foreground'
            }`}
          >
            {message.content}
          </p>
        </div>
        <span
          className={`text-xs font-medium tracking-wide flex items-center gap-1 text-muted-foreground ${
            isOutgoing ? 'pr-1' : 'pl-1'
          }`}
        >
          {formatMessageTimestamp(message.created_at)}
          {isOutgoing && message.is_read && (
            <CheckCheck className="h-3 w-3 text-green-800" />
          )}
        </span>
      </div>
    </div>
  );
}
