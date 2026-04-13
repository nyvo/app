import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTeacherShell } from '@/components/teacher/TeacherShellContext';

export function NotificationDropdown() {
  const { alertItems, dismissAllAlerts, dismissAlert } = useTeacherShell();
  const [open, setOpen] = useState(false);
  const hasAlerts = alertItems.length > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8 text-muted-foreground">
          <Bell className="h-4 w-4" />
          {hasAlerts && (
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="type-label text-foreground">Varsler</p>
          {hasAlerts && (
            <button
              onClick={dismissAllAlerts}
              className="type-meta text-muted-foreground smooth-transition hover:text-foreground"
            >
              Fjern alle
            </button>
          )}
        </div>
        {hasAlerts ? (
          <ul role="list">
            {alertItems.map((item, index) => (
              <li key={item.id} className={index < alertItems.length - 1 ? 'border-b border-border' : ''}>
                <div className="flex items-center">
                  <Link
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-4 pr-2 outline-none smooth-transition hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset"
                  >
                    <item.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="type-label-sm text-foreground">{item.label}</p>
                      {item.sublabel && (
                        <p className="type-meta text-muted-foreground">{item.sublabel}</p>
                      )}
                    </div>
                  </Link>
                  <button
                    onClick={() => dismissAlert(item.id)}
                    className="mr-2 flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground/50 smooth-transition hover:bg-surface-muted hover:text-muted-foreground"
                    aria-label="Fjern varsel"
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
