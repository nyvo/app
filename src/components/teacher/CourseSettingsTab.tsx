import { useEffect, useState, useMemo } from 'react';
import { Info } from '@/lib/icons';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FieldError } from '@/components/ui/field-error';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { ImageUpload } from '@/components/ui/image-upload';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

interface CourseSettingsTabProps {
  // General info
  settingsTitle: string;
  onTitleChange: (title: string) => void;
  settingsDescription: string;
  onDescriptionChange: (description: string) => void;

  // Image
  settingsImageUrl: string | null;
  onImageFileChange: (file: File | null) => void;
  onImageRemove: () => void;
  isSaving: boolean;

  // Schedule
  settingsDate: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
  settingsTime: string;
  onTimeChange: (time: string) => void;
  settingsDuration: number | null;
  onDurationChange: (duration: number | null) => void;

  // Capacity
  maxParticipants: number;
  onMaxParticipantsChange: (value: number) => void;
  currentEnrolled: number;

  // Drop-in — series-only. When true on a started, non-full series the
  // public BookingPanel exposes a drop-in option (price = base ÷ weeks).
  courseFormat: 'single' | 'series';
  allowsDropIn: boolean;
  onAllowsDropInChange: (value: boolean) => void;

  // Actions
  isDirty: boolean;
  saveError: string | null;
  onSave: () => void;
  onCancel: () => void;
}

