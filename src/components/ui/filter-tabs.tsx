import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface FilterTabsContextValue {
  value: string
  onValueChange: (value: string) => void
  variant: "default" | "contained" | "pill"
  layoutId: string
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
    const layoutId = React.useId()

    return (
      <FilterTabsContext.Provider value={{ value, onValueChange, variant, layoutId }}>
        <div
          ref={ref}
          className={cn(
            "flex items-center relative",
            variant === "contained" ? "gap-1 bg-surface-elevated p-1 rounded-lg"
              : variant === "pill" ? "gap-1.5"
              : "gap-1 border-b border-border",
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
            ? "bg-white text-text-primary rounded-lg border border-zinc-400"
            : "bg-white text-muted-foreground hover:text-text-primary rounded-lg border border-border"
        case "contained":
          return isActive
            ? "bg-white text-text-primary"
            : "bg-transparent text-text-secondary hover:text-text-primary"
        default:
          return isActive
            ? "text-text-primary"
            : "text-muted-foreground hover:text-text-primary"
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
          "relative shrink-0 font-medium ios-ease cursor-pointer transition-colors",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
          variant === "default"
            ? "text-xs px-3 py-2 -mb-px"
            : variant === "pill"
              ? "text-xs px-3 py-1.5 rounded-lg"
              : "text-xs px-3 py-2 rounded-lg h-10",
          getStyles(),
          className
        )}
      >
        {children}
        {variant === "default" && isActive && (
          <motion.div
            layoutId={context.layoutId}
            className="absolute bottom-0 left-0 right-0 h-0.5 bg-text-primary"
            transition={{ type: "spring", stiffness: 500, damping: 35 }}
          />
        )}
      </button>
    )
  }
)
FilterTab.displayName = "FilterTab"

export { FilterTabs, FilterTab }
