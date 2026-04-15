import { Link } from 'react-router-dom';
import { MessageSquare } from '@/lib/icons';
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
      <h2 id="messages-heading" className="text-base font-medium mb-3 text-foreground">Meldinger</h2>
      <Card className="p-2 sm:p-3">
        {recentMessages.length === 0 ? (
          <div className="flex items-center gap-2 sm:gap-3 px-1 py-2">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <MessageSquare className="h-4 w-4" />
            </div>
            <p className="text-sm font-medium text-foreground">Ingen nye meldinger</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {recentMessages.map((message) => (
              <Link
                key={message.id}
                to={`/teacher/messages/${message.id}`}
                className="group flex items-center gap-2 sm:gap-3 rounded-lg px-1 py-2.5 outline-none smooth-transition hover:bg-muted/50 focus-visible:bg-muted/50"
              >
                <UserAvatar
                  name={message.sender.name}
                  src={message.sender.avatar}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-medium truncate text-foreground">
                      {message.sender.name}
                    </p>
                    <span className="text-xs font-medium tracking-wide shrink-0 text-muted-foreground">
                      {message.timestamp}
                    </span>
                  </div>
                  <p className="text-sm mt-0.5 truncate text-muted-foreground">
                    {message.content}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </section>
  );
}
