import * as React from "react"
import { cn } from "@/lib/utils"

interface FilterTabsContextValue {
  value: string
  onValueChange: (value: string) => void
  variant: "default" | "contained" | "pill"
}

const FilterTabsContext = React.createContext<FilterTabsContextValue | undefined>(undefined)

function useFilterTabsContext() {
  const context = React.useContext(FilterTabsContext)
  if (!context) {
    throw new Error("FilterTab must be used within FilterTabs")
  }
  return context
}

interface FilterTabsProps {
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
  className?: string
  /** "default" has border styling, "contained" adds surface-elevated background, "pill" uses solid primary for active */
  variant?: "default" | "contained" | "pill"
}

const FilterTabs = React.forwardRef<HTMLDivElement, FilterTabsProps>(
  ({ value, onValueChange, children, className, variant = "default" }, ref) => {
    return (
      <FilterTabsContext.Provider value={{ value, onValueChange, variant }}>
        <div
          ref={ref}
          className={cn(
            "flex items-center",
            variant === "contained" ? "gap-1 bg-surface-elevated p-1 rounded-xl" : "gap-2",
            className
          )}
          role="tablist"
        >
          {children}
        </div>
      </FilterTabsContext.Provider>
    )
  }
)
FilterTabs.displayName = "FilterTabs"

interface FilterTabProps {
  value: string
  children: React.ReactNode
  className?: string
}

const FilterTab = React.forwardRef<HTMLButtonElement, FilterTabProps>(
  ({ value, children, className }, ref) => {
    const context = useFilterTabsContext()
    const isActive = context.value === value
    const variant = context.variant

    const getStyles = () => {
      switch (variant) {
        case "pill":
          return isActive
            ? "bg-text-primary text-white rounded-xl"
            : "bg-white text-muted-foreground hover:text-text-primary rounded-xl border border-border"
        case "contained":
          return isActive
            ? "bg-white text-text-primary shadow-sm"
            : "bg-transparent text-text-secondary hover:text-text-primary"
        default:
          return isActive
            ? "bg-white text-text-primary border border-border"
            : "bg-transparent text-text-secondary border border-transparent hover:text-text-primary hover:bg-surface-elevated"
      }
    }

    return (
      <button
        ref={ref}
        type="button"
        role="tab"
        aria-selected={isActive}
        onClick={() => context.onValueChange(value)}
        className={cn(
          "shrink-0 h-10 px-4 py-2.5 text-sm font-medium ios-ease cursor-pointer transition-colors",
          "focus:outline-none focus-visible:ring-4 focus-visible:ring-border/30",
          variant !== "pill" && "rounded-lg text-xs px-3 py-2",
          getStyles(),
          className
        )}
      >
        {children}
      </button>
    )
  }
)
FilterTab.displayName = "FilterTab"

export { FilterTabs, FilterTab }
