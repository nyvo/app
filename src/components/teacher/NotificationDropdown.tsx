import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CircleAlert, TriangleAlert, CircleCheck, X } from '@/lib/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTeacherShell } from '@/components/teacher/TeacherShellContext';
import type { Notification, NotificationSeverity } from '@/hooks/use-notifications';

const SEVERITY_STYLES: Record<NotificationSeverity, {
  card: string;
  icon: string;
  Icon: typeof CircleAlert;
}> = {
  danger: {
    card: 'bg-destructive/10 border-destructive/20',
    icon: 'text-destructive',
    Icon: CircleAlert,
  },
  warning: {
    card: 'bg-warning/10 border-warning/20',
    icon: 'text-warning',
    Icon: TriangleAlert,
  },
  success: {
    card: 'bg-success/10 border-success/20',
    icon: 'text-success',
    Icon: CircleCheck,
  },
  neutral: {
    card: 'bg-info/10 border-info/20',
    icon: 'text-info',
    Icon: Bell,
  },
};

interface GroupedNotification {
  key: string;
  representative: Notification;
  ids: string[];
  count: number;
}

function groupNotifications(notifications: Notification[]): GroupedNotification[] {
  const groups = new Map<string, GroupedNotification>();

  for (const n of notifications) {
    const key = n.groupKey || (n.type === 'unread_message' ? 'unread_messages' : n.id);
    const existing = groups.get(key);
    if (existing) {
      existing.ids.push(n.id);
      existing.count++;
    } else {
      groups.set(key, {
        key,
        representative: n,
        ids: [n.id],
        count: 1,
      });
    }
  }

  return [...groups.values()];
}

export function NotificationDropdown() {
  const { notifications, dismiss, dismissAll } = useTeacherShell();
  const [open, setOpen] = useState(false);
  const [dismissingAll, setDismissingAll] = useState(false);
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set());
  const hasNotifications = notifications.length > 0;

  const grouped = useMemo(() => groupNotifications(notifications), [notifications]);

  const visibleGroups = grouped.filter((g) => !hiddenKeys.has(g.key));

  const handleDismissAll = () => {
    if (dismissingAll) return;
    setDismissingAll(true);

    const reversed = [...visibleGroups].reverse();
    reversed.forEach((group, i) => {
      setTimeout(() => {
        setHiddenKeys((prev) => new Set(prev).add(group.key));
      }, i * 150);
    });

    setTimeout(() => {
      dismissAll();
      setHiddenKeys(new Set());
      setDismissingAll(false);
    }, reversed.length * 150 + 300);
  };

  const handleDismissGroup = (group: GroupedNotification) => {
    for (const id of group.ids) {
      dismiss(id);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative size-8 text-muted-foreground">
          <Bell className="size-4" />
          {hasNotifications && (
            <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-accent" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-base font-semibold text-foreground">Varsler</p>
          {hasNotifications && (
            <button
              onClick={handleDismissAll}
              disabled={dismissingAll}
              className="text-xs font-medium tracking-wide text-muted-foreground smooth-transition hover:text-foreground disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded"
            >
              Fjern alle
            </button>
          )}
        </div>
        {hasNotifications ? (
          <div className="max-h-80 space-y-2 overflow-y-auto p-3">
            <AnimatePresence mode="popLayout">
              {visibleGroups.map((group, index) => {
                const styles = SEVERITY_STYLES[group.representative.severity];
                const SeverityIcon = styles.Icon;

                return (
                  <motion.div
                    key={group.key}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{
                      duration: 0.2,
                      ease: [0.23, 1, 0.32, 1],
                      delay: index * 0.04,
                    }}
                    className="relative flex items-center gap-2"
                  >
                    <Link
                      to={group.representative.link}
                      onClick={() => setOpen(false)}
                      className={`flex min-w-0 flex-1 items-start gap-3 rounded-lg border px-3 py-2.5 outline-none smooth-transition hover:opacity-80 ${styles.card}`}
                    >
                      <SeverityIcon className={`mt-0.5 size-3.5 shrink-0 ${styles.icon}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-medium text-foreground truncate">{group.representative.title}</p>
                          {group.count > 1 && (
                            <Badge variant="secondary" className="shrink-0 rounded-full px-1.5 py-0 text-xxs">
                              {group.count}
                            </Badge>
                          )}
                        </div>
                        {group.representative.body && (
                          <p className="text-xs text-muted-foreground">{group.representative.body}</p>
                        )}
                      </div>
                    </Link>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleDismissGroup(group);
                      }}
                      className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-[transform,color] duration-150 ease-out hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                      aria-label="Fjern varsel"
                    >
                      <X className="size-3.5 stroke-[2.5]" />
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 py-8 text-center">
            <p className="text-sm font-medium text-foreground">Ingen varsler</p>
            <p className="text-xs text-muted-foreground">Du er oppdatert.</p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
