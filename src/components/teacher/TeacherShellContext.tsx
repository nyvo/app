import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useNotifications, type Notification } from '@/hooks/use-notifications';

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
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
};

const TeacherShellContext = createContext<TeacherShellContextValue | null>(null);

export function TeacherShellProvider({ children }: { children: ReactNode }) {
  const [breadcrumbs, setBreadcrumbs] = useState<TeacherShellCrumb[] | null>(null);
  const [action, setAction] = useState<TeacherShellAction | null>(null);
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  const value = useMemo(
    () => ({
      breadcrumbs,
      setBreadcrumbs,
      action,
      setAction,
      notifications,
      unreadCount,
      markAsRead,
      markAllAsRead,
    }),
    [action, breadcrumbs, notifications, unreadCount, markAsRead, markAllAsRead]
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
