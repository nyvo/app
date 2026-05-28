import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CheckCircle2, Info, AlertTriangle, XCircle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

const toastActionClassName =
  "!h-auto !min-h-0 !border-0 !bg-transparent !p-0 !shadow-none " +
  "!font-inherit !font-medium !text-foreground underline underline-offset-2 " +
  "hover:!text-foreground-muted"

const Toaster = ({ toastOptions, ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        ...toastOptions,
        classNames: {
          ...toastOptions?.classNames,
          actionButton: cn(
            toastActionClassName,
            toastOptions?.classNames?.actionButton,
          ),
          cancelButton: cn(
            toastActionClassName,
            toastOptions?.classNames?.cancelButton,
          ),
        },
      }}
      icons={{
        success: <CheckCircle2 className="size-4" />,
        info: <Info className="size-4" />,
        warning: <AlertTriangle className="size-4" />,
        error: <XCircle className="size-4" />,
        loading: <Loader2 className="size-4 animate-spin" />,
      }}
      style={
        {
          // Studio tokens — popover/popover-foreground don't exist in this
          // design system, so the previous values resolved to transparent.
          "--normal-bg": "var(--surface)",
          "--normal-text": "var(--foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
