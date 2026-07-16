"use client"

import * as React from "react"
import { Popover as PopoverPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Popover({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />
}

function PopoverTrigger({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />
}

function PopoverContent({
  className,
  align = "center",
  sideOffset = 4,
  collisionPadding = 12,
  showOverlay = false,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content> & { showOverlay?: boolean }) {
  return (
    <>
      {/* Radix's Popover.Portal mounts its child with asChild (Slot), so it
          accepts EXACTLY one element child — content and overlay each need
          their own portal or React.Children.only throws on open. Both portals
          append to document.body in mount order (content first), so the
          peer-data-[state=closed] selector still sees the content as a
          preceding sibling; z-40 vs z-50 keeps the overlay visually beneath
          the content regardless of DOM order. */}
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          data-slot="popover-content"
          align={align}
          sideOffset={sideOffset}
          collisionPadding={collisionPadding}
          className={cn(
            "floating-motion peer z-50 flex w-72 origin-(--radix-popover-content-transform-origin) flex-col gap-4 rounded-xl border border-border bg-surface p-4 text-sm text-foreground outline-hidden",
            className
          )}
          {...props}
        />
      </PopoverPrimitive.Portal>
      {showOverlay && (
        <PopoverPrimitive.Portal>
          <div className="fixed inset-0 z-40 bg-foreground/20 animate-in fade-in-0 duration-100 peer-data-[state=closed]:animate-out peer-data-[state=closed]:fade-out-0" />
        </PopoverPrimitive.Portal>
      )}
    </>
  )
}

function PopoverAnchor({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Anchor>) {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />
}

function PopoverHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="popover-header"
      className={cn("flex flex-col gap-1.5 text-sm", className)}
      {...props}
    />
  )
}

function PopoverTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <div
      data-slot="popover-title"
      className={cn("text-balance font-medium", className)}
      {...props}
    />
  )
}

function PopoverDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="popover-description"
      className={cn("text-pretty text-foreground-muted", className)}
      {...props}
    />
  )
}

export {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
}
