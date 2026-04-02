import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Info, CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react"

import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground flex items-start gap-3 [&_svg]:shrink-0 [&_svg]:mt-0.5 [&_svg]:h-4 [&_svg]:w-4",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        destructive:
          "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
        info: "bg-status-info-bg border-status-info-border [&_svg]:text-status-info-text",
        success: "bg-status-confirmed-bg border-status-confirmed-border [&_svg]:text-status-confirmed-text",
        warning: "bg-status-warning-bg border-status-warning-border [&_svg]:text-status-warning-text",
        error: "bg-status-error-bg border-status-error-border [&_svg]:text-status-error-text",
        neutral: "bg-muted border-transparent [&_svg]:text-muted-foreground",
      },
      size: {
        default: "p-4 rounded-lg",
        sm: "p-3 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const variantTextColor: Record<string, string> = {
  info: "text-status-info-text",
  success: "text-status-confirmed-text",
  warning: "text-status-warning-text",
  error: "text-status-error-text",
  destructive: "text-destructive",
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
        "mb-1 font-medium leading-none tracking-tight",
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
        "text-sm [&_p]:leading-relaxed",
        variant ? `${variantTextColor[variant]}/80` : "",
        className
      )}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription, alertVariants }
