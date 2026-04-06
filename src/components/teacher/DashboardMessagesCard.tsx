import { Link } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { UserAvatar } from '@/components/ui/user-avatar';
import type { Message } from '@/types/dashboard';

interface DashboardMessagesCardProps {
  messages: Message[];
}

export function DashboardMessagesCard({ messages }: DashboardMessagesCardProps) {
  const recentMessages = messages.slice(0, 3);

  return (
    <section>
      <h2 className="type-title mb-3 text-foreground">Meldinger</h2>

      <div className="overflow-hidden rounded-xl border border-border">
        {recentMessages.length === 0 ? (
          <div className="flex items-center gap-3 px-4 py-5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-muted-foreground">
              <MessageSquare className="h-4 w-4" />
            </div>
            <p className="type-label text-foreground">Ingen nye meldinger</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recentMessages.map((message) => (
              <Link
                key={message.id}
                to={`/teacher/messages/${message.id}`}
                className="group flex items-start gap-3 px-4 py-3 outline-none smooth-transition hover:bg-surface-muted/50 focus-visible:bg-surface-muted/50"
              >
                <UserAvatar
                  name={message.sender.name}
                  src={message.sender.avatar}
                  size="md"
                  ringClassName="border border-border"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="type-label truncate text-foreground">{message.sender.name}</p>
                    <span className="type-meta shrink-0 text-muted-foreground">{message.timestamp}</span>
                  </div>
                  <p className="type-body-sm mt-1 line-clamp-2 text-muted-foreground">{message.content}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
