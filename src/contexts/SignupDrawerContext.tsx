import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { SignupDisplay } from '@/types/database';
import { SignupDetailDrawer } from '@/components/teacher/signups/SignupDetailDrawer';

// ---------------------------------------------------------------------------
// Single global drawer for participant/signup detail.
//
// Design rule: the app has exactly ONE drawer instance, mounted here at the
// teacher-shell level. Anywhere a SignupRow lives — Signups page, Course
// detail page, dashboard recent activity — it opens THIS drawer via the
// `useSignupDrawer()` hook. No per-feature drawers, no nesting.
//
// Callers pass:
//   * a SignupDisplay (already-projected display row, what they're rendering)
//   * an optional onMutate callback that refreshes the caller's local list
//     after an action (cancel / mark paid) so the row updates without a
//     full page refetch.
// ---------------------------------------------------------------------------

interface OpenOptions {
  /** Called after a successful action (cancel, mark paid) so the caller can
   *  refetch its list. Optional — for pages that don't need to reflect
   *  changes immediately. */
  onMutate?: () => void;
}

interface SignupDrawerContextValue {
  open: (signup: SignupDisplay, options?: OpenOptions) => void;
  close: () => void;
}

const SignupDrawerContext = createContext<SignupDrawerContextValue | null>(null);

export function SignupDrawerProvider({ children }: { children: ReactNode }) {
  const [signup, setSignup] = useState<SignupDisplay | null>(null);
  const [onMutate, setOnMutate] = useState<(() => void) | null>(null);

  const open = useCallback((next: SignupDisplay, options?: OpenOptions) => {
    setSignup(next);
    setOnMutate(() => options?.onMutate ?? null);
  }, []);

  const close = useCallback(() => {
    setSignup(null);
    setOnMutate(null);
  }, []);

  const value = useMemo(() => ({ open, close }), [open, close]);

  return (
    <SignupDrawerContext.Provider value={value}>
      {children}
      <SignupDetailDrawer
        signup={signup}
        onClose={close}
        onMutate={onMutate ?? undefined}
      />
    </SignupDrawerContext.Provider>
  );
}

/**
 * Open or close THE signup drawer from anywhere in the teacher shell.
 * Throws if called outside SignupDrawerProvider — provider lives in
 * TeacherLayout, so any component under the teacher routes is fine.
 */
export function useSignupDrawer(): SignupDrawerContextValue {
  const ctx = useContext(SignupDrawerContext);
  if (!ctx) {
    throw new Error('useSignupDrawer must be used inside SignupDrawerProvider');
  }
  return ctx;
}
