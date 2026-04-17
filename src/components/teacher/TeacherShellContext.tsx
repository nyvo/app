import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNotifications, type Notification } from '@/hooks/use-notifications';
import { useAuth } from '@/contexts/AuthContext';
import { getUnreadCount } from '@/services/messages';

export type TeacherShellCrumb = {
  label: string;
  to?: string;
};

export type TeacherShellAction = {
  label: string;
  to: string;
};

type TeacherShellContextValue = {
  breadcrumbs: TeacherShellCrumb[] | null;
  setBreadcrumbs: (breadcrumbs: TeacherShellCrumb[] | null) => void;
  action: TeacherShellAction | null;
  setAction: (action: TeacherShellAction | null) => void;
  notifications: Notification[];
  unreadCount: number;
  dismiss: (id: string) => Promise<void>;
  dismissAll: () => Promise<void>;
  unreadMessages: number;
  refreshUnreadMessages: () => void;
};

const TeacherShellContext = createContext<TeacherShellContextValue | null>(null);

export function TeacherShellProvider({ children }: { children: ReactNode }) {
  const [breadcrumbs, setBreadcrumbs] = useState<TeacherShellCrumb[] | null>(null);
  const [action, setAction] = useState<TeacherShellAction | null>(null);
  const { notifications, unreadCount, dismiss, dismissAll } = useNotifications();
  const { currentOrganization } = useAuth();

  const [unreadMessages, setUnreadMessages] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshUnreadMessages = useCallback(async () => {
    if (!currentOrganization?.id) return;
    const { data } = await getUnreadCount(currentOrganization.id);
    setUnreadMessages(data);
  }, [currentOrganization?.id]);

  useEffect(() => {
    refreshUnreadMessages();
    intervalRef.current = setInterval(refreshUnreadMessages, 30_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refreshUnreadMessages]);

  const value = useMemo(
    () => ({
      breadcrumbs,
      setBreadcrumbs,
      action,
      setAction,
      notifications,
      unreadCount,
      dismiss,
      dismissAll,
      unreadMessages,
      refreshUnreadMessages,
    }),
    [action, breadcrumbs, notifications, unreadCount, dismiss, dismissAll, unreadMessages, refreshUnreadMessages]
  );

  return (
    <TeacherShellContext.Provider value={value}>
      {children}
    </TeacherShellContext.Provider>
  );
}

export function useTeacherShell() {
  const context = useContext(TeacherShellContext);

  if (!context) {
    throw new Error('useTeacherShell must be used within TeacherShellProvider.');
  }

  return context;
}

export type { Notification };
export type { NotificationSeverity } from '@/hooks/use-notifications';