export const CourseSettingsTab = ({
  settingsTitle,
  onTitleChange,
  settingsDescription,
  onDescriptionChange,
  settingsImageUrl,
  onImageFileChange,
  onImageRemove,
  isSaving,
  settingsDate,
  onDateChange,
  settingsTime,
  onTimeChange,
  settingsDuration,
  onDurationChange,
  maxParticipants,
  onMaxParticipantsChange,
  currentEnrolled,
  courseFormat,
  allowsDropIn,
  onAllowsDropInChange,
  isDirty,
  saveError,
  onSave,
  onCancel,
}: CourseSettingsTabProps) => {
  const minParticipants = Math.max(currentEnrolled || 1, 1);
  const [participantsInput, setParticipantsInput] = useState(String(maxParticipants));

  // Time slot helpers (matching CreateCoursePage)
  const allTimeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let h = 6; h < 23; h++) {
      for (const m of [0, 15, 30, 45]) {
        slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      }
    }
    slots.push('23:00');
    return slots;
  }, []);

  const timeToMin = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const minToTime = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  // Derive end time from start + duration
  const endTime = useMemo(() => {
    if (!settingsTime || !settingsDuration) return '';
    return minToTime(timeToMin(settingsTime) + settingsDuration);
  }, [settingsTime, settingsDuration]);

  const endTimeSlots = useMemo(() => {
    if (!settingsTime) return allTimeSlots;
    const startMin = timeToMin(settingsTime) + 15;
    return allTimeSlots.filter((t) => timeToMin(t) >= startMin);
  }, [settingsTime, allTimeSlots]);

  const handleEndTimeChange = (val: string) => {
    if (!settingsTime) return;
    const dur = timeToMin(val) - timeToMin(settingsTime);
    if (dur > 0) onDurationChange(dur);
  };

  useEffect(() => {
    setParticipantsInput(String(maxParticipants));
  }, [maxParticipants]);

  const commitParticipantsInput = () => {
    const trimmed = participantsInput.trim();

    if (trimmed === '') {
      setParticipantsInput(String(maxParticipants));
      return;
    }

    const parsed = Number(trimmed);
    if (Number.isNaN(parsed)) {
      setParticipantsInput(String(maxParticipants));
      return;
    }

    const normalized = Math.max(minParticipants, Math.floor(parsed));
    if (normalized !== maxParticipants) {
      onMaxParticipantsChange(normalized);
    }
    setParticipantsInput(String(normalized));
  };

  return (
    <div>
      {/* Generelt — first section, no top divider */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
        <div>
          <h3 className="text-base font-medium tracking-tight text-foreground">Generelt</h3>
          <p className="mt-1 text-sm text-foreground-muted">Navn, beskrivelse og forsidebilde.</p>
        </div>
        <div className="md:col-span-2 space-y-4">
          <div className="relative aspect-[16/10] w-60 overflow-hidden rounded-lg">
            <ImageUpload
              value={settingsImageUrl}
              onChange={(file) => {
                onImageFileChange(file);
                if (!file && settingsImageUrl) {
                  onImageRemove();
                }
              }}
              onRemove={() => {
                if (settingsImageUrl) {
                  onImageRemove();
                }
              }}
              disabled={isSaving}
              className="absolute inset-0 h-full w-full"
            />
          </div>
          <div>
            <label htmlFor="settings-title" className="text-sm font-medium mb-2 block text-foreground">Navn på kurs</label>
            <Input
              id="settings-title"
              type="text"
              value={settingsTitle}
              onChange={(e) => onTitleChange(e.target.value)}
            />
          </div>
          <div>
            <label id="settings-description-label" className="text-sm font-medium mb-2 block text-foreground">Beskrivelse</label>
            <RichTextEditor
              id="settings-description"
              aria-labelledby="settings-description-label"
              value={settingsDescription}
              onChange={onDescriptionChange}
            />
          </div>
        </div>
      </section>

      {/* Tid og kapasitet */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8 mt-10 pt-10 border-t border-border">
        <div>
          <h3 className="text-base font-medium tracking-tight text-foreground">Tid og kapasitet</h3>
          <p className="mt-1 text-sm text-foreground-muted">Tidspunkt, varighet og antall plasser.</p>
        </div>
        <div className="md:col-span-2 space-y-4">
          <div>
            <label id="settings-date-label" className="text-sm font-medium mb-2 block text-foreground">Dato</label>
            <DatePicker
              aria-labelledby="settings-date-label"
              value={settingsDate}
              onChange={onDateChange}
              placeholder="Velg dato"
            />
          </div>
          <div>
            <label id="settings-time-label" className="text-sm font-medium mb-2 block text-foreground">Tidspunkt</label>
            <div className="flex items-center gap-2">
              <Select
                value={settingsTime}
                onValueChange={(val) => {
                  onTimeChange(val);
                  // If current end time is now invalid, clear duration
                  if (endTime && timeToMin(endTime) <= timeToMin(val)) {
                    onDurationChange(null);
                  }
                }}
              >
                <SelectTrigger className="w-full" aria-label="Starttid">
                  <SelectValue placeholder="Start" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectGroup>
                    {allTimeSlots.map((slot) => (
                      <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <span className="text-sm font-medium shrink-0 text-foreground-muted">–</span>
              <Select
                value={endTime}
                onValueChange={handleEndTimeChange}
              >
                <SelectTrigger className="w-full" aria-label="Sluttid">
                  <SelectValue placeholder="Slutt" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectGroup>
                    {endTimeSlots.map((slot) => (
                      <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
          {(() => {
            const typedValue = parseInt(participantsInput, 10);
            const hasTyped = participantsInput.trim() !== '';
            // Only an error WHILE the user is typing a value below current
            // enrollment. After blur, the input is clamped back to a valid
            // value, so the error clears. Capacity == currentEnrolled (course
            // is full) is a valid state, not an error.
            const isBelowEnrolled =
              hasTyped && !isNaN(typedValue) && currentEnrolled > 0 && typedValue < currentEnrolled;
            return (
              <div>
                <label
                  htmlFor="settings-capacity"
                  data-error={isBelowEnrolled ? 'true' : undefined}
                  className="text-sm font-medium mb-2 block text-foreground data-[error=true]:text-danger"
                >
                  Plasser
                </label>
                <Input
                  id="settings-capacity"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={participantsInput}
                  onChange={(e) => {
                    const nextValue = e.target.value.replace(/[^\d]/g, '');
                    setParticipantsInput(nextValue);
                  }}
                  onBlur={commitParticipantsInput}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      commitParticipantsInput();
                    }
                  }}
                  aria-invalid={isBelowEnrolled ? 'true' : undefined}
                  className="text-left"
                />
                {isBelowEnrolled ? (
                  <FieldError className="mt-2 tabular-nums">
                    Kan ikke være lavere enn {currentEnrolled}. Så mange er allerede påmeldt.
                  </FieldError>
                ) : null}
              </div>
            );
          })()}
          {/* Drop-in — series only. Lives inside Tid og kapasitet because it's
              an access/pricing modifier on the schedule, not a standalone
              concern. Public-side surfacing requires (1) course has started
              and (2) spots available. Price = base ÷ total weeks. */}
          {courseFormat === 'series' && (
            <label className="flex items-start justify-between gap-4 cursor-pointer pt-2">
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium text-foreground">Tillat drop-in</span>
                <span className="block text-sm text-foreground-muted mt-0.5">
                  La nye bli med på enkelttimer. Vi regner ut pris per gang automatisk.
                </span>
              </span>
              <Switch
                checked={allowsDropIn}
                onCheckedChange={onAllowsDropInChange}
                aria-label="Tillat drop-in"
                className="mt-0.5 shrink-0"
              />
            </label>
          )}
        </div>
      </section>

      {/* Sticky save bar — only visible when there are unsaved changes.
          Sits at the bottom of the scrollable parent. */}
      {(isDirty || saveError) && (
        <div className="sticky bottom-0 mt-4 py-3 bg-background border-t border-border z-20">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              {saveError ? (
                <span className="inline-flex items-center gap-2 text-sm text-danger" role="alert">
                  <Info className="size-4 shrink-0" aria-hidden />
                  {saveError}
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 text-sm text-foreground-muted">
                  <span className="size-2 rounded-full bg-foreground" aria-hidden />
                  Du har ulagrede endringer
                </span>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancel}
                disabled={isSaving}
              >
                Forkast
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  commitParticipantsInput();
                  onSave();
                }}
                disabled={isSaving || !isDirty}
              >
                {isSaving ? (
                  <>
                    <Spinner size="sm" />
                    Lagrer
                  </>
                ) : (
                  'Lagre endringer'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
