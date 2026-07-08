import { Toaster as Sonner, type ToasterProps } from "sonner"
import { AlertCircle, Check, Info, Loader2, TriangleAlert } from "@/lib/icons"
import { cn } from "@/lib/utils"

// Action / cancel render as right-aligned inline text links — same type
// scale as the title so they sit on the same optical line; no button chrome.
const toastActionClassName =
  "!ml-auto !shrink-0 !h-auto !min-h-0 !rounded-none !border-0 !bg-transparent " +
  "!p-0 !text-sm !font-medium !text-chrome-foreground !underline !underline-offset-2 " +
  "!shadow-none hover:!bg-transparent hover:!opacity-90"

const toastClassName =
  "flex w-[calc(100vw-2rem)] items-start gap-3 rounded-2xl " +
  "bg-[var(--toast-surface)] px-5 py-4 text-chrome-foreground " +
  "shadow-float ring-1 ring-chrome-foreground/10 " +
  "sm:w-[380px]"

const toastIconClassName =
  "flex size-5 shrink-0 items-center justify-center rounded-full " +
  "bg-chrome-foreground/15 text-chrome-foreground [&_svg]:size-3.5 [&_svg]:stroke-[2.5]"

const errorToastIconClassName =
  "flex size-5 shrink-0 items-center justify-center rounded-full " +
  "bg-danger/30 text-chrome-foreground [&_svg]:size-3.5 [&_svg]:stroke-[2.5]"

const Toaster = ({ toastOptions, ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      position="bottom-center"
      expand={false}
      // ui-patterns §2.10: never stack more than 2 toasts
      visibleToasts={2}
      duration={4000}
      gap={8}
      offset={16}
      toastOptions={{
        unstyled: true,
        ...toastOptions,
        classNames: {
          ...toastOptions?.classNames,
          toast: cn(toastClassName, toastOptions?.classNames?.toast),
          title: cn(
            "text-sm font-medium leading-snug text-chrome-foreground",
            toastOptions?.classNames?.title,
          ),
          description: cn(
            "mt-0.5 text-xs leading-5 text-chrome-foreground-muted",
            toastOptions?.classNames?.description,
          ),
          icon: cn(toastIconClassName, toastOptions?.classNames?.icon),
          success: cn(toastClassName, toastOptions?.classNames?.success),
          info: cn(toastClassName, toastOptions?.classNames?.info),
          warning: cn(toastClassName, toastOptions?.classNames?.warning),
          error: cn(toastClassName, toastOptions?.classNames?.error),
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
        success: (
          <span className={toastIconClassName}>
            <Check aria-hidden="true" />
          </span>
        ),
        info: (
          <span className={toastIconClassName}>
            <Info aria-hidden="true" />
          </span>
        ),
        warning: (
          <span className={errorToastIconClassName}>
            <TriangleAlert aria-hidden="true" />
          </span>
        ),
        error: (
          <span className={errorToastIconClassName}>
            <AlertCircle aria-hidden="true" />
          </span>
        ),
        loading: (
          <span className={toastIconClassName}>
            <Loader2 className="animate-spin" aria-hidden="true" />
          </span>
        ),
      }}
      style={
        {
          "--normal-bg": "var(--toast-surface)",
          "--normal-text": "var(--background)",
          "--normal-border": "transparent",
          "--border-radius": "var(--radius-2xl)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
