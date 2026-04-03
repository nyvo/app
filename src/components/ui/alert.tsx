import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Info, CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react"

import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative flex w-full items-start gap-3 rounded-lg bg-surface-subtle p-4 text-foreground [&_svg]:mt-0.5 [&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "[&_svg]:text-foreground",
        destructive: "[&_svg]:text-destructive",
        info: "[&_svg]:text-status-info-text",
        success: "[&_svg]:text-status-confirmed-text",
        warning: "[&_svg]:text-status-warning-text",
        error: "[&_svg]:text-status-error-text",
        neutral: "[&_svg]:text-muted-foreground",
      },
      size: {
        default: "p-4",
        sm: "p-3",
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
  info: "text-status-info-text",
  success: "text-status-confirmed-text",
  warning: "text-status-warning-text",
  error: "text-status-error-text",
  destructive: "text-destructive",
  neutral: "text-foreground",
}

const variantTextColorMuted: Record<string, string> = {
  default: "text-muted-foreground",
  info: "text-muted-foreground",
  success: "text-muted-foreground",
  warning: "text-muted-foreground",
  error: "text-muted-foreground",
  destructive: "text-muted-foreground",
  neutral: "text-muted-foreground",
}

const defaultIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle,
  destructive: AlertCircle,
  neutral: Info,
}

interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  icon?: React.ComponentType<{ className?: string }> | false
}

function Alert({
  className,
  variant = "default",
  size,
  icon,
  children,
  ...props
}: AlertProps) {
  const role = variant === "error" || variant === "warning" || variant === "destructive" ? "alert" : "status"
  const IconComponent = icon === false ? null : (icon || defaultIcons[variant || "default"])

  return (
    <div
      role={role}
      className={cn(alertVariants({ variant, size }), className)}
      {...props}
    >
      {IconComponent && <IconComponent aria-hidden="true" />}
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}

function AlertTitle({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement> & { variant?: string }) {
  return (
    <h5
      className={cn(
        "type-label mb-1 text-foreground",
        variant ? variantTextColor[variant] : "",
        className
      )}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement> & { variant?: string }) {
  return (
    <div
      className={cn(
        "type-body-sm text-muted-foreground [&_p]:leading-relaxed",
        variant ? variantTextColorMuted[variant] : "",
        className
      )}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription, alertVariants }
