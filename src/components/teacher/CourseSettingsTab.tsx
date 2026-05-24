import { useEffect, useState, useMemo } from 'react';
import { Info } from '@/lib/icons';
import { formatKroner } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FieldError } from '@/components/ui/field-error';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { ImageField } from '@/components/ui/image-upload';
import { DatePicker } from '@/components/ui/date-picker';
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

  // Faresone — destructive course-level actions. Only show the ones that
  // apply to the current course state (e.g., Gjør til utkast is hidden on a
  // draft, Avlys/Slett are hidden once the course is cancelled).
  courseStatus: string;
  onRequestUnpublish: () => void;
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
  onRequestUnpublish,
  onRequestCancel,
  onRequestDelete,
}: CourseSettingsTabProps) => {
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


  return (
    <div>
      {/* Generelt — first section, no top divider */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
        <div>
          <h3 className="text-base font-medium tracking-tight text-foreground">Generelt</h3>
          <p className="mt-1 text-base text-foreground-muted">Slik fremstår kurset på kurssiden og i oversikter.</p>
        </div>
        <div className="md:col-span-2 space-y-4">
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
            label="Bilde"
            description="Vises på kurssiden, i timeplanen og på studiosiden."
            className="max-w-sm"
          />
          <div>
            <label htmlFor="settings-title" className="text-base font-medium mb-2 block text-foreground">Tittel</label>
            <Input
              id="settings-title"
              type="text"
              value={settingsTitle}
              onChange={(e) => onTitleChange(e.target.value)}
              className="text-base"
            />
          </div>
          <div>
            <label id="settings-description-label" className="text-base font-medium mb-2 block text-foreground">Beskrivelse</label>
            <RichTextEditor
              id="settings-description"
              aria-labelledby="settings-description-label"
              value={settingsDescription}
              onChange={onDescriptionChange}
            />
          </div>
        </div>
      </section>

      {/* Tid og plasser */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8 mt-10 pt-10 border-t border-border">
        <div>
          <h3 className="text-base font-medium tracking-tight text-foreground">Tid og plasser</h3>
          <p className="mt-1 text-base text-foreground-muted">Når kurset går og hvor mange som kan delta.</p>
        </div>
        <div className="md:col-span-2 space-y-4">
          <div>
            <label id="settings-date-label" className="text-base font-medium mb-2 block text-foreground">Dato</label>
            <DatePicker
              aria-labelledby="settings-date-label"
              value={settingsDate}
              onChange={onDateChange}
              placeholder="Velg dato"
            />
          </div>
          <div>
            <label id="settings-time-label" className="text-base font-medium mb-2 block text-foreground">Tidspunkt</label>
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
                  className="text-base font-medium mb-2 block text-foreground data-[error=true]:text-danger"
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
                    {currentEnrolled} er allerede påmeldt — kan ikke være lavere.
                  </FieldError>
                ) : null}
              </div>
            );
          })()}
        </div>
      </section>

      {/* Pris og påmelding */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8 mt-10 pt-10 border-t border-border">
        <div>
          <h3 className="text-base font-medium tracking-tight text-foreground">Pris og påmelding</h3>
          <p className="mt-1 text-base text-foreground-muted">Hva deltakere betaler og hvilke billetter de kan velge.</p>
        </div>
        <div className="md:col-span-2 space-y-4">
          <div>
            <label htmlFor="settings-price" className="text-base font-medium mb-2 block text-foreground">
              {courseFormat === 'series' ? 'Pris per gang' : 'Pris'}
            </label>
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
              <p className="mt-2 text-base text-foreground-muted">
                Totalt {formatKroner((parseInt(priceInput, 10) || 0) * totalWeeks)} for {totalWeeks} uker
              </p>
            )}
          </div>
          {/* Drop-in toggle and "tillat påmelding etter oppstart" moved to
              Oversikt tab. They're operational switches (instant-commit),
              not part of the saveable form. */}
        </div>
      </section>

      {/* Andre handlinger — destructive course-level actions. Calm presentation,
          matches the sibling section structure (3-col grid, same heading scale,
          same divider). The destructive buttons themselves communicate gravity. */}
      {courseStatus !== 'cancelled' && (
        <section className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8 mt-10 pt-10 border-t border-border">
          <div>
            <h3 className="text-base font-medium tracking-tight text-foreground">Andre handlinger</h3>
            <p className="mt-1 text-base text-foreground-muted">Avslutt eller fjern kurset.</p>
          </div>
          <div className="md:col-span-2 space-y-3">
            {courseStatus !== 'draft' && (
              <ActionRow
                title="Gjør kurset til utkast"
                sub="Tar kurset av studiosiden. Påmeldte beholdes."
                buttonLabel="Gjør til utkast"
                onClick={onRequestUnpublish}
              />
            )}
            <ActionRow
              title="Avlys kurset"
              sub="Stenger påmelding og refunderer alle påmeldte."
              buttonLabel="Avlys kurs"
              onClick={onRequestCancel}
              tone="danger"
            />
            <ActionRow
              title="Slett kurset"
              sub="Fjerner kurset og all tilhørende data permanent."
              buttonLabel="Slett kurs"
              onClick={onRequestDelete}
              tone="danger"
            />
          </div>
        </section>
      )}

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

function ActionRow({ title, sub, buttonLabel, onClick, tone = 'default' }: ActionRowProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 py-3 border-b border-border-subtle last:border-b-0">
      <div className="min-w-0">
        <p className="text-base font-medium text-foreground">{title}</p>
        <p className="text-base text-foreground-muted mt-0.5">{sub}</p>
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
