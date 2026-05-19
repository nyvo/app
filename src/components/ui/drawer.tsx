"use client"

import * as React from "react"
import { Drawer as DrawerPrimitive } from "vaul"

import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Drawer — Vaul bottom-sheet primitive, tuned for Studio.
//
// Used as the mobile counterpart to <AlertDialog> inside <ConfirmDialog>.
// The sheet slides up from the bottom edge, hugs the screen there, and is
// dismissed by drag-down (when dismissible) or via the explicit buttons in
// its footer. For destructive flows, pass dismissible={false} on Root so the
// user can't fling the sheet away by accident.
//
// Styling: rounded-t-xl, bg-surface, subtle grab handle, no shadow (sheet sits
// on the bottom edge — shadow is unnecessary and reads as artifact).
// ---------------------------------------------------------------------------

const Drawer = DrawerPrimitive.Root
const DrawerTrigger = DrawerPrimitive.Trigger
const DrawerClose = DrawerPrimitive.Close
const DrawerPortal = DrawerPrimitive.Portal

function DrawerOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Overlay>) {
  return (
    <DrawerPrimitive.Overlay
      data-slot="drawer-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-foreground/40 supports-backdrop-filter:backdrop-blur-sm",
        className
      )}
      {...props}
    />
  )
}

function DrawerContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Content>) {
  return (
    <DrawerPortal>
      <DrawerOverlay />
      <DrawerPrimitive.Content
        data-slot="drawer-content"
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 mt-24 flex flex-col rounded-t-xl bg-surface text-foreground outline-none",
          className
        )}
        {...props}
      >
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-border" />
        {children}
      </DrawerPrimitive.Content>
    </DrawerPortal>
  )
}

function DrawerTitle({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Title>) {
  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
      className={cn("text-lg font-medium tracking-tight text-foreground", className)}
      {...props}
    />
  )
}

function DrawerDescription({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Description>) {
  return (
    <DrawerPrimitive.Description
      data-slot="drawer-description"
      className={cn("text-sm text-foreground-muted", className)}
      {...props}
    />
  )
}

export {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerOverlay,
  DrawerPortal,
  DrawerTitle,
  DrawerTrigger,
}
