import { useEffect, useLayoutEffect, useRef, useState } from "react"
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
            "fixed bottom-[max(1.5rem,calc(env(safe-area-inset-bottom)+0.75rem))] z-40 w-fit -translate-x-1/2",
            // Surface chrome — light floating pill. Matches dialog's surface +
            // border convention (overlays are bordered, not lifted — 2026-07-11).
            // flex-wrap: on narrow columns the button pair drops under the label
            // instead of clipping at the pill's maxWidth.
            "flex flex-wrap items-center justify-end gap-x-4 gap-y-2 rounded-2xl border border-border bg-surface py-2 pr-2 pl-5",
            "text-foreground",
            // Interruptible transition (not a keyframe animation) so it can
            // reverse mid-flight. Matches toast motion (slide-up + fade);
            // exit is faster than enter, matching the rest of the app.
            "opacity-0 translate-y-2 transition-[opacity,transform] duration-200 ease-out data-[state=closed]:duration-150",
            "data-[state=open]:opacity-100 data-[state=open]:translate-y-0",
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
