import * as React from "react"

import { cn } from "@/lib/utils"

interface InputProps extends React.ComponentProps<"input"> {
  /** Optional leading icon. When provided the icon is rendered absolutely
   *  to the left of the input and `pl-12` is added to the input itself. */
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>
}

function Input({ className, type, icon: Icon, ...props }: InputProps) {
  if (Icon) {
    return (
      <div className="relative">
        <Icon
          className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-foreground-subtle"
          strokeWidth={1.75}
        />
        <input
          type={type}
          data-slot="input"
          className={cn(
            "h-11 w-full min-w-0 rounded-xl border border-border bg-surface px-4 pl-12 text-base transition-[color,border-color,box-shadow] duration-150 ease-out outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-foreground-muted focus-visible:border-foreground focus-visible:ring-2 focus-visible:ring-foreground/15 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-50 aria-invalid:border-danger aria-invalid:ring-2 aria-invalid:ring-danger/20",
            className
          )}
          {...props}
        />
      </div>
    )
  }

  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-xl border border-border bg-surface px-4 text-base transition-[color,border-color,box-shadow] duration-150 ease-out outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-foreground-muted focus-visible:border-foreground focus-visible:ring-2 focus-visible:ring-foreground/15 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-50 aria-invalid:border-danger aria-invalid:ring-2 aria-invalid:ring-danger/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }
export type { InputProps }
