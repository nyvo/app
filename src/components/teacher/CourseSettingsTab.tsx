import { useEffect, useState, useMemo } from 'react';
import {
  Info,
} from '@/lib/icons';
import { cn, formatKroner } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FieldError } from '@/components/ui/field-error';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { ImageField } from '@/components/ui/image-upload';
import { DatePicker } from '@/components/ui/date-picker';
import { LocationCombobox } from '@/components/ui/location-combobox';
import { useLocations } from '@/hooks/use-locations';
import { useAuth } from '@/contexts/AuthContext';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

  // Location — committed as null when empty (per DB schema).
  settingsLocation: string;
  onLocationChange: (location: string) => void;

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

  // Pricing — for series the input is per-gang; the stored value (passed in
  // via `price`) is the total (per-gang × total_weeks), matching the create
  // flow's convention.
  courseFormat: 'single' | 'series';
  totalWeeks: number;
  price: number;
  onPriceChange: (totalPrice: number) => void;

  // Drop-in (allowsDropIn, dropInPrice) and late-signups (acceptsLateSignups)
  // toggles moved to Oversikt tab — they're instant-commit operational
  // switches, not part of this saveable form.

  // Actions
  isDirty: boolean;
  saveError: string | null;
  onSave: () => void;
  onCancel: () => void;

  // Destructive zone — gated by status. "Gjør til utkast" lives in the page
  // header's kebab menu (state change, not destructive), not here.
  courseStatus: string;
  onRequestCancel: () => void;
  onRequestDelete: () => void;
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
  settingsLocation,
  onLocationChange,
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
  totalWeeks,
  price,
  onPriceChange,
  isDirty,
  saveError,
  onSave,
  onCancel,
  courseStatus,
  onRequestCancel,
  onRequestDelete,
}: CourseSettingsTabProps) => {
  const { currentSeller } = useAuth();
  const { locations } = useLocations(currentSeller?.id);

  const minParticipants = Math.max(currentEnrolled || 1, 1);
  const [participantsInput, setParticipantsInput] = useState(String(maxParticipants));

  // Per-gang for series, total for single. Mirrors create-course's input shape.
  const perGangPrice = useMemo(() => {
    if (courseFormat === 'series' && totalWeeks > 0) {
      return Math.round(price / totalWeeks);
    }
    return price;
  }, [courseFormat, totalWeeks, price]);
  const [priceInput, setPriceInput] = useState(String(perGangPrice));

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

  useEffect(() => {
    setPriceInput(String(perGangPrice));
  }, [perGangPrice]);

  const commitPriceInput = () => {
    const trimmed = priceInput.trim();
    if (trimmed === '') {
      setPriceInput(String(perGangPrice));
      return;
    }
    const parsed = Number(trimmed);
    if (Number.isNaN(parsed) || parsed < 0) {
      setPriceInput(String(perGangPrice));
      return;
    }
    const normalized = Math.floor(parsed);
    const totalPrice = courseFormat === 'series' ? normalized * (totalWeeks || 1) : normalized;
    if (totalPrice !== price) {
      onPriceChange(totalPrice);
    }
    setPriceInput(String(normalized));
  };

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


  // Plasser error state — derived once for both the input and the label.
  const participantsTypedValue = parseInt(participantsInput, 10);
  const participantsHasTyped = participantsInput.trim() !== '';
  // Only an error WHILE the user is typing a value below current enrollment.
  // After blur, the input is clamped back to a valid value, so the error
  // clears. Capacity == currentEnrolled (course is full) is a valid state.
  const isBelowEnrolled =
    participantsHasTyped &&
    !isNaN(participantsTypedValue) &&
    currentEnrolled > 0 &&
    participantsTypedValue < currentEnrolled;

  return (
    <div className="max-w-3xl">
      {/* The form lives in a single bounded surface so dividers and the right-
          side whitespace feel intentional rather than floating on an open
          canvas. The destructive Faresone below sits outside this card. */}
      <Card>
        <CardContent className="space-y-8">
      <div id="course-edit-image" className="scroll-mt-24">
        <FieldLabel>Bilde</FieldLabel>
        <ImageField
          value={settingsImageUrl}
          onChange={(file) => {
            onImageFileChange(file);
          }}
          onRemove={() => {
            if (settingsImageUrl) {
              onImageRemove();
            }
          }}
          disabled={isSaving}
          className="max-w-xs"
        />
      </div>

      {/* Tittel */}
      <div>
        <FieldLabel htmlFor="settings-title">Tittel</FieldLabel>
        <Input
          id="settings-title"
          type="text"
          value={settingsTitle}
          onChange={(e) => onTitleChange(e.target.value)}
          className="text-base"
        />
      </div>

      {/* Beskrivelse */}
      <div id="course-edit-description" className="scroll-mt-24">
        <FieldLabel id="settings-description-label">Beskrivelse</FieldLabel>
        <RichTextEditor
          id="settings-description"
          aria-labelledby="settings-description-label"
          value={settingsDescription}
          onChange={onDescriptionChange}
        />
      </div>

      {/* Sted */}
      <div id="course-edit-location" className="scroll-mt-24">
        <FieldLabel>Sted</FieldLabel>
        <LocationCombobox
          value={settingsLocation}
          onChange={onLocationChange}
          locations={locations}
          placeholder="Velg sted"
          aria-label="Sted"
        />
      </div>

      {/* Dato + Tidspunkt — paired (when is it) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <FieldLabel id="settings-date-label">Dato</FieldLabel>
          <DatePicker
            aria-labelledby="settings-date-label"
            value={settingsDate}
            onChange={onDateChange}
            placeholder="Velg dato"
          />
        </div>
        <div>
          <FieldLabel id="settings-time-label">Tidspunkt</FieldLabel>
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
            <span className="text-base font-medium shrink-0 text-foreground-muted">–</span>
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
      </div>

      {/* Plasser + Pris — paired (capacity & cost; both short numerics) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <FieldLabel htmlFor="settings-capacity" error={isBelowEnrolled}>
            Plasser
          </FieldLabel>
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
          {isBelowEnrolled && (
            <FieldError className="mt-2 tabular-nums">
              {currentEnrolled} er allerede påmeldt — kan ikke være lavere.
            </FieldError>
          )}
        </div>
        <div>
          <FieldLabel htmlFor="settings-price">
            {courseFormat === 'series' ? 'Pris per gang' : 'Pris'}
          </FieldLabel>
          <Input
            id="settings-price"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={priceInput}
            onChange={(e) => setPriceInput(e.target.value.replace(/[^\d]/g, ''))}
            onBlur={commitPriceInput}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commitPriceInput();
              }
            }}
          />
          {courseFormat === 'series' && priceInput !== '' && totalWeeks > 0 && (
            <p className="mt-2 text-sm text-foreground-muted">
              Totalt {formatKroner((parseInt(priceInput, 10) || 0) * totalWeeks)} for {totalWeeks} uker
            </p>
          )}
        </div>
      </div>
        </CardContent>
      </Card>

      {/* Destructive zone — gated by status. "Gjør til utkast" lives in the
          header kebab menu (state change, not destructive). This zone is
          danger-tinted surface for actions that destroy or invalidate data:
          - draft → just Slett (no signups to refund)
          - upcoming/active → Avlys (refund + notify; signup rows survive)
          - cancelled → just Slett (final cleanup) */}
      {(() => {
        const isDraft = courseStatus === 'draft';
        const isActive = courseStatus === 'upcoming' || courseStatus === 'active';
        const isCancelled = courseStatus === 'cancelled';
        const showCancel = isActive;
        const showDelete = isDraft || isCancelled;
        if (!showCancel && !showDelete) return null;
        return (
          <section className="mt-16 rounded-lg border border-danger/20 bg-danger-subtle/40 p-6">
            <div className="divide-y divide-danger/15">
              {showCancel && (
                <ActionRow
                  title="Avlys kurset"
                  sub="Stenger påmelding og refunderer alle påmeldte."
                  buttonLabel="Avlys kurs"
                  onClick={onRequestCancel}
                  tone="danger"
                />
              )}
              {showDelete && (
                <ActionRow
                  title="Slett kurset"
                  sub="Fjerner kurset og all tilhørende data permanent."
                  buttonLabel="Slett kurs"
                  onClick={onRequestDelete}
                  tone="danger"
                />
              )}
            </div>
          </section>
        );
      })()}

      {/* Sticky save bar — only visible when there are unsaved changes.
          Sits at the bottom of the scrollable parent. */}
      {(isDirty || saveError) && (
        <div className="sticky bottom-0 mt-4 py-3 bg-background border-t border-border z-20">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              {saveError ? (
                <span className="inline-flex items-center gap-2 text-base text-danger" role="alert">
                  <Info className="size-4 shrink-0" aria-hidden />
                  {saveError}
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 text-base text-foreground-muted">
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
                Avbryt
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  commitParticipantsInput();
                  onSave();
                }}
                disabled={!isDirty}
                loading={isSaving}
                loadingText="Lagrer"
              >
                Lagre endringer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface ActionRowProps {
  title: string;
  sub: string;
  buttonLabel: string;
  onClick: () => void;
  tone?: 'default' | 'danger';
}

function FieldLabel({
  htmlFor,
  id,
  error,
  children,
}: {
  htmlFor?: string;
  id?: string;
  error?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      id={id}
      className={cn(
        'mb-2 block text-base font-medium',
        error ? 'text-danger' : 'text-foreground',
      )}
    >
      {children}
    </label>
  );
}

function ActionRow({ title, sub, buttonLabel, onClick, tone = 'default' }: ActionRowProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-base font-medium text-foreground">{title}</p>
        <p className="text-sm text-foreground-muted mt-0.5">{sub}</p>
      </div>
      <Button
        variant={tone === 'danger' ? 'destructive' : 'outline'}
        size="sm"
        onClick={onClick}
        className="shrink-0"
      >
        {buttonLabel}
      </Button>
    </div>
  );
}
