import { Link } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { UserAvatar } from '@/components/ui/user-avatar';
import { Card } from '@/components/ui/card';
import type { Message } from '@/types/dashboard';

interface DashboardMessagesCardProps {
  messages: Message[];
}

export function DashboardMessagesCard({ messages }: DashboardMessagesCardProps) {
  const recentMessages = messages.slice(0, 3);

  return (
    <section aria-labelledby="messages-heading">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="messages-heading" className="type-title text-foreground">Meldinger</h2>
        {recentMessages.length > 0 && (
          <Link
            to="/teacher/messages"
            className="type-meta text-muted-foreground smooth-transition hover:text-foreground"
          >
            Se alle
          </Link>
        )}
      </div>
      <Card className="p-2 sm:p-3">
        {recentMessages.length === 0 ? (
          <div className="flex items-center gap-2 sm:gap-3 px-1 py-2">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-muted-foreground">
              <MessageSquare className="h-4 w-4" />
            </div>
            <p className="type-label text-foreground">Ingen nye meldinger</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {recentMessages.map((message) => (
              <Link
                key={message.id}
                to={`/teacher/messages/${message.id}`}
                className="group flex items-center gap-2 sm:gap-3 rounded-lg px-1 py-2.5 outline-none smooth-transition hover:bg-surface-muted/50 focus-visible:bg-surface-muted/50"
              >
                <UserAvatar
                  name={message.sender.name}
                  src={message.sender.avatar}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="type-label truncate text-foreground">
                      {message.sender.name}
                    </p>
                    <span className="type-meta shrink-0 text-muted-foreground">
                      {message.timestamp}
                    </span>
                  </div>
                  <p className="type-body-sm mt-0.5 truncate text-muted-foreground">
                    {message.content}
                  </p>
                </div>
                {message.unreadCount > 0 && (
                  <div className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-foreground px-1">
                    <span className="type-meta text-[10px] leading-none text-background">
                      {message.unreadCount > 99 ? '99+' : message.unreadCount}
                    </span>
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </Card>
    </section>
  );
}
