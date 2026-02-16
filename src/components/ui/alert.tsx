import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Info, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react'

import { cn } from '@/lib/utils'

const alertVariants = cva(
  'flex items-start gap-3 border [&_svg]:shrink-0 [&_svg]:mt-0.5 [&_svg]:h-4 [&_svg]:w-4',
  {
    variants: {
      variant: {
        info: 'bg-status-info-bg border-status-info-border [&_svg]:text-status-info-text',
        success: 'bg-status-confirmed-bg border-status-confirmed-border [&_svg]:text-status-confirmed-text',
        warning: 'bg-status-warning-bg border-status-warning-border [&_svg]:text-status-warning-text',
        error: 'bg-status-error-bg border-status-error-border [&_svg]:text-status-error-text',
        destructive: 'bg-destructive/10 border-destructive/20 [&_svg]:text-destructive',
        neutral: 'bg-surface border-transparent [&_svg]:text-text-tertiary',
      },
      size: {
        default: 'p-4 rounded-2xl',
        sm: 'p-3 rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'info',
      size: 'default',
    },
  }
)

const variantTextColor: Record<string, string> = {
  info: 'text-status-info-text',
  success: 'text-status-confirmed-text',
  warning: 'text-status-warning-text',
  error: 'text-status-error-text',
  destructive: 'text-destructive',
  neutral: 'text-text-secondary',
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
  variant = 'info',
  size,
  icon,
  children,
  ...props
}: AlertProps) {
  const role = variant === 'error' || variant === 'warning' || variant === 'destructive' ? 'alert' : 'status'
  const IconComponent = icon === false ? null : (icon || defaultIcons[variant || 'info'])

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
    <h4
      className={cn(
        'text-xs font-medium',
        variant ? variantTextColor[variant] : '',
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
    <p
      className={cn(
        'text-xs mt-1 leading-snug font-normal',
        variant ? `${variantTextColor[variant]}/80` : '',
        className
      )}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription, alertVariants }
