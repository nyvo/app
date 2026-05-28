import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { ImagePlus } from '@/lib/icons'
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
  emptyLabel?: string
  ariaLabel?: string
  className?: string
}

function validateFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return 'Dette bildet kan ikke lastes opp. Prøv et annet bilde.'
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
  emptyLabel,
  ariaLabel,
  className,
}: ImageFieldProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    return () => {
      if (previewUrl) revokeImagePreviewUrl(previewUrl)
    }
  }, [previewUrl])

  const isAvatar = variant === 'avatar'
  const displayUrl = previewUrl || value || null
  const displayError = validationError || error
  const isDisabled = disabled || loading

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
      className="hidden"
    />
  )

  const pickerButton = (
    <button
      type="button"
      onClick={openPicker}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      disabled={isDisabled}
      aria-label={ariaLabel ?? (displayUrl ? changeLabel : uploadLabel)}
      aria-invalid={displayError ? true : undefined}
      className={cn(
        'group relative shrink-0 overflow-hidden bg-muted transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-foreground/15 disabled:cursor-not-allowed disabled:opacity-50',
        isAvatar ? 'size-24 rounded-full' : 'aspect-[16/10] w-full rounded-lg',
        displayError && 'ring-2 ring-danger/20',
        dragActive && 'bg-active',
        !displayUrl && 'hover:bg-active',
      )}
    >
      {displayUrl ? (
        <>
          <img src={displayUrl} alt="" className="size-full object-cover" />
          <span className="absolute inset-0 bg-foreground/0 transition-colors group-hover:bg-foreground/10" />
        </>
      ) : (
        <span className="flex size-full flex-col items-center justify-center gap-2 px-4 text-center text-foreground-muted">
          <ImagePlus className={isAvatar ? 'size-7' : 'size-6'} aria-hidden="true" />
          {!isAvatar && (
            <span className="text-sm font-medium text-foreground">
              {dragActive ? 'Slipp for å laste opp' : emptyLabel ?? uploadLabel}
            </span>
          )}
        </span>
      )}
    </button>
  )

  // Single layout — Fiken/Linear/Notion pattern:
  // [optional label] · placeholder-as-trigger · [Bytt bilde · Fjern when filled] · [description]
  // Same shape for cover (16:10) and avatar (round). The picker shape is the
  // only thing that differs; the actions and helpers stack below.
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
            size="sm"
            onClick={openPicker}
            disabled={isDisabled}
          >
            {changeLabel}
          </Button>
          <span aria-hidden="true" className="text-foreground-disabled">·</span>
          <Button
            type="button"
            variant="plain"
            size="sm"
            onClick={handleRemove}
            disabled={isDisabled}
            className="hover:text-danger"
          >
            {removeLabel}
          </Button>
        </div>
      )}
      {description && (
        <p className="text-sm text-foreground-muted">{description}</p>
      )}
      {displayError && (
        <p role="alert" className="text-sm text-danger">
          {displayError}
        </p>
      )}
    </div>
  )
}

export const ImageUpload = ImageField
