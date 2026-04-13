import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useAlertItems, type AlertItem } from '@/hooks/use-alert-items';

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
  alertItems: AlertItem[];
  dismissAllAlerts: () => void;
  dismissAlert: (id: string) => void;
};

const TeacherShellContext = createContext<TeacherShellContextValue | null>(null);

export function TeacherShellProvider({ children }: { children: ReactNode }) {
  const [breadcrumbs, setBreadcrumbs] = useState<TeacherShellCrumb[] | null>(null);
  const [action, setAction] = useState<TeacherShellAction | null>(null);
  const { alertItems, dismissAll, dismissOne } = useAlertItems();

  const value = useMemo(
    () => ({
      breadcrumbs,
      setBreadcrumbs,
      action,
      setAction,
      alertItems,
      dismissAllAlerts: dismissAll,
      dismissAlert: dismissOne,
    }),
    [action, breadcrumbs, alertItems, dismissAll, dismissOne]
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

export type { AlertItem };
