import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import type { Message } from '@/types/dashboard';

interface MessagesListProps {
  messages: Message[];
}

export const MessagesList = ({ messages }: MessagesListProps) => {
  return (
    <div className="col-span-1 md:col-span-3 lg:col-span-2 h-[360px] rounded-3xl border border-border bg-white p-0 shadow-sm overflow-hidden ios-ease hover:border-ring hover:shadow-md flex flex-col">
      <div className="flex items-center justify-between p-5 border-b border-secondary">
        <h3 className="font-geist text-sm font-semibold text-text-primary">Meldinger</h3>
        <Link to="/teacher/messages" className="text-xs font-medium text-text-tertiary hover:text-text-secondary transition-colors">Se alle</Link>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="mb-4 rounded-full bg-surface p-4 border border-surface-elevated">
              <MessageCircle className="h-8 w-8 text-text-tertiary stroke-[1.5]" />
            </div>
            <h4 className="font-geist text-sm font-medium text-text-primary mb-1">
              Ingen meldinger
            </h4>
            <p className="text-xs text-muted-foreground max-w-[200px]">
              Du har ingen nye meldinger
            </p>
          </div>
        ) : (
          messages.map((message) => (
          <div
            key={message.id}
            className="group flex items-center gap-3.5 p-3 rounded-2xl hover:bg-surface-elevated cursor-pointer transition-colors"
          >
            <div className="relative flex-shrink-0">
              {message.sender.avatar ? (
                <img
                  src={message.sender.avatar}
                  className="h-10 w-10 rounded-full object-cover border border-border group-hover:border-ring"
                  alt={message.sender.name}
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-surface-elevated flex items-center justify-center text-text-secondary text-xs font-medium border border-border group-hover:border-ring">
                  {message.sender.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
              )}
              {message.isOnline && (
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-primary-accent ring-2 ring-white"></span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline mb-0.5">
                <p className="text-sm font-medium text-text-primary truncate">
                  {message.sender.name}
                </p>
                <span className="text-xxs font-medium text-text-tertiary flex-shrink-0 ml-1.5 group-hover:text-muted-foreground">
                  {message.timestamp}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate group-hover:text-text-secondary">
                {message.content}
              </p>
            </div>
          </div>
        ))
        )}
      </div>
    </div>
  );
};
