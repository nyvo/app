import { useEffect, useState } from 'react'
import { Popover as PopoverPrimitive } from 'radix-ui'
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import { cn } from '@/lib/utils'
import { Bell } from '@/lib/icons'
import { Button } from '@/components/ui/button'
import { useIsMobile } from '@/hooks/use-mobile'
import { useNotifications } from '@/hooks/use-notifications'
import { NotificationFeed } from './NotificationFeed'
import { NotificationLiveRegion } from './NotificationLiveRegion'

/**
 * Bell + popover (desktop) / Vaul drawer (mobile), mounted in the dashboard nav.
 *
 * Trigger: 36 px circular button with the Bell glyph. A single red dot
 * appears top-right whenever there are unseen notifications, and the bell
 * itself brightens from muted to foreground. One signal — "open me". Per-item
 * urgency (failed payments etc.) lives in the row ordering inside the
 * panel (action-required first), not on the bell. The dot clears on open via
 * `markSeenAll`.
 *
 * Panel: 380 × 520 max with internal scroll on desktop; bottom sheet on
 * mobile. On open we mark everything as seen (clears the bell dot) without
 * marking individual rows as read — row reads still require an explicit
 * click. See `seen_at` vs `read_at` in the migration header for rationale.
 */
export function NotificationsPopover() {
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)
  // Frozen at the instant the panel opens, before markSeenAll stamps seen_at.
  // Rows seen *before* this moment dim; anything seen during this session stays
  // highlighted and only dims on the next open. See NotificationRow.
  const [openedAt, setOpenedAt] = useState<string | null>(null)
  const {
    notifications,
    isLoading,
    error,
    unseenCount,
    markSeenAll,
    markRead,
    archive,
    archiveAll,
    refetch,
  } = useNotifications()

  // Capture the open timestamp synchronously, before the effect below stamps
  // seen_at — so dimming keys off the *previous* open, not this one.
  const handleOpenChange = (next: boolean) => {
    if (next) setOpenedAt(new Date().toISOString())
    setOpen(next)
  }

  // On panel open: clear the bell dot via seen_at. Row read state is
  // unchanged — owners still need to click a row to mark it read.
  useEffect(() => {
    if (open && unseenCount > 0) {
      void markSeenAll()
    }
  }, [open, unseenCount, markSeenAll])

  const handleActivate = (id: number) => {
    void markRead(id)
    setOpen(false)
  }

  const handleArchive = (notification: (typeof notifications)[number]) => {
    archive(notification)
  }

  const hasUnseen = unseenCount > 0

  const triggerButton = (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={hasUnseen ? 'Uleste varsler' : 'Varsler'}
      aria-haspopup="dialog"
      className={cn('relative', hasUnseen ? 'text-foreground' : 'text-foreground-muted')}
    >
      <Bell className="size-5" />
      {/* Always mounted, toggled via classes — interruptible fade/scale
          instead of a hard mount/unmount when unseenCount crosses 0. */}
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute right-2 top-2 size-2 rounded-full bg-primary ring-2 ring-background transition-[opacity,transform] duration-[120ms] ease-out',
          hasUnseen ? 'scale-100 opacity-100' : 'scale-50 opacity-0',
        )}
      />
    </Button>
  )

  // Header + feed are identical across surfaces. Only the wrapping
  // semantics change — Radix Popover on desktop, Vaul Drawer on mobile.
  const panelInner = (titleSlot: React.ReactNode) => (
    <>
      <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
        {titleSlot}
        {notifications.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={archiveAll}
            className="h-auto px-2 py-1 text-xs text-foreground-muted"
          >
            Fjern alle
          </Button>
        )}
      </div>

      <NotificationFeed
        notifications={notifications}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        openedAt={openedAt}
        onActivate={handleActivate}
        onArchive={handleArchive}
      />
    </>
  )

  if (isMobile) {
    return (
      <>
        <NotificationLiveRegion notifications={notifications} enabled={!open} />
        <Drawer open={open} onOpenChange={handleOpenChange}>
          <DrawerTrigger asChild>{triggerButton}</DrawerTrigger>
          <DrawerContent className="max-h-[85vh]">
            {panelInner(
              <DrawerTitle className="text-sm font-medium">Varsler</DrawerTitle>,
            )}
          </DrawerContent>
        </Drawer>
      </>
    )
  }

  return (
    <>
      <NotificationLiveRegion notifications={notifications} enabled={!open} />
      <PopoverPrimitive.Root open={open} onOpenChange={handleOpenChange}>
        <PopoverPrimitive.Trigger asChild>{triggerButton}</PopoverPrimitive.Trigger>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            align="end"
            sideOffset={8}
            aria-label="Varsler"
            className={cn(
              'z-50 flex max-h-[520px] w-[380px] origin-(--radix-popover-content-transform-origin) flex-col overflow-hidden rounded-xl border border-border bg-surface text-sm text-foreground outline-hidden duration-100',
              'data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95',
              'data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
              'data-[side=bottom]:slide-in-from-top-2',
            )}
          >
            {panelInner(<h2 className="text-sm font-medium">Varsler</h2>)}
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    </>
  )
}
