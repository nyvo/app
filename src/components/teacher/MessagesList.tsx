import { memo } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { UserAvatar } from '@/components/ui/user-avatar';
import { Card } from '@/components/ui/card';
import type { Message } from '@/types/dashboard';

interface MessagesListProps {
  messages: Message[];
}

export const MessagesList = memo(function MessagesList({ messages }: MessagesListProps) {
  return (
    <div className="col-span-1 md:col-span-3 lg:col-span-2 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-foreground">Meldinger</h3>
        <Link to="/teacher/messages" className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">Se alle</Link>
      </div>
      <Card className="overflow-hidden flex flex-col flex-1 min-h-[280px]">
      <div className="flex-1 overflow-y-auto px-2 py-3 divide-y divide-border flex flex-col">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="size-10 rounded-lg border border-border bg-background flex items-center justify-center mb-3">
              <MessageSquare className="size-4 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">Alt oppdatert</p>
            <p className="text-xs text-muted-foreground mt-1">Ingen nye henvendelser fra elever.</p>
          </div>
        ) : (
          messages.map((message) => (
          <Link
            key={message.id}
            to={`/teacher/messages/${message.id}`}
            className="group flex items-center gap-3.5 p-3 rounded-lg hover:bg-muted cursor-pointer smooth-transition focus-visible:ring-2 focus-visible:ring-ring/50 outline-none"
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
                <p className="text-sm font-medium text-foreground truncate">
                  {message.sender.name}
                </p>
                <span className="text-xs font-normal text-muted-foreground flex-shrink-0 ml-1.5">
                  {message.timestamp}
                </span>
              </div>
              <p className="text-sm text-muted-foreground truncate group-hover:text-foreground transition-colors">
                {message.content}
              </p>
            </div>
          </Link>
        ))
        )}
      </div>
      </Card>
    </div>
  );
});
