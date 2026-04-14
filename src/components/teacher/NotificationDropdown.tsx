import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTeacherShell } from '@/components/teacher/TeacherShellContext';

export function NotificationDropdown() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useTeacherShell();
  const [open, setOpen] = useState(false);
  const hasNotifications = notifications.length > 0;
  const hasUnread = unreadCount > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8 text-muted-foreground">
          <Bell className="h-4 w-4" />
          {hasUnread && (
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="type-label text-foreground">Varsler</p>
          {hasUnread && (
            <button
              onClick={() => markAllAsRead()}
              className="type-meta text-muted-foreground smooth-transition hover:text-foreground"
            >
              Marker alle som lest
            </button>
          )}
        </div>
        {hasNotifications ? (
          <ul role="list" className="max-h-80 overflow-y-auto">
            {notifications.map((item, index) => (
              <li key={item.id} className={index < notifications.length - 1 ? 'border-b border-border' : ''}>
                <div className="flex items-center">
                  <Link
                    to={item.link}
                    onClick={() => {
                      if (item.isUnread) markAsRead(item.id);
                      setOpen(false);
                    }}
                    className={`flex min-w-0 flex-1 items-center gap-3 py-3 pl-4 pr-2 outline-none smooth-transition hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset ${
                      item.isUnread ? '' : 'opacity-60'
                    }`}
                  >
                    <item.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className={`type-label-sm text-foreground ${item.isUnread ? '' : 'font-normal'}`}>{item.title}</p>
                      {item.body && (
                        <p className="type-meta text-muted-foreground">{item.body}</p>
                      )}
                    </div>
                    {item.isUnread && (
                      <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    )}
                  </Link>
                  <button
                    onClick={() => markAsRead(item.id)}
                    className="mr-2 flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground/50 smooth-transition hover:bg-surface-muted hover:text-muted-foreground"
                    aria-label="Marker som lest"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="type-body-sm text-muted-foreground px-4 py-8 text-center">
            Ingen varsler
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
