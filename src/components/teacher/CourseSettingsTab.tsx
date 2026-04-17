import { useEffect, useState, useMemo } from 'react';
import { Plus, Info, X } from '@/lib/icons';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Generelt</CardTitle>
          <CardDescription>Oppdater navn, beskrivelse og forsidebilde for kurset.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="space-y-4">
              <div>
                <label htmlFor="settings-title" className="text-xs font-medium mb-1.5 block text-foreground">Navn på kurs</label>
                <Input
                  id="settings-title"
                  type="text"
                  value={settingsTitle}
                  onChange={(e) => onTitleChange(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="settings-description" className="text-xs font-medium mb-1.5 block text-foreground">Beskrivelse</label>
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
                <h4 className="text-sm font-medium text-foreground">Kursbilde</h4>
                <p className="text-sm text-muted-foreground">Vises på kurssiden og i oversikten.</p>
              </div>
              <div className="relative min-h-[200px] overflow-hidden rounded-lg bg-muted">
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tid og kapasitet</CardTitle>
          <CardDescription>Juster tidspunkt, varighet og hvor mange deltakere kurset har plass til.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="text-xs font-medium mb-1.5 block text-foreground">Dato</label>
            <DatePicker
              value={settingsDate}
              onChange={onDateChange}
              placeholder="Velg dato"
            />
          </div>
          <div>
            <label className="text-xs font-medium mb-1.5 block text-foreground">Tidspunkt</label>
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
              <span className="text-sm font-medium shrink-0 text-muted-foreground">–</span>
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
          <div>
            <label className="text-xs font-medium mb-1.5 block text-foreground">Kapasitet</label>
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
                <p className="text-xs font-medium tracking-wide text-muted-foreground">
                  {currentEnrolled} påmeldt{currentEnrolled > 1 ? 'e' : ''} akkurat nå
                </p>
                <InfoTooltip content={`Kan ikke settes lavere enn ${currentEnrolled} fordi det allerede er ${currentEnrolled} påmeldt${currentEnrolled > 1 ? 'e' : ''}.`} />
              </div>
            )}
          </div>
        </div>
          {currentEnrolled > 0 && maxParticipants <= currentEnrolled && (
            <Alert variant="warning" size="sm" icon={false}>
              <p className="text-xs font-medium tracking-wide text-destructive">
                Kan ikke reduseres under {currentEnrolled} påmeldt{currentEnrolled > 1 ? 'e' : ''}.
              </p>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Praktisk info</CardTitle>
          <CardDescription>Hjelp deltakerne å møte forberedt med tydelig informasjon.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium mb-2.5 block text-foreground">Nivå</label>
            <ToggleGroup
              type="single"
              value={settingsAudienceLevel}
              onValueChange={(value) => onAudienceLevelChange((value || '') as AudienceLevel | '')}
              variant="pill"
              spacing={1}
              className="gap-1.5"
              aria-label="Velg nivå"
            >
              {AUDIENCE_LEVEL_OPTIONS.map((opt) => (
                <ToggleGroupItem key={opt.value} value={opt.value}>
                  {opt.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <p className="text-xs font-medium tracking-wide mt-1.5 text-muted-foreground">
              Velg det laveste nivået som passer.
            </p>
          </div>

          <div>
            <label className="text-xs font-medium mb-2.5 block text-foreground">Utstyr</label>
            <RadioGroup
              value={settingsEquipment}
              onValueChange={(val) => onEquipmentChange(val as EquipmentInfo)}
            >
              {EQUIPMENT_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex cursor-pointer items-center gap-2.5 py-0.5">
                  <RadioGroupItem value={opt.value} />
                  <span className="text-sm text-foreground">{opt.label}</span>
                </label>
              ))}
            </RadioGroup>
          </div>

          <div>
            <label className="text-xs font-medium mb-1.5 block text-foreground">Oppmøte før start</label>
            <Select
              value={settingsArrivalMinutes || ARRIVAL_NONE_VALUE}
              onValueChange={(val) => onArrivalMinutesChange(val === ARRIVAL_NONE_VALUE ? '' : val)}
            >
              <SelectTrigger className="w-full sm:w-48 border-input">
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
            <label className="text-xs font-medium mb-1.5 block text-foreground">Egne punkter</label>
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
                    className="text-sm flex-1 h-9"
                  />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    type="button"
                    onClick={() => onCustomBulletsChange(settingsCustomBullets.filter((_, j) => j !== i))}
                    className="text-muted-foreground hover:text-destructive hover:bg-transparent"
                    aria-label={`Fjern punkt ${i + 1}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {settingsCustomBullets.length < CUSTOM_BULLETS_MAX_COUNT && (
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => onCustomBulletsChange([...settingsCustomBullets, ''])}
                  className="text-sm text-muted-foreground h-auto p-0 hover:bg-transparent hover:text-foreground"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Legg til punkt
                </Button>
              )}
            </div>
          </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Avlys kurs</CardTitle>
          <CardDescription>Bruk dette bare hvis kurset ikke skal gjennomføres.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col justify-between gap-4 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-4 sm:flex-row sm:items-center">
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Dette kan ikke angres.</p>
              <p className="text-sm text-muted-foreground">
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
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3 pt-2">
        {saveError && (
          <Alert variant="error" size="sm" icon={Info} className="mr-auto">
            <span className="text-sm text-destructive">{saveError}</span>
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
