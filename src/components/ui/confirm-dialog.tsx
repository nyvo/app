"use client"

import * as React from "react"
import { VisuallyHidden as VisuallyHiddenPrimitive } from "radix-ui"

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

export interface ConfirmScopeListItem {
  id?: React.Key
  name: React.ReactNode
  meta?: React.ReactNode
  trailing?: React.ReactNode
}

export interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Screen-reader announcement. */
  ariaLabel: string
  /** Short verb-noun title, e.g. "Avlys kurs". */
  title: React.ReactNode
  /** One sentence. Use inline <strong> for the affected entity / amount. */
  body: React.ReactNode
  /** Button label for the confirming action. */
  actionLabel: React.ReactNode
  /** Safe/cancel button label. Use "Behold" when the action itself says Avbryt/Avbestill. */
  cancelLabel?: React.ReactNode
  /** Render the confirm button with the destructive (danger) token instead of primary. */
  destructive?: boolean
  onConfirm: (event: React.MouseEvent<HTMLButtonElement>) => void
  disabled?: boolean
  loading?: boolean
  loadingText?: string
  /** Optional list scope, only for real lists of affected items. */
  scopeList?: ConfirmScopeListItem[]
  /** Tier 3 gate. Action is disabled until the typed value matches exactly after trim(). */
  typeToConfirm?: string
  typeToConfirmValue?: string
  onTypeToConfirmChange?: (value: string) => void
  trigger?: React.ReactNode
}

export function ConfirmDialog(props: ConfirmDialogProps) {
  const isMobile = useIsMobile()
  return isMobile ? <ConfirmDrawer {...props} /> : <ConfirmAlertDialog {...props} />
}

function ConfirmAlertDialog(props: ConfirmDialogProps) {
  const {
    open,
    onOpenChange,
    ariaLabel,
    trigger,
  } = props

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {trigger}
      <AlertDialogContent aria-label={ariaLabel}>
        <VisuallyHiddenPrimitive.Root>
          <AlertDialogTitle>{ariaLabel}</AlertDialogTitle>
        </VisuallyHiddenPrimitive.Root>
        <ConfirmContent {...props} />
      </AlertDialogContent>
    </AlertDialog>
  )
}

function ConfirmDrawer(props: ConfirmDialogProps) {
  const { open, onOpenChange, ariaLabel, loading } = props

  return (
    <Drawer open={open} onOpenChange={onOpenChange} dismissible={!loading}>
      <DrawerContent aria-label={ariaLabel}>
        <VisuallyHiddenPrimitive.Root>
          <DrawerTitle>{ariaLabel}</DrawerTitle>
        </VisuallyHiddenPrimitive.Root>
        <div className="px-4 pt-5 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <ConfirmContent {...props} mobile />
        </div>
      </DrawerContent>
    </Drawer>
  )
}

function ConfirmContent({
  title,
  body,
  scopeList,
  typeToConfirm,
  typeToConfirmValue = "",
  onTypeToConfirmChange,
  actionLabel,
  cancelLabel = "Avbryt",
  onConfirm,
  disabled,
  loading,
  loadingText,
  destructive,
  mobile,
}: ConfirmDialogProps & { mobile?: boolean }) {
  const typeGateOpen =
    !typeToConfirm || typeToConfirmValue.trim() === typeToConfirm
  const actionDisabled = disabled || !typeGateOpen

  return (
    <>
      <div>
        <h2 className="mb-2 text-lg font-medium text-foreground">
          {title}
        </h2>
        <p className="text-sm leading-relaxed text-foreground-muted [&_strong]:font-medium [&_strong]:text-foreground">
          {body}
        </p>
      </div>

      {scopeList && scopeList.length > 0 ? (
        <div className="mt-4 max-h-72 overflow-y-auto rounded-lg bg-muted/40 p-3">
          <div className="divide-y divide-border/60">
            {scopeList.map((item, index) => (
              <div
                key={item.id ?? index}
                className={cn(
                  "flex items-center justify-between gap-3 py-2",
                  index === 0 && "pt-0",
                  index === scopeList.length - 1 && "pb-0",
                )}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {item.name}
                  </p>
                  {item.meta ? (
                    <p className="mt-0.5 truncate text-sm text-foreground-muted">
                      {item.meta}
                    </p>
                  ) : null}
                </div>
                {item.trailing ? (
                  <span className="shrink-0 text-sm tabular-nums text-foreground">
                    {item.trailing}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {typeToConfirm ? (
        <label className="mt-5 grid gap-2 text-sm text-foreground-muted">
          <span>
            Skriv{" "}
            <strong className="font-medium text-foreground">
              {typeToConfirm}
            </strong>{" "}
            for å bekrefte
          </span>
          <Input
            value={typeToConfirmValue}
            onChange={(event) => onTypeToConfirmChange?.(event.target.value)}
            autoComplete="off"
          />
        </label>
      ) : null}

      {mobile ? (
        <div className="mt-6 flex gap-2">
          <DrawerClose asChild>
            <Button variant="secondary" size="lg" className="flex-1" disabled={loading}>
              {cancelLabel}
            </Button>
          </DrawerClose>
          <ActionButton
            onConfirm={onConfirm}
            disabled={actionDisabled}
            loading={loading}
            loadingText={loadingText}
            destructive={destructive}
          >
            {actionLabel}
          </ActionButton>
        </div>
      ) : (
        <AlertDialogFooter className="mt-6">
          <AlertDialogCancel disabled={loading}>{cancelLabel}</AlertDialogCancel>
          <ActionButton
            onConfirm={onConfirm}
            disabled={actionDisabled}
            loading={loading}
            loadingText={loadingText}
            destructive={destructive}
          >
            {actionLabel}
          </ActionButton>
        </AlertDialogFooter>
      )}
    </>
  )
}

function ActionButton({
  onConfirm,
  disabled,
  loading,
  loadingText,
  destructive,
  children,
}: {
  onConfirm: (event: React.MouseEvent<HTMLButtonElement>) => void
  disabled?: boolean
  loading?: boolean
  loadingText?: string
  destructive?: boolean
  children: React.ReactNode
}) {
  return (
    <Button
      variant={destructive ? "destructive" : "default"}
      size="lg"
      className="flex-1"
      onClick={onConfirm}
      disabled={disabled || loading}
      loading={loading}
      loadingText={loadingText}
    >
      {children}
    </Button>
  )
}

export function ConfirmScopeItem({
  name,
  meta,
  trailing,
  className,
}: {
  name: React.ReactNode
  meta?: React.ReactNode
  trailing?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex w-full items-start justify-between gap-3 p-4", className)}>
      <div className="min-w-0 space-y-1">
        <p className="truncate text-sm font-medium text-foreground">{name}</p>
        {meta ? (
          <p className="truncate text-xs text-foreground-muted tabular-nums">{meta}</p>
        ) : null}
      </div>
      {trailing ? (
        <span className="shrink-0 text-sm font-medium tabular-nums text-foreground">
          {trailing}
        </span>
      ) : null}
    </div>
  )
}

export function ConfirmScopeRow({
  label,
  value,
  first,
}: {
  label: React.ReactNode
  value: React.ReactNode
  first?: boolean
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between px-4 py-2.5 text-sm text-foreground tabular-nums",
        !first && "border-t border-border/60"
      )}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}
