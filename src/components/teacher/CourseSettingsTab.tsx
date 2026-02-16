import { Plus, Minus, Info, X } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
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
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Tile 1: Main Info (Title, Desc) - Span 2 */}
      <div className="lg:col-span-2 bg-white rounded-2xl border border-zinc-200 p-6 h-full flex flex-col">
        <div className="mb-6">
          <h3 className="text-base font-medium text-text-primary">Generelt</h3>
        </div>

        <div className="space-y-4 flex-1">
          <div>
            <label className="block text-xs font-medium text-text-tertiary mb-1.5">Navn på kurs</label>
            <Input
              type="text"
              value={settingsTitle}
              onChange={(e) => onTitleChange(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-tertiary mb-1.5">Beskrivelse</label>
            <Textarea
              rows={6}
              value={settingsDescription}
              onChange={(e) => onDescriptionChange(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Tile 2: Media (Image) - Span 1, Row Span 2 */}
      <div className="lg:col-span-1 lg:row-span-2 bg-white rounded-2xl border border-zinc-200 p-6 flex flex-col h-full">
        <div className="mb-6">
          <h3 className="text-base font-medium text-text-primary">Kursbilde</h3>
        </div>
        <div className="flex-1 min-h-[200px] flex flex-col">
          <div className="flex-1 relative rounded-lg overflow-hidden bg-input-bg">
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
              className="h-full w-full absolute inset-0"
            />
          </div>
        </div>
      </div>

      {/* Tile 3: Schedule - Span 1 */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6 flex flex-col">
        <div className="mb-6">
          <h3 className="text-base font-medium text-text-primary">Tidspunkt</h3>
        </div>
        <div className="space-y-4 flex-1">
          <div>
            <label className="block text-xs font-medium text-text-tertiary mb-1.5">Dato</label>
            <DatePicker
              value={settingsDate}
              onChange={onDateChange}
              placeholder="Velg dato"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-tertiary mb-1.5">Tidspunkt</label>
            <TimePicker
              value={settingsTime}
              onChange={(time) => onTimeChange(time)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-tertiary mb-1.5">Varighet</label>
            <Select
              value={settingsDuration?.toString() || ""}
              onValueChange={(val) => onDurationChange(parseInt(val))}
            >
              <SelectTrigger className="w-full h-11 bg-input-bg border-zinc-300">
                <SelectValue placeholder="Velg" />
              </SelectTrigger>
              <SelectContent>
                {[15, 30, 45, 60, 75, 90, 105, 120, 150, 180, 210, 240].map((mins) => (
                  <SelectItem key={mins} value={mins.toString()}>
                    {mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)} t ${mins % 60 > 0 ? `${mins % 60} min` : ''}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Tile 4: Capacity - Span 1 */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6 flex flex-col">
        <div className="mb-6">
          <h3 className="text-base font-medium text-text-primary">Kapasitet</h3>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-2">
          <div className="flex items-center gap-4">
            <Button
              variant="outline-soft"
              size="icon"
              onClick={() => onMaxParticipantsChange(Math.max(currentEnrolled || 1, maxParticipants - 1))}
              disabled={maxParticipants <= (currentEnrolled || 1)}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <div className="text-center">
              <span className="block text-3xl font-normal text-text-primary tracking-tight">{maxParticipants}</span>
              <span className="text-xs text-text-secondary font-medium">Plasser</span>
            </div>
            <Button
              variant="outline-soft"
              size="icon"
              onClick={() => onMaxParticipantsChange(maxParticipants + 1)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {/* Capacity warning - shows when at minimum */}
          {currentEnrolled > 0 && maxParticipants <= currentEnrolled && (
            <Alert variant="warning" size="sm" icon={false} className="mt-2 justify-center">
              <p className="text-xs text-status-warning-text text-center">
                Kan ikke reduseres – {currentEnrolled} påmeldt{currentEnrolled > 1 ? 'e' : ''}
              </p>
            </Alert>
          )}
        </div>
      </div>

      {/* Tile 5: Practical Info - Span 3 */}
      <div className="lg:col-span-3 bg-white rounded-2xl border border-zinc-200 p-6 flex flex-col">
        <div className="mb-6">
          <h3 className="text-base font-medium text-text-primary">Praktisk info</h3>
          <p className="text-xs text-text-secondary mt-1">Hjelp elevene dine med å komme forberedt</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 flex-1">
          {/* Audience Level - Segmented pills (single-select) */}
          <div>
            <label className="block text-xs font-medium text-text-tertiary mb-2.5">Nivå</label>
            <div className="flex flex-wrap gap-2">
              {AUDIENCE_LEVEL_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onAudienceLevelChange(opt.value)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs border smooth-transition',
                    settingsAudienceLevel === opt.value
                      ? 'bg-zinc-900 text-white border-zinc-900'
                      : 'bg-white text-text-secondary border-zinc-200 hover:border-zinc-300 hover:text-text-primary'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-text-tertiary mt-1.5">
              Velg det laveste nivået som passer.
            </p>
          </div>

          {/* Equipment - Radio buttons (single factual statement) */}
          <div>
            <label className="block text-xs font-medium text-text-tertiary mb-2.5">Utstyr</label>
            <RadioGroup
              value={settingsEquipment}
              onValueChange={(val) => onEquipmentChange(val as EquipmentInfo)}
            >
              {EQUIPMENT_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer py-0.5">
                  <RadioGroupItem value={opt.value} />
                  <span className="text-sm text-text-primary">{opt.label}</span>
                </label>
              ))}
            </RadioGroup>
          </div>

          {/* Arrival - Dropdown select */}
          <div>
            <label className="block text-xs font-medium text-text-tertiary mb-1.5">Oppmøte før start</label>
            <Select
              value={settingsArrivalMinutes || ARRIVAL_NONE_VALUE}
              onValueChange={(val) => onArrivalMinutesChange(val === ARRIVAL_NONE_VALUE ? '' : val)}
            >
              <SelectTrigger className="w-48 h-11 bg-input-bg border-zinc-300">
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

          {/* Custom Bullets */}
          <div>
            <label className="block text-xs font-medium text-text-tertiary mb-1.5">Egne punkter</label>
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
                    className="flex-1 h-9 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => onCustomBulletsChange(settingsCustomBullets.filter((_, j) => j !== i))}
                    className="text-text-tertiary hover:text-destructive p-1 smooth-transition"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {settingsCustomBullets.length < CUSTOM_BULLETS_MAX_COUNT && (
                <button
                  type="button"
                  onClick={() => onCustomBulletsChange([...settingsCustomBullets, ''])}
                  className="text-xs text-text-secondary hover:text-text-primary flex items-center gap-1 smooth-transition"
                >
                  <Plus className="h-3 w-3" />
                  Legg til
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tile 6: Danger Zone - Span 3 */}
      <Alert variant="error" icon={false} className="lg:col-span-3 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <AlertTitle variant="error" className="text-sm">Avlys kurs</AlertTitle>
            <AlertDescription variant="error">
              {refundPreview.count > 0
                ? `${refundPreview.count} deltaker${refundPreview.count !== 1 ? 'e' : ''} vil bli refundert og varslet.`
                : 'Kurset vil bli avlyst.'}
            </AlertDescription>
          </div>
          <Button
            variant="outline-soft"
            size="compact"
            className="border-status-error-border text-status-error-text hover:bg-status-error-bg whitespace-nowrap shrink-0"
            onClick={onCancelCourse}
          >
            Avlys kurs
          </Button>
        </div>
      </Alert>

      {/* Actions Bar */}
      <div className="lg:col-span-3 flex justify-end gap-3 pt-2">
        {saveError && (
          <Alert variant="error" size="sm" icon={Info} className="mr-auto">
            <span className="text-sm text-status-error-text">{saveError}</span>
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
          onClick={onSave}
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
