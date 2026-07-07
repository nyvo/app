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

// ---------------------------------------------------------------------------
// runWithRevert — Tier 1 for *reversible* one-click actions (unpublish).
//
// Unlike runWithUndo (delay-commit), the action commits immediately — the
// state flip must be truthful right away — and the toast's "Angre" fires a
// compensating call that flips it back. Use runWithUndo for deletes where the
// call can safely wait out the toast; use this when the flip itself is cheap
// to reverse with a second call.
// ---------------------------------------------------------------------------

export interface RunWithRevertOptions {
  /** Toast title after the commit lands (e.g. "Kurset er lagret som utkast"). */
  message: string
  /** Optimistically apply the state flip in the UI. Called immediately. */
  apply: () => void
  /** Restore the previous UI state. Called on commit failure or Angre. */
  revert: () => void
  /** Network call performing the action. Fires immediately. */
  commit: () => Promise<{ error: unknown }>
  /** Compensating network call fired when the user clicks Angre. */
  undo: () => Promise<{ error: unknown }>
  /** Maps a commit failure to toast copy. */
  commitErrorMessage: (error: unknown) => string
  /** Maps an undo failure to toast copy. */
  undoErrorMessage: (error: unknown) => string
  /** Override the 6s default. Clamp 3000–10000. */
  durationMs?: number
}

export async function runWithRevert({
  message,
  apply,
  revert,
  commit,
  undo,
  commitErrorMessage,
  undoErrorMessage,
  durationMs = DEFAULT_UNDO_MS,
}: RunWithRevertOptions): Promise<void> {
  const duration = Math.min(10_000, Math.max(3_000, durationMs))

  apply()
  let commitError: unknown
  try {
    commitError = (await commit()).error
  } catch (err) {
    commitError = err
  }
  if (commitError) {
    revert()
    toast.error(commitErrorMessage(commitError))
    return
  }

  toast.success(message, {
    duration,
    action: {
      label: 'Angre',
      onClick: async () => {
        revert()
        let undoError: unknown
        try {
          undoError = (await undo()).error
        } catch (err) {
          undoError = err
        }
        if (undoError) {
          apply()
          toast.error(undoErrorMessage(undoError))
        }
      },
    },
  })
}

export function runWithUndo<T>({
  message,
  hide,
  restore,
  commit,
  errorOf,
  errorMessage = 'Noe gikk galt – prøv igjen',
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
