import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  InformationCircleIcon,
  CheckmarkCircle02Icon,
  Alert02Icon,
  AlertCircleIcon,
} from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"

const alertVariants = cva(
  "group/alert relative grid w-full gap-0.5 rounded-lg border px-4 py-3 text-left text-sm has-data-[slot=alert-action]:relative has-data-[slot=alert-action]:pr-18 has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-2.5 *:[svg]:row-span-2 *:[svg]:translate-y-0.5 *:[svg]:text-current *:[svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground",
        destructive:
          "bg-card text-destructive *:data-[slot=alert-description]:text-destructive/90 *:[svg]:text-current",
        info: "bg-card [&_svg]:text-blue-900",
        success: "bg-card [&_svg]:text-green-800",
        warning: "bg-card [&_svg]:text-amber-900",
        error: "bg-card text-destructive *:data-[slot=alert-description]:text-destructive/90",
        neutral: "bg-card [&_svg]:text-muted-foreground",
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
  info: "text-blue-900",
  success: "text-green-800",
  warning: "text-amber-900",
  error: "text-destructive",
  destructive: "text-destructive",
  neutral: "text-foreground",
}

// Icons indexed as any to accommodate both HugeIcons and legacy lucide consumers.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const defaultIcons: Record<string, any> = {
  info: InformationCircleIcon,
  success: CheckmarkCircle02Icon,
  warning: Alert02Icon,
  error: AlertCircleIcon,
  destructive: AlertCircleIcon,
  neutral: InformationCircleIcon,
}

type AlertVariant = "default" | "destructive" | "info" | "success" | "warning" | "error" | "neutral"

interface AlertProps
  extends Omit<React.ComponentProps<"div">, "size">,
    VariantProps<typeof alertVariants> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon?: React.ComponentType<{ className?: string }> | false | any
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
    variant === "error" || variant === "warning" || variant === "destructive" ? "alert" : "status"

  let iconNode: React.ReactNode = null
  if (icon !== false) {
    const resolved = icon ?? defaultIcons[variant || "default"]
    if (resolved) {
      if (typeof resolved === "function") {
        const IconComp = resolved as React.ComponentType<{ className?: string }>
        iconNode = <IconComp aria-hidden="true" />
      } else {
        iconNode = <HugeiconsIcon icon={resolved} aria-hidden={true} />
      }
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
        "font-heading font-medium group-has-[>svg]/alert:col-start-2 [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground",
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
        "text-sm text-balance text-muted-foreground md:text-pretty [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground [&_p:not(:last-child)]:mb-4",
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
