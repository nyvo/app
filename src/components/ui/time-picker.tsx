import * as React from "react"
import { Clock3 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface TimePickerProps extends Omit<React.ComponentPropsWithoutRef<"input">, "value" | "onChange" | "type"> {
  value?: string
  onChange?: (value: string) => void
  error?: boolean
}

const HOUR_OPTIONS = Array.from({ length: 18 }, (_, index) => index + 6)
const MINUTE_OPTIONS = [0, 15, 30, 45]

function padTimePart(value: number) {
  return value.toString().padStart(2, "0")
}

function isCompleteTime(value?: string) {
  return !!value && /^([01]\d|2[0-3]):([0-5]\d)$/.test(value)
}

function formatTypedTime(input: string) {
  const digits = input.replace(/\D/g, "").slice(0, 4)

  if (digits.length <= 2) return digits

  return `${digits.slice(0, 2)}:${digits.slice(2)}`
}

function getTimeParts(value?: string) {
  if (!value) return { hour: null as number | null, minute: null as number | null }

  const match = value.match(/^(\d{1,2})(?::(\d{1,2}))?$/)
  if (!match) return { hour: null, minute: null }

  const hour = Number.parseInt(match[1], 10)
  const minute = match[2] ? Number.parseInt(match[2], 10) : null

  return {
    hour: Number.isNaN(hour) ? null : hour,
    minute: minute === null || Number.isNaN(minute) ? null : minute,
  }
}

export const TimePicker = React.forwardRef<HTMLInputElement, TimePickerProps>(function TimePicker({
  value = "",
  onChange,
  onBlur,
  className,
  disabled,
  error,
  ...inputProps
}, ref) {
  const [open, setOpen] = React.useState(false)
  const { hour: selectedHour, minute: selectedMinute } = React.useMemo(() => getTimeParts(value), [value])

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(formatTypedTime(event.target.value))
  }

  const handleInputBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    const nextValue = formatTypedTime(event.target.value)

    if (nextValue !== value) {
      onChange?.(nextValue)
    }

    onBlur?.(event)
  }

  const handleHourSelect = (hour: number) => {
    const nextMinute = selectedMinute !== null && selectedMinute >= 0 && selectedMinute <= 59 ? selectedMinute : 0
    onChange?.(`${padTimePart(hour)}:${padTimePart(nextMinute)}`)
  }

  const handleMinuteSelect = (minute: number) => {
    const nextHour = selectedHour !== null && selectedHour >= 0 && selectedHour <= 23 ? selectedHour : 12
    onChange?.(`${padTimePart(nextHour)}:${padTimePart(minute)}`)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="relative">
        <Input
          ref={ref}
          value={value}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          placeholder="HH:mm"
          inputMode="numeric"
          autoComplete="off"
          disabled={disabled}
          className={cn("pr-11 font-tabular-nums", className)}
          {...inputProps}
        />
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={disabled}
            className={cn(
              "absolute right-1 top-1/2 -translate-y-1/2 rounded-md text-muted-foreground hover:bg-transparent hover:text-foreground",
              error && "text-destructive hover:text-destructive"
            )}
            aria-label="Velg tid"
          >
            <Clock3 />
          </Button>
        </PopoverTrigger>
      </div>

      <PopoverContent align="start" className="w-[280px] p-3" showOverlay>
        <div className="flex items-center justify-between pb-3">
          <div>
            <p className="type-label-sm text-foreground">Velg tid</p>
            <p className="type-meta text-muted-foreground">
              {isCompleteTime(value) ? value : "Skriv eller velg"}
            </p>
          </div>
          {value ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-auto px-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
              onClick={() => onChange?.("")}
            >
              Nullstill
            </Button>
          ) : null}
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-3">
          <div className="space-y-2">
            <p className="type-meta text-muted-foreground">Timer</p>
            <div className="grid max-h-56 grid-cols-4 gap-2 overflow-y-auto pr-1">
              {HOUR_OPTIONS.map((hour) => (
                <button
                  key={hour}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleHourSelect(hour)}
                  className={cn(
                    "type-label rounded-md border px-0 py-2 text-center transition-[background-color,border-color,color]",
                    selectedHour === hour
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-surface text-foreground hover:border-input hover:bg-accent"
                  )}
                >
                  {padTimePart(hour)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="type-meta text-muted-foreground">Min</p>
            <div className="flex flex-col gap-2">
              {MINUTE_OPTIONS.map((minute) => (
                <button
                  key={minute}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleMinuteSelect(minute)}
                  className={cn(
                    "type-label min-w-14 rounded-md border px-3 py-2 text-center transition-[background-color,border-color,color]",
                    selectedMinute === minute
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-surface text-foreground hover:border-input hover:bg-accent"
                  )}
                >
                  {padTimePart(minute)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
})
