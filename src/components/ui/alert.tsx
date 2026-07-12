import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Info, CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react"

import { cn } from "@/lib/utils"

const alertVariants = cva(
  "group/alert relative grid w-full gap-1 rounded-lg border text-left text-sm has-data-[slot=alert-action]:relative has-data-[slot=alert-action]:pr-18 has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-2.5 has-data-[slot=alert-icon]:grid-cols-[auto_1fr] has-data-[slot=alert-icon]:gap-x-2.5 *:[svg]:row-span-2 *:[svg]:translate-y-0.5 *:[svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-surface text-foreground",
        // Informational note — a filled neutral panel (no border, no status
        // hue): the glyph sits in its own muted circle and the copy reads
        // font-medium foreground. Purely neutral by design (2026-07-11) —
        // these boxes state what will happen, they don't warn.
        info: "border-transparent bg-panel font-medium text-foreground",
        success: "bg-surface [&_svg]:text-success",
        warning: "bg-surface [&_svg]:text-warning",
        error: "bg-surface text-danger *:data-[slot=alert-description]:text-danger *:[svg]:text-current",
        neutral: "bg-surface [&_svg]:text-foreground-muted",
      },
      size: {
        default: "px-4 py-3",
        sm: "px-3 py-2 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const variantTextColor: Record<string, string> = {
  default: "text-foreground",
  info: "text-foreground",
  success: "text-success",
  warning: "text-warning",
  error: "text-danger",
  neutral: "text-foreground",
}

type IconComponent = React.ComponentType<{ className?: string }>

const defaultIcons: Record<string, IconComponent> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle,
  neutral: Info,
}

type AlertVariant = "default" | "info" | "success" | "warning" | "error" | "neutral"

interface AlertProps
  extends Omit<React.ComponentProps<"div">, "size">,
    VariantProps<typeof alertVariants> {
  icon?: IconComponent | false
}

function Alert({
  className,
  variant = "default",
  size,
  icon,
  children,
  ...props
}: AlertProps) {
  const role =
    variant === "error" || variant === "warning" ? "alert" : "status"

  let iconNode: React.ReactNode = null
  if (icon !== false) {
    const IconComp = icon ?? defaultIcons[variant || "default"]
    if (IconComp) {
      // The filled info variant carries its glyph in a muted circle; the
      // status variants keep the bare colored glyph.
      iconNode =
        variant === "info" ? (
          <span
            data-slot="alert-icon"
            aria-hidden={true}
            className="row-span-2 flex size-8 shrink-0 items-center justify-center self-start rounded-full bg-muted text-foreground-muted"
          >
            <IconComp className="size-4" />
          </span>
        ) : (
          <IconComp aria-hidden={true} />
        )
    }
  }

  return (
    <div
      data-slot="alert"
      role={role}
      className={cn(alertVariants({ variant, size }), className)}
      {...props}
    >
      {iconNode}
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}

function AlertTitle({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & { variant?: AlertVariant }) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "font-medium group-has-[>svg]/alert:col-start-2 [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground",
        variant ? variantTextColor[variant] : "",
        className
      )}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div"> & { variant?: AlertVariant }) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-sm text-balance text-foreground-muted md:text-pretty [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground [&_p:not(:last-child)]:mb-4",
        className
      )}
      {...props}
    />
  )
}

function AlertAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-action"
      className={cn("absolute top-2.5 right-3", className)}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription, AlertAction, alertVariants }
