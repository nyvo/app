import { Plus, Minus, Info } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ImageUpload } from '@/components/ui/image-upload';
import { DatePicker } from '@/components/ui/date-picker';
import { TimePicker } from '@/components/ui/time-picker';
import { DurationPicker } from '@/components/ui/duration-picker';

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
  organizationId?: string;
  excludeCourseId?: string;

  // Capacity
  maxParticipants: number;
  onMaxParticipantsChange: (value: number) => void;
  currentEnrolled: number;

  // Danger zone
  refundPreview: { count: number };
  onCancelCourse: () => void;

  // Actions
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
  organizationId,
  excludeCourseId,
  maxParticipants,
  onMaxParticipantsChange,
  currentEnrolled,
  refundPreview,
  onCancelCourse,
  saveError,
  onSave,
  onCancel,
}: CourseSettingsTabProps) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Tile 1: Main Info (Title, Desc) - Span 2 */}
      <div className="lg:col-span-2 bg-white rounded-xl border border-border p-6 h-full flex flex-col">
        <div className="mb-6">
          <h3 className="text-base font-medium text-text-primary">Generelt</h3>
        </div>

        <div className="space-y-4 flex-1">
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider text-text-tertiary mb-1.5">Navn på kurs</label>
            <Input
              type="text"
              value={settingsTitle}
              onChange={(e) => onTitleChange(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider text-text-tertiary mb-1.5">Beskrivelse</label>
            <textarea
              rows={6}
              className="w-full p-3 rounded-xl border border-border text-sm focus:border-ring focus:outline-none focus:ring-4 focus:ring-border/30 focus:bg-white bg-input-bg hover:border-ring ios-ease resize-none"
              value={settingsDescription}
              onChange={(e) => onDescriptionChange(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Tile 2: Media (Image) - Span 1, Row Span 2 */}
      <div className="lg:col-span-1 lg:row-span-2 bg-white rounded-xl border border-border p-6 flex flex-col h-full">
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
      <div className="bg-white rounded-xl border border-border p-6 flex flex-col">
        <div className="mb-6">
          <h3 className="text-base font-medium text-text-primary">Tidspunkt</h3>
        </div>
        <div className="space-y-4 flex-1">
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider text-text-tertiary mb-1.5">Dato</label>
            <DatePicker
              value={settingsDate}
              onChange={onDateChange}
              placeholder="Velg dato"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider text-text-tertiary mb-1.5">Tidspunkt</label>
            <TimePicker
              value={settingsTime}
              onChange={(time) => onTimeChange(time)}
              date={settingsDate}
              organizationId={organizationId}
              duration={settingsDuration || 60}
              excludeCourseId={excludeCourseId}
              placeholder="Velg tid"
            />
          </div>
          <div>
            <DurationPicker
              value={settingsDuration}
              onChange={onDurationChange}
              label="Varighet"
            />
          </div>
        </div>
      </div>

      {/* Tile 4: Capacity - Span 1 */}
      <div className="bg-white rounded-xl border border-border p-6 flex flex-col">
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
              <span className="text-xxs text-muted-foreground uppercase tracking-wider font-medium">Plasser</span>
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
            <div className="rounded-lg border border-status-warning-border bg-status-warning-bg/30 px-3 py-2 mt-2">
              <p className="text-xs text-status-warning-text text-center">
                Kan ikke reduseres – {currentEnrolled} påmeldt{currentEnrolled > 1 ? 'e' : ''}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Tile 5: Danger Zone - Span 3 */}
      <div className="lg:col-span-3 rounded-xl border border-status-error-border bg-status-error-bg/30 p-6 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-medium text-status-error-text">Avlys kurs</h3>
            <p className="text-xs text-status-error-text/80 mt-1">
              {refundPreview.count > 0
                ? `${refundPreview.count} deltaker${refundPreview.count !== 1 ? 'e' : ''} vil bli refundert og varslet.`
                : 'Kurset vil bli avlyst.'}
            </p>
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
      </div>

      {/* Actions Bar */}
      <div className="lg:col-span-3 flex justify-end gap-3 pt-2">
        {saveError && (
          <div className="flex items-center gap-2 text-sm text-status-error-text bg-status-error-bg/30 border border-status-error-border rounded-lg px-4 py-2 mr-auto">
            <Info className="h-4 w-4 shrink-0" />
            {saveError}
          </div>
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
          disabled={isSaving}
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
