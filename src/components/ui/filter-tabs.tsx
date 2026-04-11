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
  /** Compact filter controls. "default" is segmented, "contained" is tighter, "pill" is strongest emphasis. */
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
            variant === "contained" ? "h-9 w-fit max-w-full gap-0 rounded-lg bg-surface-muted border border-input"
              : variant === "pill" ? "gap-1.5"
              : "h-9 gap-1 rounded-lg bg-surface-muted p-1",
            className
          )}
          role="tablist"
        >
          {variant === "contained"
            ? React.Children.toArray(children).flatMap((child, i, arr) => {
                if (i === arr.length - 1) return [child]
                const tabValues = React.Children.toArray(children)
                  .filter(React.isValidElement)
                  .map((el) => (el as React.ReactElement<FilterTabProps>).props.value)
                const currentVal = tabValues[i]
                const nextVal = tabValues[i + 1]
                const hideDiv = currentVal === value || nextVal === value
                return [
                  child,
                  <div
                    key={`div-${i}`}
                    className={cn(
                      "w-px h-4 bg-input shrink-0 transition-opacity",
                      hideDiv && "opacity-0"
                    )}
                  />
                ]
              })
            : children}
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
            ? "bg-primary text-primary-foreground rounded-lg"
            : "text-muted-foreground hover:text-foreground hover:bg-surface rounded-lg border border-transparent"
        case "contained":
          return isActive
            ? "bg-surface text-foreground border border-border"
            : "bg-transparent text-muted-foreground hover:text-foreground"
        default:
          return isActive
            ? "bg-surface text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-surface/70"
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
          "relative shrink-0 cursor-pointer font-medium ios-ease transition-[background-color,color,opacity,box-shadow]",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          variant === "default"
            ? "type-label-sm px-3 py-2 rounded-lg"
            : variant === "pill"
              ? "type-label-sm px-3 py-1.5 rounded-lg"
              : "type-label-sm px-3.5 h-full rounded-lg text-center whitespace-nowrap",
          getStyles(),
          className
        )}
      >
        {variant === "contained" && isActive && (
          <motion.div
            layoutId={context.layoutId}
            className="absolute inset-0 rounded-md bg-surface border border-border"
            transition={{ type: "spring", stiffness: 500, damping: 35 }}
          />
        )}
        <span className="relative z-10">{children}</span>
      </button>
    )
  }
)
FilterTab.displayName = "FilterTab"

export { FilterTabs, FilterTab }
