import { useCallback, useEffect, useRef } from 'react';
import { useBlocker } from 'react-router-dom';
import type { BlockerFunction } from 'react-router-dom';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

/**
 * Guard for dirty forms (the DirtyFormBar pages + the course builder): blocks
 * in-app navigation while `when` is true and warns on tab close / reload via
 * beforeunload. Requires the data router (createBrowserRouter in App.tsx).
 *
 * Usage:
 *   const { blocker, bypass } = useUnsavedChanges(isDirty);
 *   ...
 *   <UnsavedChangesDialog blocker={blocker} />
 *
 * `bypass()` disarms the guard for the rest of the component's life. Call it
 * right before an *intentional* navigation while the form still reads dirty —
 * after a successful create/delete, or before signing the user out.
 */
export function useUnsavedChanges(when: boolean) {
  const bypassedRef = useRef(false);
  // The blocker callback must read fresh values without re-registering, so it
  // goes through refs rather than closing over `when`.
  const whenRef = useRef(when);
  whenRef.current = when;

  const blocker = useBlocker(
    useCallback<BlockerFunction>(
      ({ currentLocation, nextLocation }) =>
        whenRef.current &&
        !bypassedRef.current &&
        currentLocation.pathname !== nextLocation.pathname,
      [],
    ),
  );

  useEffect(() => {
    if (!when) return;
    const handler = (event: BeforeUnloadEvent) => {
      if (bypassedRef.current) return;
      event.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [when]);

  const bypass = useCallback(() => {
    bypassedRef.current = true;
  }, []);

  return { blocker, bypass };
}

export function UnsavedChangesDialog({
  blocker,
}: {
  blocker: ReturnType<typeof useUnsavedChanges>['blocker'];
}) {
  return (
    <ConfirmDialog
      open={blocker.state === 'blocked'}
      onOpenChange={(open) => {
        if (!open && blocker.state === 'blocked') blocker.reset();
      }}
      ariaLabel="Ulagrede endringer"
      title="Forlat siden?"
      body="Endringene dine er ikke lagret og går tapt hvis du forlater siden."
      actionLabel="Forlat siden"
      cancelLabel="Bli på siden"
      destructive
      onConfirm={() => {
        if (blocker.state === 'blocked') blocker.proceed();
      }}
    />
  );
}
