import { useLayoutEffect, useRef, useState } from "react"
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
 * Floating "unsaved changes" pill for multi-field forms. Pinned to the bottom
 * of the viewport (overlay — always reachable without scrolling), but centered
 * horizontally over its *content column* rather than the whole viewport: a
 * hidden anchor measures the parent column so the pill lines up with the form
 * regardless of max-width, centered/left alignment, or sidebar state. A
 * ResizeObserver keeps it aligned when the sidebar collapses or the window
 * resizes. Drop it as the last child inside the form's content container.
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
  // Hidden anchor lets us measure the content column the bar lives in, so the
  // viewport-fixed pill can be centered over the *content* (not the viewport).
  const anchorRef = useRef<HTMLSpanElement>(null)
  const [box, setBox] = useState<{ left: number; width: number } | null>(null)

  useLayoutEffect(() => {
    const column = anchorRef.current?.parentElement
    if (!column) return
    const measure = () => {
      const r = column.getBoundingClientRect()
      setBox({ left: r.left, width: r.width })
    }
    measure()
    // Re-measure on layout shifts: sidebar collapse, window resize, content
    // reflow. ResizeObserver on the column catches the width/position changes.
    const ro = new ResizeObserver(measure)
    ro.observe(column)
    window.addEventListener("resize", measure)
    return () => {
      ro.disconnect()
      window.removeEventListener("resize", measure)
    }
  }, [])

  return (
    <>
      {/* display:none anchor — out of flow (no layout slot), used only to read
          the parent column's box. */}
      <span ref={anchorRef} aria-hidden className="hidden" />
      {visible && box && (
        <div
          role="region"
          aria-label={dirtyLabel}
          // Fixed vertically (overlay), but horizontally pinned to the center
          // of the measured content column, capped to its width.
          style={{ left: box.left + box.width / 2, maxWidth: box.width }}
          className={cn(
            "fixed bottom-6 z-40 w-fit -translate-x-1/2",
            // Surface chrome — light floating pill. Matches dialog's surface +
            // ring convention; matches toast's radius + shadow convention for
            // floating bottom chrome (see studio-design components.md § Toast).
            "flex items-center gap-4 rounded-2xl bg-surface py-2 pr-2 pl-5",
            "text-foreground",
            "shadow-float",
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
      )}
    </>
  )
}
