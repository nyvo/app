import { useEffect, useState } from 'react';
import { Plus, Info, X } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ImageUpload } from '@/components/ui/image-upload';
import { DatePicker } from '@/components/ui/date-picker';
import { TimePicker } from '@/components/ui/time-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import type { AudienceLevel, EquipmentInfo } from '@/types/practicalInfo';
import { AUDIENCE_LEVEL_OPTIONS, EQUIPMENT_OPTIONS, ARRIVAL_PRESET_OPTIONS, ARRIVAL_NONE_VALUE, CUSTOM_BULLET_PLACEHOLDERS, CUSTOM_BULLETS_MAX_COUNT, CUSTOM_BULLET_MAX_LENGTH } from '@/utils/practicalInfoUtils';

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

  // Practical info
  settingsAudienceLevel: AudienceLevel | '';
  onAudienceLevelChange: (value: AudienceLevel | '') => void;
  settingsEquipment: EquipmentInfo | '';
  onEquipmentChange: (value: EquipmentInfo | '') => void;
  settingsArrivalMinutes: string;
  onArrivalMinutesChange: (value: string) => void;
  settingsCustomBullets: string[];
  onCustomBulletsChange: (value: string[]) => void;

  // Danger zone
  refundPreview: { count: number };
  onCancelCourse: () => void;

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
  settingsAudienceLevel,
  onAudienceLevelChange,
  settingsEquipment,
  onEquipmentChange,
  settingsArrivalMinutes,
  onArrivalMinutesChange,
  settingsCustomBullets,
  onCustomBulletsChange,
  refundPreview,
  onCancelCourse,
  isDirty,
  saveError,
  onSave,
  onCancel,
}: CourseSettingsTabProps) => {
  const minParticipants = Math.max(currentEnrolled || 1, 1);
  const [participantsInput, setParticipantsInput] = useState(String(maxParticipants));

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
    <div className="space-y-8">
      <section className="space-y-3">
        <div>
          <h3 className="type-title text-foreground">Generelt</h3>
          <p className="type-body-sm text-muted-foreground">Oppdater navn, beskrivelse og forsidebilde for kurset.</p>
        </div>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="space-y-4">
            <div>
              <label htmlFor="settings-title" className="type-label-sm mb-1.5 block text-foreground">Navn på kurs</label>
              <Input
                id="settings-title"
                type="text"
                value={settingsTitle}
                onChange={(e) => onTitleChange(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="settings-description" className="type-label-sm mb-1.5 block text-foreground">Beskrivelse</label>
              <Textarea
                id="settings-description"
                rows={6}
                value={settingsDescription}
                onChange={(e) => onDescriptionChange(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div>
              <h4 className="type-label text-foreground">Kursbilde</h4>
              <p className="type-body-sm text-muted-foreground">Vises på kurssiden og i oversikten.</p>
            </div>
            <div className="relative min-h-[200px] overflow-hidden rounded-lg bg-surface">
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
          </div>
        </div>
      </section>

      <Separator />

      <section className="space-y-3">
        <div>
          <h3 className="type-title text-foreground">Tid og kapasitet</h3>
          <p className="type-body-sm text-muted-foreground">Juster tidspunkt, varighet og hvor mange deltakere kurset har plass til.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="type-label-sm mb-1.5 block text-foreground">Dato</label>
            <DatePicker
              value={settingsDate}
              onChange={onDateChange}
              placeholder="Velg dato"
            />
          </div>
          <div>
            <label className="type-label-sm mb-1.5 block text-foreground">Tidspunkt</label>
            <TimePicker
              value={settingsTime}
              onChange={(time) => onTimeChange(time)}
            />
          </div>
          <div>
            <label id="settings-duration-label" className="type-label-sm mb-1.5 block text-foreground">Varighet</label>
            <Select
              value={settingsDuration?.toString() || ""}
              onValueChange={(val) => onDurationChange(parseInt(val))}
            >
              <SelectTrigger aria-labelledby="settings-duration-label" className="w-full h-11 border-input">
                <SelectValue placeholder="Velg" />
              </SelectTrigger>
              <SelectContent>
                {[15, 30, 45, 60, 75, 90, 105, 120, 150, 180, 210, 240].map((mins) => (
                  <SelectItem key={mins} value={mins.toString()}>
                    {mins < 60
                      ? `${mins} min`
                      : mins % 60 === 0
                        ? (mins === 60 ? '1 time' : `${mins / 60} timer`)
                        : `${Math.floor(mins / 60)}t ${mins % 60}min`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="type-label-sm mb-1.5 block text-foreground">Kapasitet</label>
            <Input
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
              className="text-left"
              aria-label="Antall plasser"
            />
            {currentEnrolled > 0 && (
              <div className="mt-1.5 flex items-center gap-1.5">
                <p className="type-meta text-muted-foreground">
                  {currentEnrolled} påmeldt{currentEnrolled > 1 ? 'e' : ''} akkurat nå
                </p>
                <InfoTooltip content={`Kan ikke settes lavere enn ${currentEnrolled} fordi det allerede er ${currentEnrolled} påmeldt${currentEnrolled > 1 ? 'e' : ''}.`} />
              </div>
            )}
          </div>
        </div>
        {currentEnrolled > 0 && maxParticipants <= currentEnrolled && (
          <Alert variant="warning" size="sm" icon={false}>
            <p className="type-meta text-status-warning-text">
              Kan ikke reduseres under {currentEnrolled} påmeldt{currentEnrolled > 1 ? 'e' : ''}.
            </p>
          </Alert>
        )}
      </section>

      <Separator />

      <section className="space-y-3">
        <div>
          <h3 className="type-title text-foreground">Praktisk info</h3>
          <p className="type-body-sm text-muted-foreground">Hjelp deltakerne å møte forberedt med tydelig informasjon.</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="type-label-sm mb-2.5 block text-foreground">Nivå</label>
            <div className="flex flex-wrap gap-2">
              {AUDIENCE_LEVEL_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onAudienceLevelChange(opt.value)}
                  className={cn(
                    'type-meta rounded-md border px-3 py-1.5 smooth-transition',
                    settingsAudienceLevel === opt.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border hover:border-input hover:text-foreground'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="type-meta mt-1.5 text-muted-foreground">
              Velg det laveste nivået som passer.
            </p>
          </div>

          <div>
            <label className="type-label-sm mb-2.5 block text-foreground">Utstyr</label>
            <RadioGroup
              value={settingsEquipment}
              onValueChange={(val) => onEquipmentChange(val as EquipmentInfo)}
            >
              {EQUIPMENT_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex cursor-pointer items-center gap-2.5 py-0.5">
                  <RadioGroupItem value={opt.value} />
                  <span className="type-body text-foreground">{opt.label}</span>
                </label>
              ))}
            </RadioGroup>
          </div>

          <div>
            <label className="type-label-sm mb-1.5 block text-foreground">Oppmøte før start</label>
            <Select
              value={settingsArrivalMinutes || ARRIVAL_NONE_VALUE}
              onValueChange={(val) => onArrivalMinutesChange(val === ARRIVAL_NONE_VALUE ? '' : val)}
            >
              <SelectTrigger className="h-11 w-full sm:w-48 border-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ARRIVAL_PRESET_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="type-label-sm mb-1.5 block text-foreground">Egne punkter</label>
            <div className="space-y-2">
              {settingsCustomBullets.map((bullet, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    type="text"
                    value={bullet}
                    maxLength={CUSTOM_BULLET_MAX_LENGTH}
                    placeholder={CUSTOM_BULLET_PLACEHOLDERS[i] || CUSTOM_BULLET_PLACEHOLDERS[0]}
                    onChange={(e) => {
                      const updated = [...settingsCustomBullets];
                      updated[i] = e.target.value;
                      onCustomBulletsChange(updated);
                    }}
                    className="type-body flex-1 h-9"
                  />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    type="button"
                    onClick={() => onCustomBulletsChange(settingsCustomBullets.filter((_, j) => j !== i))}
                    className="text-muted-foreground hover:text-destructive hover:bg-transparent"
                    aria-label={`Fjern punkt ${i + 1}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              {settingsCustomBullets.length < CUSTOM_BULLETS_MAX_COUNT && (
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => onCustomBulletsChange([...settingsCustomBullets, ''])}
                  className="type-meta text-muted-foreground h-auto p-0 hover:bg-transparent hover:text-foreground"
                >
                  <Plus className="h-3 w-3" />
                  Legg til
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      <Separator className="mt-2" />

      <section className="space-y-3">
        <div>
          <h3 className="type-title text-foreground">Avlys kurs</h3>
          <p className="type-body-sm text-muted-foreground">Bruk dette bare hvis kurset ikke skal gjennomføres.</p>
        </div>
        <div className="flex flex-col justify-between gap-4 rounded-lg bg-surface-subtle px-4 py-4 sm:flex-row sm:items-center">
          <div className="space-y-1">
            <p className="type-label text-foreground">Dette kan ikke angres.</p>
            <p className="type-body-sm text-muted-foreground">
              {refundPreview.count > 0
                ? `${refundPreview.count} deltaker${refundPreview.count !== 1 ? 'e' : ''} vil bli refundert og varslet.`
                : 'Kurset vil bli avlyst.'}
            </p>
          </div>
          <Button
            variant="destructive-outline"
            size="compact"
            className="shrink-0 whitespace-nowrap"
            onClick={onCancelCourse}
          >
            Avlys kurs
          </Button>
        </div>
      </section>

      <div className="flex justify-end gap-3 pt-2">
        {saveError && (
          <Alert variant="error" size="sm" icon={Info} className="mr-auto">
            <span className="type-body text-status-error-text">{saveError}</span>
          </Alert>
        )}

        <Button
          variant="ghost"
          size="compact"
          onClick={onCancel}
          disabled={isSaving}
        >
          Avbryt
        </Button>
        <Button
          size="compact"
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
  );
};
