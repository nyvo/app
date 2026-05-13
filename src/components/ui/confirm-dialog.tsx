"use client"

import * as React from "react"
import { VisuallyHidden as VisuallyHiddenPrimitive } from "radix-ui"

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// ConfirmDialog — Tier 2 destructive confirmation per studio-design spec.
//
// Composition the spec mandates (see components.md § Confirmation dialog):
//   1. No VISIBLE <AlertDialogTitle> — title is wrapped in VisuallyHidden so
//      screen readers still get the announcement; sighted users see the
//      compound headline + scope card below.
//   2. Compound headline (one sentence) above an outlined scope card.
//   3. Scope card visualizes what's affected (single-item or multi-item rows
//      with `flex justify-between` dividers).
//   4. Footer: cancel left, destructive right; destructive button uses the
//      action verb, not "OK" / "Bekreft".
//
// Single dialog wrapper covers all eight Tier-2 sites (course cancel,
// signup actions, ticket-type hard-delete, location delete, leave studio,
// sign out all devices). Each site supplies headline + scope render + verb.
// ---------------------------------------------------------------------------

export interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Screen-reader announcement (no visible title rendered). */
  ariaLabel: string
  /** Compound headline above the scope card. One sentence, foreground color. */
  headline: React.ReactNode
  /** Card content describing what's affected (name + meta, list of rows, etc.). */
  scope: React.ReactNode
  /** Action verb on the destructive button — e.g. "Avlys kurs", "Slett". */
  actionLabel: React.ReactNode
  /** Cancel button label (default: "Avbryt"). */
  cancelLabel?: React.ReactNode
  /** Fired when the destructive button is clicked. */
  onConfirm: (event: React.MouseEvent<HTMLButtonElement>) => void
  /** Disable the destructive button (e.g. type-to-confirm not satisfied). */
  disabled?: boolean
  /** Show spinner + loadingText on the destructive button. */
  loading?: boolean
  loadingText?: string
  /** Variant of the action button. Defaults to "destructive". */
  actionVariant?: "destructive" | "default"
  /** Extra content rendered between the scope card and the footer (e.g. type-to-confirm input). */
  children?: React.ReactNode
  /** Trigger element — when omitted, the dialog is purely controlled. */
  trigger?: React.ReactNode
}

export function ConfirmDialog({
  open,
  onOpenChange,
  ariaLabel,
  headline,
  scope,
  actionLabel,
  cancelLabel = "Avbryt",
  onConfirm,
  disabled,
  loading,
  loadingText,
  actionVariant = "destructive",
  children,
  trigger,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {trigger}
      <AlertDialogContent aria-label={ariaLabel}>
        <AlertDialogHeader className="block text-left sm:text-left">
          <VisuallyHiddenPrimitive.Root>
            <AlertDialogTitle>{ariaLabel}</AlertDialogTitle>
          </VisuallyHiddenPrimitive.Root>
          <p className="mb-4 text-sm font-medium text-foreground">{headline}</p>
          <div className="rounded-md border border-border">{scope}</div>
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel disabled={loading}>{cancelLabel}</AlertDialogCancel>
          <Button
            variant={actionVariant}
            onClick={onConfirm}
            disabled={disabled || loading}
            loading={loading}
            loadingText={loadingText}
          >
            {actionLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// Helper layout primitives so each call site can compose a consistent scope card.

/** Single-item scope: name on line 1, meta on line 2, optional trailing amount. */
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
    <div className={cn("flex items-start justify-between gap-3 p-4", className)}>
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

/** Multi-item scope row — `flex justify-between`, dividers above all but first. */
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
        "flex items-center justify-between px-4 py-2 text-sm text-foreground tabular-nums",
        !first && "border-t border-border"
      )}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}
