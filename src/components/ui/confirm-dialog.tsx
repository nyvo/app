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
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// ConfirmDialog — Tier 2 destructive confirmation per studio-design § 12.
//
// Responsive: AlertDialog on desktop (≥ md), Vaul bottom-sheet on mobile.
// Both render the same content (headline → optional scope → optional body →
// footer). Mobile sheet is dismissible={false} so the user can't fling away
// a destructive prompt; desktop ESC closes, outside-click does not.
//
// Layout — flat block flow (no AlertDialogHeader wrapper). The header
// primitive's grid + place-items-center collapses non-text children to
// content width and breaks left-alignment. Direct children of
// AlertDialogContent give full-width by default.
//
// `scope` is optional. Drop it when the identifier is already obvious from
// the trigger context (deleting your own account on your own profile page;
// signing out your own session). Real apps (Linear, Vercel, GitHub, Notion)
// don't slap a card on every confirmation — the card earns its space only
// when it carries new information (refund details, cascade count, ambiguous
// item identity in a list).
//
// Destructive button is monochrome (sand-12 dark). No red, no `tone` prop.
// ---------------------------------------------------------------------------

export interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Screen-reader announcement (no visible title rendered). */
  ariaLabel: string
  /** Compound headline. One sentence, foreground color, sized as dialog headline. */
  headline: React.ReactNode
  /** Optional scope card. Omit when the trigger context already identifies the target. */
  scope?: React.ReactNode
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
  /** Extra content between scope and footer (e.g. checkbox gate or type-to-confirm input). */
  children?: React.ReactNode
  /** Trigger element — when omitted, the dialog is purely controlled. */
  trigger?: React.ReactNode
}

export function ConfirmDialog(props: ConfirmDialogProps) {
  const isMobile = useIsMobile()
  return isMobile ? <ConfirmDrawer {...props} /> : <ConfirmAlertDialog {...props} />
}

// ───────────────────────────────────────────────────────────────────────────
// Desktop (≥ md) — Radix AlertDialog
// ───────────────────────────────────────────────────────────────────────────

function ConfirmAlertDialog({
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
  children,
  trigger,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {trigger}
      <AlertDialogContent aria-label={ariaLabel} className="gap-4">
        <VisuallyHiddenPrimitive.Root>
          <AlertDialogTitle>{ariaLabel}</AlertDialogTitle>
        </VisuallyHiddenPrimitive.Root>
        <Headline>{headline}</Headline>
        {scope ? <ScopeWrapper>{scope}</ScopeWrapper> : null}
        {children}
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel disabled={loading}>{cancelLabel}</AlertDialogCancel>
          <ActionButton
            onConfirm={onConfirm}
            disabled={disabled}
            loading={loading}
            loadingText={loadingText}
          >
            {actionLabel}
          </ActionButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ───────────────────────────────────────────────────────────────────────────
// Mobile (< md) — Vaul bottom sheet, non-dismissible by drag/outside-click
// ───────────────────────────────────────────────────────────────────────────

function ConfirmDrawer({
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
  children,
}: ConfirmDialogProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} dismissible={!loading}>
      <DrawerContent aria-label={ariaLabel}>
        <VisuallyHiddenPrimitive.Root>
          <DrawerTitle>{ariaLabel}</DrawerTitle>
        </VisuallyHiddenPrimitive.Root>
        <div className="flex flex-col gap-4 px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Headline>{headline}</Headline>
          {scope ? <ScopeWrapper>{scope}</ScopeWrapper> : null}
          {children}
          <div className="mt-2 flex flex-col-reverse gap-2">
            <DrawerClose asChild>
              <Button variant="outline-soft" disabled={loading}>
                {cancelLabel}
              </Button>
            </DrawerClose>
            <ActionButton
              onConfirm={onConfirm}
              disabled={disabled}
              loading={loading}
              loadingText={loadingText}
            >
              {actionLabel}
            </ActionButton>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

// ───────────────────────────────────────────────────────────────────────────
// Shared inner bits
// ───────────────────────────────────────────────────────────────────────────

function Headline({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-base font-semibold leading-snug text-foreground">{children}</p>
  )
}

function ScopeWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border/60 bg-muted/40">
      {children}
    </div>
  )
}

function ActionButton({
  onConfirm,
  disabled,
  loading,
  loadingText,
  children,
}: {
  onConfirm: (event: React.MouseEvent<HTMLButtonElement>) => void
  disabled?: boolean
  loading?: boolean
  loadingText?: string
  children: React.ReactNode
}) {
  return (
    <Button
      variant="default"
      onClick={onConfirm}
      disabled={disabled || loading}
      loading={loading}
      loadingText={loadingText}
    >
      {children}
    </Button>
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

/** Multi-item scope row — `flex justify-between`, softer dividers above all but first. */
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
