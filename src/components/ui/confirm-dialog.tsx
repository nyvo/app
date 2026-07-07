"use client"

import * as React from "react"

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
  DrawerFooter,
  DrawerHeader,
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
  /** Optional override of the accessible name. By default the visible title
   *  is the accessible name (Radix wires aria-labelledby to it) — only pass
   *  this if the announced name must differ from the visible title. */
  ariaLabel?: string
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
      {/* By default Radix names the dialog via aria-labelledby → the visible
          AlertDialogTitle, which is exactly right. Only an explicit ariaLabel
          override clears aria-labelledby so the aria-label can win
          (aria-labelledby beats aria-label otherwise). */}
      <AlertDialogContent {...ariaNameOverride(ariaLabel)}>
        <ConfirmContent {...props} />
      </AlertDialogContent>
    </AlertDialog>
  )
}

function ConfirmDrawer(props: ConfirmDialogProps) {
  const { open, onOpenChange, ariaLabel, loading } = props

  return (
    <Drawer open={open} onOpenChange={onOpenChange} dismissible={!loading}>
      <DrawerContent {...ariaNameOverride(ariaLabel)}>
        <ConfirmContent {...props} mobile />
      </DrawerContent>
    </Drawer>
  )
}

/** Props replacing the default title-derived accessible name — only applied
 *  when an explicit ariaLabel override is provided. */
function ariaNameOverride(ariaLabel?: string) {
  return ariaLabel
    ? { "aria-label": ariaLabel, "aria-labelledby": undefined }
    : {}
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

  const bodyText = (
    <p className="text-sm leading-relaxed text-foreground-muted [&_strong]:font-medium [&_strong]:text-foreground">
      {body}
    </p>
  )

  const middleContent =
    (scopeList && scopeList.length > 0) || typeToConfirm ? (
      <>
        {scopeList && scopeList.length > 0 ? (
          <div className="max-h-72 overflow-y-auto rounded-lg bg-panel p-3">
            <div className="divide-y divide-border-subtle">
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
          <label className="grid gap-2 text-sm text-foreground-muted">
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
      </>
    ) : null

  const actionButton = (
    <ActionButton
      onConfirm={onConfirm}
      disabled={actionDisabled}
      loading={loading}
      loadingText={loadingText}
      destructive={destructive}
    >
      {actionLabel}
    </ActionButton>
  )

  if (mobile) {
    return (
      <>
        {/* Without middle content the header would abut the footer — drop the
            header's border so the seam is a single hairline, not two. */}
        <DrawerHeader className={cn(!middleContent && "border-b-0")}>
          <DrawerTitle className="text-lg font-medium text-foreground">
            {title}
          </DrawerTitle>
          {bodyText}
        </DrawerHeader>
        {middleContent && <div className="grid gap-6 px-6 py-4">{middleContent}</div>}
        <DrawerFooter className="flex-row pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <DrawerClose asChild>
            <Button variant="secondary" size="lg" className="flex-1" disabled={loading}>
              {cancelLabel}
            </Button>
          </DrawerClose>
          {actionButton}
        </DrawerFooter>
      </>
    )
  }

  return (
    <>
      <div>
        <AlertDialogTitle className="mb-2 text-lg font-medium text-foreground">
          {title}
        </AlertDialogTitle>
        {bodyText}
      </div>

      {middleContent}

      <AlertDialogFooter>
        <AlertDialogCancel disabled={loading}>{cancelLabel}</AlertDialogCancel>
        {actionButton}
      </AlertDialogFooter>
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
        !first && "border-t border-border-subtle"
      )}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}
