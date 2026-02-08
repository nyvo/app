"use client"

import * as React from "react"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react"
import { DayButton, DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("bg-white p-3", className)}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString("nb-NO", { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: "w-fit",
        months: "relative flex flex-col gap-4",
        month: "flex flex-col gap-4",
        nav: "absolute inset-x-0 top-0 flex w-full items-center justify-between",
        button_previous: "size-7 p-0 rounded-lg border border-border text-text-tertiary hover:bg-surface-elevated hover:text-text-primary transition-colors inline-flex items-center justify-center disabled:opacity-50",
        button_next: "size-7 p-0 rounded-lg border border-border text-text-tertiary hover:bg-surface-elevated hover:text-text-primary transition-colors inline-flex items-center justify-center disabled:opacity-50",
        month_caption: "flex h-7 w-full items-center justify-center",
        caption_label: "text-sm font-medium text-text-primary",
        weekdays: "flex",
        weekday: "text-text-tertiary w-9 text-center text-xs font-normal",
        week: "flex w-full mt-2",
        day: "h-9 w-9 p-0 text-center",
        outside: "text-text-tertiary/40",
        disabled: "text-text-tertiary/40 pointer-events-none",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) => {
          if (orientation === "left") {
            return <ChevronLeftIcon className="size-4" />
          }
          return <ChevronRightIcon className="size-4" />
        },
        DayButton: CalendarDayButton,
        ...components,
      }}
      {...props}
    />
  )
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const ref = React.useRef<HTMLButtonElement>(null)

  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  const isToday = modifiers.today
  const isSelected = modifiers.selected && !modifiers.range_start && !modifiers.range_end && !modifiers.range_middle

  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        // Base styles
        "inline-flex h-9 w-9 items-center justify-center rounded-lg text-sm font-normal transition-colors cursor-pointer",
        // Default state
        "text-text-secondary hover:bg-surface-elevated hover:text-text-primary",
        // Today indicator - subtle gray background
        isToday && !isSelected && "bg-surface-elevated text-text-primary font-medium",
        // Selected state - primary fill
        isSelected && "bg-primary text-primary-foreground font-medium hover:bg-primary-soft hover:text-primary-foreground",
        // Range states
        modifiers.range_start && "bg-primary text-primary-foreground rounded-l-lg rounded-r-none",
        modifiers.range_end && "bg-primary text-primary-foreground rounded-r-lg rounded-l-none",
        modifiers.range_middle && "bg-secondary text-text-primary rounded-none",
        // Outside month
        modifiers.outside && "text-text-tertiary/40 hover:text-text-tertiary/60",
        // Disabled
        modifiers.disabled && "text-text-tertiary/40 pointer-events-none cursor-default",
        className
      )}
      {...props}
    />
  )
}

export { Calendar, CalendarDayButton }
