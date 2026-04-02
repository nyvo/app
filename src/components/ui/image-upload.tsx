import { useState, useRef, useCallback, useEffect } from 'react'
import { ImagePlus, X, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_IMAGE_SIZE,
  createImagePreviewUrl,
  revokeImagePreviewUrl
} from '@/services/storage'

interface ImageUploadProps {
  value?: string | null // Current image URL
  onChange: (file: File | null) => void // Called when file selected
  onRemove?: () => void // Called when remove clicked (for existing images)
  disabled?: boolean
  error?: string
  className?: string
}

export function ImageUpload({
  value,
  onChange,
  onRemove,
  disabled = false,
  error,
  className = ''
}: ImageUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        revokeImagePreviewUrl(previewUrl)
      }
    }
  }, [previewUrl])

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      return 'Ugyldig filtype. Bruk JPG, PNG eller WebP.'
    }
    if (file.size > MAX_IMAGE_SIZE) {
      return 'Bildet er for stort. Maks 5MB.'
    }
    return null
  }

  const handleFile = useCallback(
    (file: File) => {
      const error = validateFile(file)
      if (error) {
        setValidationError(error)
        return
      }

      setValidationError(null)

      // Cleanup old preview
      if (previewUrl) {
        revokeImagePreviewUrl(previewUrl)
      }

      // Create new preview
      const newPreviewUrl = createImagePreviewUrl(file)
      setPreviewUrl(newPreviewUrl)
      onChange(file)
    },
    [onChange, previewUrl]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragActive(false)

      if (disabled) return

      const file = e.dataTransfer.files[0]
      if (file) {
        handleFile(file)
      }
    },
    [disabled, handleFile]
  )

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      if (!disabled) {
        setDragActive(true)
      }
    },
    [disabled]
  )

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFile(file)
    }
  }

  const handleRemove = () => {
    if (previewUrl) {
      revokeImagePreviewUrl(previewUrl)
      setPreviewUrl(null)
    }
    onChange(null)
    onRemove?.()
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  const displayUrl = previewUrl || value

  const displayError = validationError || error

  return (
    <div className={`h-full ${className}`}>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(',')}
        onChange={handleInputChange}
        disabled={disabled}
        aria-label="Last opp kursbilde"
        className="hidden"
      />

      {displayUrl ? (
        // Image preview state
        <div className="relative group h-full">
          <div className="relative h-full rounded-lg overflow-hidden border border-border bg-muted">
            <img src={displayUrl} alt="Kursbilde" className="w-full h-full object-cover" />
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => inputRef.current?.click()}
                disabled={disabled}
              >
                Bytt bilde
              </Button>
              <Button
                type="button"
                variant="destructive-outline"
                size="sm"
                onClick={handleRemove}
                disabled={disabled}
                aria-label="Fjern bilde"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        // Upload dropzone state
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label="Legg til bilde – klikk eller dra og slipp"
          aria-disabled={disabled}
          onClick={() => !disabled && inputRef.current?.click()}
          onKeyDown={(e) => { if (!disabled && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); inputRef.current?.click(); } }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            relative h-full rounded-lg border
            flex flex-col items-center justify-center gap-3 cursor-pointer
            smooth-transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50
            ${
              dragActive
                ? 'border-ring bg-background'
                : 'border-input bg-transparent hover:border-ring'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            ${displayError ? 'border-destructive' : ''}
          `}
        >
          <div className="h-10 w-10 rounded-lg bg-background border border-input flex items-center justify-center">
            <ImagePlus className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">
              {dragActive ? 'Slipp for å laste opp' : 'Legg til bilde'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Dra og slipp, eller velg fil</p>
          </div>
        </div>
      )}

      {displayError && (
        <p className="mt-2 text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {displayError}
        </p>
      )}
    </div>
  )
}
