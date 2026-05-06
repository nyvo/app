import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

// Removed 2026-04-25: in-app notification dropdown system (notifications +
// notification_reads tables, useNotifications hook, NotificationDropdown
// component). Updates are tracked on the dashboard's RecentActivityCard now.

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
  topBarSlot: ReactNode;
  setTopBarSlot: (slot: ReactNode) => void;
};

const TeacherShellContext = createContext<TeacherShellContextValue | null>(null);

export function TeacherShellProvider({ children }: { children: ReactNode }) {
  const [breadcrumbs, setBreadcrumbs] = useState<TeacherShellCrumb[] | null>(null);
  const [action, setAction] = useState<TeacherShellAction | null>(null);
  const [topBarSlot, setTopBarSlot] = useState<ReactNode>(null);

  const value = useMemo(
    () => ({
      breadcrumbs,
      setBreadcrumbs,
      action,
      setAction,
      topBarSlot,
      setTopBarSlot,
    }),
    [action, breadcrumbs, topBarSlot],
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
