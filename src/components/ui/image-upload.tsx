import { useCallback, useEffect, useId, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { Upload } from '@/lib/icons'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_IMAGE_SIZE,
  createImagePreviewUrl,
  revokeImagePreviewUrl,
} from '@/services/storage'

type ImageFieldVariant = 'cover' | 'avatar'

const MAX_IMAGE_SIZE_MB = Math.round(MAX_IMAGE_SIZE / (1024 * 1024))

interface ImageFieldProps {
  value?: string | null
  onChange: (file: File | null) => void
  onRemove?: () => void
  variant?: ImageFieldVariant
  disabled?: boolean
  loading?: boolean
  error?: string | null
  label?: string
  description?: string
  uploadLabel?: string
  changeLabel?: string
  removeLabel?: string
  loadingLabel?: string
  emptyLabel?: string
  ariaLabel?: string
  className?: string
}

function validateFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return 'Bildet kan ikke brukes. Bruk JPG, PNG eller WebP.'
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return `Bildet er for stort. Maks ${MAX_IMAGE_SIZE_MB} MB.`
  }
  return null
}

export function ImageField({
  value,
  onChange,
  onRemove,
  variant = 'cover',
  disabled = false,
  loading = false,
  error,
  label,
  description,
  uploadLabel = 'Last opp bilde',
  changeLabel = 'Bytt bilde',
  removeLabel = 'Fjern',
  loadingLabel = 'Laster opp',
  emptyLabel = 'Dra bildet hit, eller klikk for å laste opp.',
  ariaLabel,
  className,
}: ImageFieldProps) {
  const id = useId()
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const pickerRef = useRef<HTMLButtonElement>(null)
  const wasLoadingRef = useRef(loading)

  useEffect(() => {
    return () => {
      if (previewUrl) revokeImagePreviewUrl(previewUrl)
    }
  }, [previewUrl])

  // When an instant-save settles (loading goes true → false), drop the local
  // preview so the picker falls back to the authoritative `value`. On success
  // that's the new URL; on failure it's the unchanged old one — so a failed
  // upload never keeps showing the picked file. Callers using instant-save
  // don't need to remount this field to reset it.
  useEffect(() => {
    if (wasLoadingRef.current && !loading) setPreviewUrl(null)
    wasLoadingRef.current = loading
  }, [loading])

  const isAvatar = variant === 'avatar'
  const displayUrl = previewUrl || value || null
  const displayError = validationError || error
  const isDisabled = disabled || loading
  const descriptionId = `${id}-description`
  const errorId = `${id}-error`
  const describedBy = [
    description && descriptionId,
    displayError && errorId,
  ].filter(Boolean).join(' ') || undefined

  const openPicker = useCallback(() => {
    if (!isDisabled) inputRef.current?.click()
  }, [isDisabled])

  const handleFile = useCallback(
    (file: File) => {
      const nextError = validateFile(file)
      if (nextError) {
        setValidationError(nextError)
        return
      }

      setValidationError(null)
      if (previewUrl) revokeImagePreviewUrl(previewUrl)

      const nextPreviewUrl = createImagePreviewUrl(file)
      setPreviewUrl(nextPreviewUrl)
      onChange(file)
    },
    [onChange, previewUrl],
  )

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) handleFile(file)
  }

  const handleRemove = () => {
    if (previewUrl) {
      revokeImagePreviewUrl(previewUrl)
      setPreviewUrl(null)
    }
    setValidationError(null)
    onChange(null)
    onRemove?.()
    window.setTimeout(() => pickerRef.current?.focus(), 0)
  }

  const handleDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault()
      setDragActive(false)
      if (isDisabled) return

      const file = event.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile, isDisabled],
  )

  const handleDragOver = useCallback(
    (event: DragEvent) => {
      event.preventDefault()
      if (!isDisabled) setDragActive(true)
    },
    [isDisabled],
  )

  const handleDragLeave = useCallback((event: DragEvent) => {
    event.preventDefault()
    setDragActive(false)
  }, [])

  const hiddenInput = (
    <input
      ref={inputRef}
      type="file"
      accept={ACCEPTED_IMAGE_TYPES.join(',')}
      onChange={handleInputChange}
      disabled={isDisabled}
      aria-label={ariaLabel ?? uploadLabel}
      aria-describedby={describedBy}
      className="hidden"
    />
  )

  const pickerButton = (
    <button
      ref={pickerRef}
      type="button"
      onClick={openPicker}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      disabled={isDisabled}
      aria-label={ariaLabel ?? (displayUrl ? changeLabel : uploadLabel)}
      aria-invalid={displayError ? true : undefined}
      aria-describedby={describedBy}
      className={cn(
        'group relative shrink-0 cursor-pointer overflow-hidden transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring-subtle disabled:cursor-not-allowed',
        isAvatar ? 'size-24 rounded-full' : 'aspect-[16/10] w-full rounded-xl',
        displayUrl
          ? 'border border-border bg-muted'
          : 'border border-border bg-surface hover:border-border-strong hover:bg-hover',
        displayError && 'ring-2 ring-danger/20',
        dragActive && !displayUrl && 'border-foreground bg-muted',
        isDisabled && !loading && 'opacity-50',
      )}
    >
      {displayUrl ? (
        <>
          <img src={displayUrl} alt="" className="size-full object-cover" />
          <span className="absolute inset-0 bg-transparent transition-colors group-hover:bg-hover" />
        </>
      ) : (
        <span className="flex size-full flex-col items-center justify-center gap-2 px-4 text-center">
          <span
            className={cn(
              'flex size-10 items-center justify-center text-foreground',
              !isAvatar && 'rounded-full bg-muted',
            )}
          >
            <Upload className="size-5" aria-hidden="true" />
          </span>
          {!isAvatar && (
            <span className="max-w-64 text-sm text-foreground-muted">
              {dragActive ? 'Slipp for å laste opp' : emptyLabel}
            </span>
          )}
        </span>
      )}
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center bg-background/75 text-sm font-medium text-foreground">
          {loadingLabel}
        </span>
      )}
    </button>
  )

  // Avatar (inline) — round preview beside its actions (Clay/Mercury pattern):
  // empty → placeholder + "Last opp bilde"; filled → image + "Endre"/"Fjern".
  if (isAvatar) {
    return (
      <div className={cn('flex w-full flex-col items-start gap-2', className)}>
        {label && <span className="text-base font-medium text-foreground">{label}</span>}
        {hiddenInput}
        <div className="flex items-center gap-4">
          <button
            ref={pickerRef}
            type="button"
            onClick={openPicker}
            disabled={isDisabled}
            aria-label={ariaLabel ?? (displayUrl ? changeLabel : uploadLabel)}
            aria-invalid={displayError ? true : undefined}
            className={cn(
              'relative size-16 shrink-0 overflow-hidden rounded-full bg-muted outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring-subtle disabled:cursor-not-allowed',
              !displayUrl && 'hover:bg-active',
              displayError && 'ring-2 ring-danger/20',
              isDisabled && !loading && 'opacity-50',
            )}
          >
            {displayUrl ? (
              <img src={displayUrl} alt="" className="size-full object-cover" />
            ) : (
              <span className="flex size-full items-center justify-center text-foreground-muted">
                <Upload className="size-5" aria-hidden="true" />
              </span>
            )}
            {loading && (
              <span className="absolute inset-0 flex items-center justify-center bg-background/75 text-xs font-medium text-foreground">
                {loadingLabel}
              </span>
            )}
          </button>
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" onClick={openPicker} disabled={isDisabled}>
              {displayUrl ? changeLabel : uploadLabel}
            </Button>
            {displayUrl && onRemove && (
              <Button
                type="button"
                variant="plain"
                onClick={handleRemove}
                disabled={isDisabled}
                className="text-foreground-muted hover:text-danger"
              >
                {removeLabel}
              </Button>
            )}
          </div>
        </div>
        {description && (
          <p id={descriptionId} className="text-sm text-foreground-muted">{description}</p>
        )}
        {displayError && (
          <p id={errorId} role="alert" className="text-sm text-danger">{displayError}</p>
        )}
      </div>
    )
  }

  // Cover layout — placeholder-as-trigger with Bytt bilde / Fjern stacked below.
  return (
    <div className={cn('flex w-full flex-col items-start gap-3', className)}>
      {label && (
        <span className="text-base font-medium text-foreground">{label}</span>
      )}
      {hiddenInput}
      {pickerButton}
      {displayUrl && onRemove && (
        <div className="flex items-center gap-2 text-sm">
          <Button
            type="button"
            variant="plain"
            onClick={openPicker}
            disabled={isDisabled}
          >
            {changeLabel}
          </Button>
          <span aria-hidden="true" className="text-foreground-disabled">·</span>
          <Button
            type="button"
            variant="plain"
            onClick={handleRemove}
            disabled={isDisabled}
            className="hover:text-danger"
          >
            {removeLabel}
          </Button>
        </div>
      )}
      {description && (
        <p id={descriptionId} className="text-sm text-foreground-muted">
          {description}
        </p>
      )}
      {displayError && (
        <p id={errorId} role="alert" className="text-sm text-danger">
          {displayError}
        </p>
      )}
    </div>
  )
}

export const ImageUpload = ImageField
