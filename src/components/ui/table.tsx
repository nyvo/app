import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Table primitives — the canonical way to render data tables (signups, participants,
 * transactions, etc.) Compose with `<Table>`, `<TableHeader>`, `<TableBody>`,
 * `<TableRow>`, `<TableHead>`, `<TableCell>`.
 *
 * Layout conventions (applied automatically by these primitives):
 * - Table fills the parent container. Page-level constraint is the PAGE'S job
 *   (e.g. `<main className="mx-auto max-w-6xl">` on the page wrapper) — the
 *   Table primitive never caps its own width.
 * - Header cells use label styling (text-xs font-medium tracking-wide text-foreground-muted).
 * - Body rows get a subtle hover (bg-muted/50) and divide-y via the body wrapper.
 * - Cell padding is uniform (px-4 py-4, sm:px-6).
 *
 * Column-width rule: the first/identity column (avatar + name + meta) should get
 * `className="min-w-[220px] max-w-[360px] w-[40%]"` on its <TableHead> to prevent
 * sprawl on wide screens. Status/action columns stay at fixed widths (w-40, w-12).
 */
function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div
      data-slot="table-container"
      className="w-full overflow-x-auto"
    >
      <table
        data-slot="table"
        className={cn(
          "w-full text-left border-collapse",
          className,
        )}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("border-b border-border bg-background/50", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("divide-y divide-border", className)}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "group smooth-transition hover:bg-muted/50 data-[state=selected]:bg-muted",
        className,
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      scope="col"
      className={cn(
        "text-xs font-medium tracking-wide px-4 py-3 text-foreground-muted sm:px-6",
        className,
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn("px-4 py-4 sm:px-6", className)}
      {...props}
    />
  )
}

function TableCaption({ className, ...props }: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-foreground-muted", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
}
