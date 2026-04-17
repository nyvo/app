import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Tabs as TabsPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

/* ------------------------------------------------------------------ */
/*  Context – passes the list variant down to triggers                */
/* ------------------------------------------------------------------ */

type TabsVariant = "default" | "contained" | "line"

const TabsVariantContext = React.createContext<TabsVariant>("default")

/* ------------------------------------------------------------------ */
/*  Tabs (root)                                                       */
/* ------------------------------------------------------------------ */

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        "group/tabs flex gap-2 data-horizontal:flex-col",
        className
      )}
      {...props}
    />
  )
}

/* ------------------------------------------------------------------ */
/*  TabsList                                                          */
/* ------------------------------------------------------------------ */

const tabsListVariants = cva(
  "group/tabs-list inline-flex w-fit items-center justify-center rounded-lg text-muted-foreground group-data-horizontal/tabs:h-9 group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col",
  {
    variants: {
      variant: {
        default: "bg-muted p-[3px]",
        contained: "bg-muted border border-input p-0 gap-0",
        line: "gap-1 bg-transparent rounded-none p-[3px]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  return (
    <TabsVariantContext.Provider value={variant ?? "default"}>
      <TabsPrimitive.List
        data-slot="tabs-list"
        data-variant={variant}
        className={cn(tabsListVariants({ variant }), className)}
        {...props}
      />
    </TabsVariantContext.Provider>
  )
}

/* ------------------------------------------------------------------ */
/*  TabsTrigger                                                       */
/* ------------------------------------------------------------------ */

/* Base styles shared by every variant */
const triggerBase =
  "relative inline-flex items-center justify-center font-medium whitespace-nowrap outline-none select-none cursor-pointer focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"

/* Default & line: the original shadcn trigger */
const triggerDefault = cn(
  "h-[calc(100%-1px)] flex-1 gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm transition-all",
  "text-foreground/60 hover:text-foreground dark:text-muted-foreground dark:hover:text-foreground",
  "has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5",
  "group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start",
  // Default active
  "data-active:bg-background data-active:text-foreground data-active:shadow-sm dark:data-active:border-input dark:data-active:bg-input/30 dark:data-active:text-foreground",
)

/* Line variant overrides */
const triggerLine = cn(
  triggerDefault,
  "bg-transparent data-active:bg-transparent data-active:shadow-none dark:data-active:border-transparent dark:data-active:bg-transparent",
  // Underline indicator
  "after:absolute after:bg-foreground after:opacity-0 after:transition-opacity",
  "group-data-horizontal/tabs:after:inset-x-0 group-data-horizontal/tabs:after:bottom-[-5px] group-data-horizontal/tabs:after:h-0.5",
  "group-data-vertical/tabs:after:inset-y-0 group-data-vertical/tabs:after:-right-1 group-data-vertical/tabs:after:w-0.5",
  "data-active:after:opacity-100",
)

/* Contained: matches the old FilterTabs "contained" styling exactly */
const triggerContained = cn(
  "h-full rounded-lg border border-transparent px-3.5 text-xs text-center ios-ease transition-[background-color,color,opacity,box-shadow]",
  "text-muted-foreground hover:text-foreground",
  "data-active:bg-card data-active:text-foreground data-active:border-border data-active:shadow-none",
)

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  const variant = React.useContext(TabsVariantContext)

  const variantClass =
    variant === "contained" ? triggerContained
    : variant === "line" ? triggerLine
    : triggerDefault

  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(triggerBase, variantClass, className)}
      {...props}
    />
  )
}

/* ------------------------------------------------------------------ */
/*  TabsContent                                                       */
/* ------------------------------------------------------------------ */

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 text-sm outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
