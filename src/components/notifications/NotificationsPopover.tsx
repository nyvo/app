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
import { useIsMobile } from '@/hooks/use-mobile'
import { useNotifications } from '@/hooks/use-notifications'
import { NotificationFeed } from './NotificationFeed'
import { NotificationLiveRegion } from './NotificationLiveRegion'

/**
 * Bell + popover (desktop) / Vaul drawer (mobile), mounted in the dashboard nav.
 *
 * Trigger: 36 px circular button with the Bell glyph. A small dot appears
 * top-right when there's anything unseen — sand-12 by default, amber-11
 * when an unresolved action_required item exists. Precedence is computed
 * once in `useNotifications` so bell, ARIA label, and any future surface
 * stay in sync.
 *
 * Panel: 380 × 520 max with internal scroll on desktop; bottom sheet on
 * mobile. On open we mark everything as seen (clears the bell dot) without
 * marking individual rows as read — row reads still require an explicit
 * click. See `seen_at` vs `read_at` in the migration header for rationale.
 */
export function NotificationsPopover() {
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)
  const {
    notifications,
    isLoading,
    unseenCount,
    unreadCount,
    bellState,
    markSeenAll,
    markRead,
    markAllRead,
  } = useNotifications()

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

  const handleMarkAllRead = () => {
    void markAllRead()
  }

  const dotColor =
    bellState === 'action'
      ? 'bg-warning'
      : bellState === 'unread'
        ? 'bg-foreground'
        : null

  const ariaLabel =
    bellState === 'action'
      ? 'Varsler, krever handling'
      : bellState === 'unread'
        ? 'Varsler, uleste'
        : 'Varsler'

  const triggerButton = (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-haspopup="dialog"
      className="relative inline-flex size-9 shrink-0 items-center justify-center rounded-full text-foreground-muted outline-none transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-foreground/15 data-[state=open]:bg-muted data-[state=open]:text-foreground"
    >
      <Bell className="size-5" />
      {dotColor && (
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute right-2 top-2 size-1.5 rounded-full ring-2 ring-background',
            dotColor,
          )}
        />
      )}
    </button>
  )

  // Header + feed are identical across surfaces. Only the wrapping
  // semantics change — Radix Popover on desktop, Vaul Drawer on mobile.
  const panelInner = (titleSlot: React.ReactNode) => (
    <>
      <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
        {titleSlot}
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="rounded-full px-2 py-1 text-xs text-foreground-muted transition-colors hover:bg-muted hover:text-foreground"
          >
            Marker alle som lest
          </button>
        )}
      </div>

      <NotificationFeed
        notifications={notifications}
        isLoading={isLoading}
        onActivate={handleActivate}
      />
    </>
  )

  if (isMobile) {
    return (
      <>
        <NotificationLiveRegion notifications={notifications} enabled={!open} />
        <Drawer open={open} onOpenChange={setOpen}>
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
      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        <PopoverPrimitive.Trigger asChild>{triggerButton}</PopoverPrimitive.Trigger>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            align="end"
            sideOffset={8}
            aria-label="Varsler"
            className={cn(
              'z-50 flex max-h-[520px] w-[380px] origin-(--radix-popover-content-transform-origin) flex-col overflow-hidden rounded-xl bg-surface text-sm text-foreground shadow-md ring-1 ring-foreground/10 outline-hidden duration-100',
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
