import { memo } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { UserAvatar } from '@/components/ui/user-avatar';
import type { Message } from '@/types/dashboard';

interface MessagesListProps {
  messages: Message[];
}

export const MessagesList = memo(function MessagesList({ messages }: MessagesListProps) {
  return (
    <div className="col-span-1 md:col-span-3 lg:col-span-2">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-text-primary">Meldinger</h3>
        <Link to="/teacher/messages" className="text-xs font-medium text-text-secondary hover:text-text-primary transition-colors">Se alle</Link>
      </div>
      <div className="h-[280px] sm:h-[360px] rounded-xl bg-white border border-zinc-200 overflow-hidden flex flex-col">
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1 flex flex-col">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-10 h-10 bg-surface-elevated rounded-xl flex items-center justify-center mb-3">
              <MessageSquare className="w-4 h-4 text-text-tertiary" />
            </div>
            <p className="text-sm font-medium text-text-primary">Alt oppdatert</p>
            <p className="text-xs text-text-secondary mt-1">Ingen nye henvendelser fra elever.</p>
          </div>
        ) : (
          messages.map((message) => (
          <div
            key={message.id}
            className="group flex items-center gap-3.5 p-3 rounded-lg hover:bg-zinc-50 cursor-pointer smooth-transition focus-visible:ring-2 focus-visible:ring-zinc-400/50 outline-none"
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
                <p className="text-sm font-medium text-text-primary truncate">
                  {message.sender.name}
                </p>
                <span className="text-xs font-normal text-text-secondary flex-shrink-0 ml-1.5">
                  {message.timestamp}
                </span>
              </div>
              <p className="text-xs text-text-secondary truncate group-hover:text-text-primary transition-colors">
                {message.content}
              </p>
            </div>
          </div>
        ))
        )}
      </div>
      </div>
    </div>
  );
});
