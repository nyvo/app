import { memo } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare } from '@/lib/icons';
import { UserAvatar } from '@/components/ui/user-avatar';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import type { Message } from '@/types/dashboard';

interface MessagesListProps {
  messages: Message[];
  hideHeader?: boolean;
  hideCard?: boolean;
}

export const MessagesList = memo(function MessagesList({ messages, hideHeader = false, hideCard = false }: MessagesListProps) {
  const content = (
    <div className={hideCard ? "flex flex-1 flex-col divide-y divide-border" : "flex flex-1 flex-col divide-y divide-border overflow-y-auto px-3 py-3"}>
      {messages.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="Alt oppdatert"
          description="Ingen nye henvendelser fra elever."
          variant="compact"
          className="flex-1"
        />
      ) : (
        messages.map((message) => (
        <Link
          key={message.id}
          to={`/teacher/messages/${message.id}`}
          className="group flex cursor-pointer items-center gap-3.5 rounded-lg px-4 py-3 outline-none smooth-transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <div className="relative flex-shrink-0">
            <UserAvatar
              name={message.sender.name}
              src={message.sender.avatar}
              size="lg"
              ringClassName="border border-border group-hover:border-ring"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-baseline mb-0.5">
              <p className="text-sm font-medium truncate text-foreground">
                {message.sender.name}
              </p>
              <span className="text-xs font-medium tracking-wide ml-1.5 shrink-0 text-muted-foreground">
                {message.timestamp}
              </span>
            </div>
            <p className="text-sm text-muted-foreground truncate transition-[color] group-hover:text-foreground">
              {message.content}
            </p>
          </div>
        </Link>
      ))
      )}
    </div>
  );

  return (
    <div className="flex flex-col">
      {!hideHeader && (
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-medium text-foreground">Meldinger</h3>
          <Link to="/teacher/messages" className="text-xs font-medium tracking-wide text-muted-foreground transition-[color] hover:text-foreground">Se alle</Link>
        </div>
      )}
      {hideCard ? content : <Card className="flex flex-1 min-h-[280px] flex-col overflow-hidden">{content}</Card>}
    </div>
  );
});
