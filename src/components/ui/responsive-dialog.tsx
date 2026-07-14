"use client"

import * as React from "react"

import { useIsMobile } from "@/hooks/use-mobile"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// ResponsiveDialog — centered Dialog on desktop, vaul bottom sheet under 768px.
//
// Same split as ConfirmDialog/NotificationsPopover (the sanctioned pattern):
// on phones a centered modal floats awkwardly and drag-to-dismiss is lost, so
// the content rides in a bottom drawer instead. The API mirrors dialog.tsx
// one-to-one, so migrating a consumer is an import swap plus tag rename —
// desktop rendering is byte-identical (the desktop branch IS dialog.tsx).
//
// The drawer branch has no absolute X button (drag handle + scrim tap dismiss,
// vaul convention); keep footers/actions inside the content as usual.
// ---------------------------------------------------------------------------

const ResponsiveDialogContext = React.createContext(false)

function ResponsiveDialog({
  ...props
}: React.ComponentProps<typeof Dialog> & React.ComponentProps<typeof Drawer>) {
  const isMobile = useIsMobile()
  const Root = isMobile ? Drawer : Dialog
  return (
    <ResponsiveDialogContext.Provider value={isMobile}>
      <Root data-slot="responsive-dialog" {...props} />
    </ResponsiveDialogContext.Provider>
  )
}

function ResponsiveDialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogTrigger>) {
  const isMobile = React.useContext(ResponsiveDialogContext)
  const Trigger = isMobile ? DrawerTrigger : DialogTrigger
  return <Trigger data-slot="responsive-dialog-trigger" {...props} />
}

function ResponsiveDialogClose({
  ...props
}: React.ComponentProps<typeof DialogClose>) {
  const isMobile = React.useContext(ResponsiveDialogContext)
  const Close = isMobile ? DrawerClose : DialogClose
  return <Close data-slot="responsive-dialog-close" {...props} />
}

function ResponsiveDialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogContent> & {
  showCloseButton?: boolean
}) {
  const isMobile = React.useContext(ResponsiveDialogContext)
  if (isMobile) {
    return (
      <DrawerContent {...props}>
        {/* Mirrors DialogContent's inner layout (grid gap-6 p-6) so children
            written for the dialog lay out identically; scrolls under the
            drawer's max-h with the footer riding along, and clears the home
            indicator. */}
        <div
          className={cn(
            "grid gap-6 overflow-y-auto p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]",
            className
          )}
        >
          {children}
        </div>
      </DrawerContent>
    )
  }
  return (
    <DialogContent className={className} showCloseButton={showCloseButton} {...props}>
      {children}
    </DialogContent>
  )
}

function ResponsiveDialogHeader({
  className,
  ...props
}: React.ComponentProps<typeof DialogHeader>) {
  const isMobile = React.useContext(ResponsiveDialogContext)
  if (isMobile) {
    // Same stack as DialogHeader minus pr-10 — there's no absolute X to clear.
    return (
      <div
        data-slot="responsive-dialog-header"
        className={cn("flex flex-col gap-2", className)}
        {...props}
      />
    )
  }
  return <DialogHeader className={className} {...props} />
}

function ResponsiveDialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<typeof DialogFooter>) {
  const isMobile = React.useContext(ResponsiveDialogContext)
  if (isMobile) {
    // DialogFooter's optional "Lukk" uses DialogPrimitive.Close, which has no
    // Radix context on the drawer path — recreate it with DrawerClose.
    return (
      <div
        data-slot="responsive-dialog-footer"
        className={cn("flex gap-2 [&>*]:flex-1", className)}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DrawerClose asChild>
            <Button variant="default" size="lg">Lukk</Button>
          </DrawerClose>
        )}
      </div>
    )
  }
  return (
    <DialogFooter className={className} showCloseButton={showCloseButton} {...props}>
      {children}
    </DialogFooter>
  )
}

function ResponsiveDialogTitle({
  ...props
}: React.ComponentProps<typeof DialogTitle>) {
  const isMobile = React.useContext(ResponsiveDialogContext)
  const Title = isMobile ? DrawerTitle : DialogTitle
  return <Title data-slot="responsive-dialog-title" {...props} />
}

function ResponsiveDialogDescription({
  ...props
}: React.ComponentProps<typeof DialogDescription>) {
  const isMobile = React.useContext(ResponsiveDialogContext)
  const Description = isMobile ? DrawerDescription : DialogDescription
  return <Description data-slot="responsive-dialog-description" {...props} />
}

export {
  ResponsiveDialog,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
}
