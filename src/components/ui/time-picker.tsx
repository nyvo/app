import * as React from "react"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface TimePickerProps {
  value?: string
  onChange?: (value: string) => void
  onBlur?: () => void
  className?: string
  id?: string
  disabled?: boolean
  error?: boolean
}

export function TimePicker({
  value,
  onChange,
  onBlur,
  className,
  id,
  disabled,
  error,
}: TimePickerProps) {
  // Generate time options from 06:00 to 00:00 in 15-minute intervals
  const timeOptions = React.useMemo(() => {
    const options = []
    // 06:00 to 23:45
    for (let hour = 6; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const h = hour.toString().padStart(2, "0")
        const m = minute.toString().padStart(2, "0")
        options.push(`${h}:${m}`)
      }
    }
    // Add 00:00 as the final option
    options.push("00:00")
    return options
  }, [])

  // If the current value is not in the 15-minute intervals, add it as an option
  const allOptions = React.useMemo(() => {
    if (value && !timeOptions.includes(value)) {
      return [...timeOptions, value].sort()
    }
    return timeOptions
  }, [value, timeOptions])

  return (
    <Select
      value={value}
      onValueChange={onChange}
      disabled={disabled}
    >
      <SelectTrigger
        id={id}
        onBlur={onBlur}
        className={cn(
          "w-full h-11 bg-surface",
          error ? "border-destructive" : "border-input",
          className
        )}
      >
        <SelectValue placeholder="Velg tid" />
      </SelectTrigger>
      <SelectContent className="max-h-[300px]">
        {allOptions.map((time) => (
          <SelectItem key={time} value={time}>
            {time}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
