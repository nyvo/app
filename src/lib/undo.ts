import { toast } from 'sonner'

// ---------------------------------------------------------------------------
// runWithUndo — Tier 1 destructive UX per studio-design § 12.
//
// Pattern: delay-commit (Gmail "Undo Send"). The UI hides the row instantly,
// a Sonner toast appears with "Angre". The actual network call is deferred
// until the toast expires. If the user clicks Angre inside the window, the
// row is restored and the network call never fires.
//
// Why delay-commit instead of soft-delete:
//   - No DB migration required (no deleted_at columns, no undelete RPCs)
//   - The action *truly* didn't happen — auditable, no row to clean up
//   - Matches Linear / Notion behavior for low-stakes deletes
//
// Caveats:
//   - If the user closes the tab inside the 6s window, the commit fires only
//     if the network call has time to land. For low-stakes flows (location,
//     team member), losing the delete on tab-close is acceptable: it's the
//     same as not having clicked at all.
//   - For higher-stakes flows, use Tier 2 (ConfirmDialog) instead.
// ---------------------------------------------------------------------------

const DEFAULT_UNDO_MS = 6000

export interface RunWithUndoOptions<T> {
  /** Toast title shown after the user clicks delete (e.g. "Stedet er slettet"). */
  message: string
  /** Optimistically hide the row in the UI. Called immediately. */
  hide: () => void
  /** Restore the row in the UI. Called on Angre click or on commit failure. */
  restore: () => void
  /** Async network call that performs the actual delete. Fires after the undo window. */
  commit: () => Promise<T>
  /** Returns an error from the commit result, or null if it succeeded. */
  errorOf?: (result: T) => unknown
  /** Fallback error toast text if commit fails. */
  errorMessage?: string
  /** Override the 6s default if a flow needs a longer window. Clamp 3000–10000. */
  durationMs?: number
}

export function runWithUndo<T>({
  message,
  hide,
  restore,
  commit,
  errorOf,
  errorMessage = 'Noe gikk galt. Prøv igjen.',
  durationMs = DEFAULT_UNDO_MS,
}: RunWithUndoOptions<T>): void {
  const duration = Math.min(10_000, Math.max(3_000, durationMs))
  let undone = false

  hide()

  const timer = setTimeout(async () => {
    if (undone) return
    try {
      const result = await commit()
      const error = errorOf ? errorOf(result) : null
      if (error) {
        restore()
        toast.error(errorMessage)
      }
    } catch {
      restore()
      toast.error(errorMessage)
    }
  }, duration)

  toast(message, {
    duration,
    action: {
      label: 'Angre',
      onClick: () => {
        undone = true
        clearTimeout(timer)
        restore()
      },
    },
  })
}
