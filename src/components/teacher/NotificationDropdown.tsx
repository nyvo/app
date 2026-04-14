import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CircleAlert, TriangleAlert, CircleCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTeacherShell } from '@/components/teacher/TeacherShellContext';
import type { NotificationSeverity } from '@/hooks/use-notifications';

const SEVERITY_STYLES: Record<NotificationSeverity, {
  card: string;
  icon: string;
  dot: string;
  Icon: typeof CircleAlert;
}> = {
  danger: {
    card: 'bg-status-error-bg border-status-error-border',
    icon: 'text-status-error-text',
    dot: 'bg-status-error-text',
    Icon: CircleAlert,
  },
  warning: {
    card: 'bg-status-warning-bg border-status-warning-border',
    icon: 'text-status-warning-text',
    dot: 'bg-status-warning-text',
    Icon: TriangleAlert,
  },
  success: {
    card: 'bg-status-confirmed-bg border-status-confirmed-border',
    icon: 'text-status-confirmed-text',
    dot: 'bg-status-confirmed-text',
    Icon: CircleCheck,
  },
  neutral: {
    card: 'bg-status-info-bg border-status-info-border',
    icon: 'text-status-info-text',
    dot: 'bg-status-info-text',
    Icon: Bell,
  },
};

export function NotificationDropdown() {
  const { notifications, dismiss, dismissAll } = useTeacherShell();
  const [open, setOpen] = useState(false);
  const [dismissingAll, setDismissingAll] = useState(false);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const hasNotifications = notifications.length > 0;

  const topSeverity = notifications[0]?.severity ?? 'neutral';
  const bellDotColor = SEVERITY_STYLES[topSeverity].dot;

  const visibleNotifications = notifications.filter((n) => !hiddenIds.has(n.id));

  const handleDismissAll = () => {
    if (dismissingAll) return;
    setDismissingAll(true);

    // Stagger hide from bottom to top
    const reversed = [...notifications].reverse();
    reversed.forEach((item, i) => {
      setTimeout(() => {
        setHiddenIds((prev) => new Set(prev).add(item.id));
      }, i * 150);
    });

    // After all are hidden, actually dismiss in DB and clean up
    setTimeout(() => {
      dismissAll();
      setHiddenIds(new Set());
      setDismissingAll(false);
    }, reversed.length * 150 + 300);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8 text-muted-foreground">
          <Bell className="h-4 w-4" />
          {hasNotifications && (
            <span className={`absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full ${bellDotColor}`} />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="type-label text-foreground">Varsler</p>
          {hasNotifications && (
            <button
              onClick={handleDismissAll}
              disabled={dismissingAll}
              className="type-meta text-muted-foreground smooth-transition hover:text-foreground active:scale-[0.97] disabled:opacity-50"
            >
              Fjern alle
            </button>
          )}
        </div>
        {hasNotifications ? (
          <div className="max-h-80 space-y-2 overflow-y-auto p-3">
            <AnimatePresence mode="popLayout">
              {visibleNotifications.map((item, index) => {
                const styles = SEVERITY_STYLES[item.severity];
                const SeverityIcon = styles.Icon;

                return (
                  <motion.div
                    key={item.id}
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
                      to={item.link}
                      onClick={() => setOpen(false)}
                      className={`flex min-w-0 flex-1 items-start gap-3 rounded-lg border px-3 py-2.5 outline-none smooth-transition hover:opacity-80 ${styles.card}`}
                    >
                      <SeverityIcon className={`mt-0.5 h-4 w-4 shrink-0 ${styles.icon}`} />
                      <div className="min-w-0">
                        <p className="type-label-sm text-foreground">{item.title}</p>
                        {item.body && (
                          <p className="type-meta text-muted-foreground">{item.body}</p>
                        )}
                      </div>
                    </Link>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        dismiss(item.id);
                      }}
                      className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-[transform,color] duration-150 ease-out hover:text-foreground active:scale-[0.9]"
                      aria-label="Fjern varsel"
                    >
                      <X className="h-3.5 w-3.5 stroke-[2.5]" />
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <p className="type-body-sm text-muted-foreground px-4 py-8 text-center">
            Ingen varsler
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
