import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface DirtyFormBarProps {
  /** Show the bar when true. Pass the form's `isDirty`. */
  visible: boolean
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

// Below this column width the single-row pill (hint + both buttons) no longer
// fits, so the hint text is dropped instead of wrapping under the label.
// Sized to the default labels with headroom; measured against the content
// column (not the viewport) so an open sidebar counts.
const COMPACT_COLUMN_WIDTH = 480

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
 * Save failures are NOT shown in the bar — the caller fires a `toast.error`
 * instead (the failed save leaves the form dirty, so the bar simply stays up
 * for a retry). This keeps the bar a fixed-shape action pill, never a surface
 * that grows to fit an error string.
 *
 * Visual model follows Vercel / Cal.com's floating pill — discoverable
 * chrome that signals "I'm separate from your content" without sprawling
 * across the page.
 *
 * Responsive: on columns too narrow for the single row the hint text is
 * dropped (buttons-only pill — never a mid-pill wrap); the region's
 * aria-label still announces it.
 */
export function DirtyFormBar({
  visible,
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

  // Keep the pill mounted through its exit instead of unmounting on the same
  // frame `visible` flips false, so save/Avbryt gets a real exit transition
  // instead of a hard cut. `open` drives a data-state that a CSS transition
  // (not a keyframe animation) reads — interruptible, so rapid dirty/clean
  // toggling retargets smoothly instead of restarting from scratch.
  const [shouldRender, setShouldRender] = useState(visible)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (visible) {
      setShouldRender(true)
      // Flip to "open" a frame after mount so the transition animates from
      // the closed base classes instead of starting already-open.
      const raf = requestAnimationFrame(() => setOpen(true))
      return () => cancelAnimationFrame(raf)
    }
    setOpen(false)
    const timeout = setTimeout(() => setShouldRender(false), 150)
    return () => clearTimeout(timeout)
  }, [visible])

  // On narrow columns the row can't hold hint + buttons, so the hint text is
  // dropped: a floating pill with Lagre/Avbryt is self-explanatory, and the
  // region's aria-label still announces it.
  const compact = box !== null && box.width < COMPACT_COLUMN_WIDTH

  return (
    <>
      {/* display:none anchor — out of flow (no layout slot), used only to read
          the parent column's box. */}
      <span ref={anchorRef} aria-hidden className="hidden" />
      {shouldRender && box && (
        <div
          role="region"
          aria-label={dirtyLabel}
          data-state={open ? "open" : "closed"}
          // Fixed vertically (overlay), but horizontally pinned to the center
          // of the measured content column, capped to its width.
          style={{ left: box.left + box.width / 2, maxWidth: box.width }}
          className={cn(
            // bottom clears the iOS home-indicator gesture area, same convention
            // as BookingBar / SheetFooter (env() needs viewport-fit=cover).
            "fixed bottom-[max(1.5rem,calc(env(safe-area-inset-bottom)+0.75rem))] z-40 w-fit -translate-x-1/2 text-foreground",
            // Capsule: rounded-full is concentric with the pill buttons inside
            // (20px button radius + 8px padding = half the bar's height), not a
            // near-miss card radius next to round buttons. Surface chrome is
            // bordered, not lifted (overlays are bordered — 2026-07-11).
            "flex items-center rounded-full border border-border bg-surface",
            // Never flex-wrap: an accidental wrap reads as broken (label top,
            // buttons bottom-right). The narrow column drops the hint instead.
            compact ? "p-2" : "gap-4 py-2 pr-2 pl-5",
            // Interruptible transition (not a keyframe animation) so it can
            // reverse mid-flight. Matches toast motion (slide-up + fade);
            // exit is faster than enter, matching the rest of the app.
            "opacity-0 translate-y-2 transition-[opacity,transform] duration-200 ease-out data-[state=closed]:duration-150",
            "data-[state=open]:opacity-100 data-[state=open]:translate-y-0",
            className,
          )}
        >
          {!compact && (
            <div className="min-w-0">
              <span className="text-sm font-medium text-foreground">
                {dirtyLabel}
              </span>
            </div>
          )}
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
