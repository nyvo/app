import { Link } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import type { Message } from '@/types/dashboard';

interface MessagesListProps {
  messages: Message[];
}

export const MessagesList = ({ messages }: MessagesListProps) => {
  return (
    <div className="col-span-1 md:col-span-3 lg:col-span-2 h-[360px] rounded-3xl bg-white shadow-sm overflow-hidden ios-ease hover:shadow-md flex flex-col">
      <div className="flex items-center justify-between p-5 pb-4">
        <h3 className="font-geist text-sm font-semibold text-text-primary">Meldinger</h3>
        <Link to="/teacher/messages" className="text-xs font-medium text-text-tertiary hover:text-text-secondary transition-colors">Se alle</Link>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1 flex flex-col">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center mx-2 my-2 rounded-2xl bg-gray-50/50">
            <div className="w-10 h-10 bg-white border border-border rounded-full flex items-center justify-center mb-3 shadow-sm">
              <MessageSquare className="w-4 h-4 text-text-tertiary" />
            </div>
            <p className="text-sm font-medium text-text-primary">Alt oppdatert</p>
            <p className="text-xs text-text-tertiary mt-1">Ingen nye henvendelser fra elever.</p>
          </div>
        ) : (
          messages.map((message) => (
          <div
            key={message.id}
            className="group flex items-center gap-3.5 p-3 rounded-3xl hover:bg-surface-elevated cursor-pointer transition-colors"
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
                  {message.sender.name.trim()
                    ? message.sender.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                    : '?'}
                </div>
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
