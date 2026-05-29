import { Info } from "@/lib/icons"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface DirtyFormBarProps {
  /** Show the bar when true. Pass `isDirty || !!saveError`. */
  visible: boolean
  /** Optional save error; takes precedence over the dirty hint. */
  error?: string | null
  isSaving: boolean
  onSave: () => void
  onCancel: () => void
  /** Default: "Lagre endringer". */
  saveLabel?: string
  /** Default: "Lagrer". */
  saveLoadingLabel?: string
  /** Default: "Avbryt". */
  cancelLabel?: string
  /** Default: "Du har ulagrede endringer". */
  dirtyLabel?: string
  /** Override the wrapper className if a page needs special offset. */
  className?: string
}

/**
 * Floating "unsaved changes" pill for multi-field forms. Fixed to the
 * bottom-center of the viewport so its position is independent of where it
 * sits in the JSX — drop it anywhere inside the form's tree. Renders only
 * when `visible` is true.
 *
 * Use this for: course settings (Rediger), studio settings, teacher profile,
 * and any other form where a sticky-footer dirty pattern applies. For
 * one-click optimistic actions (publish/unpublish/cancel) use the sonner
 * toast + `Angre` pattern instead.
 *
 * Visual model follows Vercel / Cal.com's floating pill — discoverable
 * chrome that signals "I'm separate from your content" without sprawling
 * across the page.
 */
export function DirtyFormBar({
  visible,
  error,
  isSaving,
  onSave,
  onCancel,
  saveLabel = "Lagre endringer",
  saveLoadingLabel = "Lagrer",
  cancelLabel = "Avbryt",
  dirtyLabel = "Du har ulagrede endringer",
  className,
}: DirtyFormBarProps) {
  if (!visible) return null

  return (
    <div
      role="region"
      aria-label={dirtyLabel}
      className={cn(
        // Floating: fixed to bottom-center of the viewport, capped width.
        "fixed bottom-6 left-1/2 z-40 w-fit max-w-[calc(100%-2rem)] -translate-x-1/2",
        // Surface chrome — light floating pill. Matches dialog's surface +
        // ring convention; matches toast's radius + shadow convention for
        // floating bottom chrome (see studio-design components.md § Toast).
        "flex items-center gap-4 rounded-2xl bg-surface py-2 pr-2 pl-5",
        "text-foreground ring-1 ring-foreground/10",
        "shadow-[0_10px_30px_-6px_rgb(0_0_0/0.22)]",
        // Slide-up entry. Matches toast motion (200ms slide-up + fade).
        "animate-in fade-in-0 slide-in-from-bottom-2 duration-200 ease-out",
        className,
      )}
    >
      <div className="min-w-0">
        {error ? (
          <span
            role="alert"
            className="inline-flex items-center gap-2 text-sm font-medium text-danger"
          >
            <Info className="size-4 shrink-0" aria-hidden="true" />
            {error}
          </span>
        ) : (
          <span className="text-sm font-medium text-foreground">
            {dirtyLabel}
          </span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button variant="secondary" onClick={onCancel} disabled={isSaving}>
          {cancelLabel}
        </Button>
        <Button
          onClick={onSave}
          loading={isSaving}
          loadingText={saveLoadingLabel}
        >
          {saveLabel}
        </Button>
      </div>
    </div>
  )
}
