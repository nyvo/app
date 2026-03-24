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
            "flex items-center relative overflow-x-auto no-scrollbar",
            variant === "contained" ? "gap-0.5 bg-zinc-200/60 p-1 rounded-md"
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
            ? "bg-white border border-zinc-200 text-text-primary rounded-lg"
            : "text-text-secondary hover:text-text-primary hover:bg-zinc-50 rounded-lg border border-transparent"
        case "contained":
          return isActive
            ? "text-text-primary"
            : "bg-transparent text-text-secondary hover:text-text-primary"
        default:
          return isActive
            ? "text-text-primary"
            : "text-text-secondary hover:text-text-primary"
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
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50",
          variant === "default"
            ? "text-xs px-3 py-2 -mb-px"
            : variant === "pill"
              ? "text-xs px-3 py-1.5 rounded-lg"
              : "text-xs px-2 py-1 rounded-[5px] text-center whitespace-nowrap",
          getStyles(),
          className
        )}
      >
        {variant === "contained" && isActive && (
          <motion.div
            layoutId={context.layoutId}
            className="absolute inset-0 bg-white rounded-[5px] shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]"
            transition={{ type: "spring", stiffness: 500, damping: 35 }}
          />
        )}
        <span className="relative z-10">{children}</span>
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
