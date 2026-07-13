import { useState } from 'react';
import { Calendar, Clock } from '@/lib/icons';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { SegmentedTabs } from '@/components/teacher/SegmentedTabs';
import {
  SessionDaysEditor,
  newSessionDay,
  timeToMin,
  ALL_TIME_SLOTS,
  endTimeSlotsFor,
  type SessionDay,
} from '@/components/teacher/SessionDaysEditor';
import { SectionHeader, FieldRow, CoverDrop, FORMAT_TABS } from './CourseBuilderConceptsPreview';
import { DevPage } from './_kit';

type FormatType = 'single' | 'series';

/**
 * /dev/course-builder-wizard — create-course in a right-side drawer (Sheet):
 * lightweight, keeps the teacher on their list. Sticky header + pinned footer,
 * the sectioned form scrolls between them with hairline dividers. Real form
 * components (SegmentedTabs, RichTextEditor, SessionDaysEditor / series fields).
 */
export default function CourseBuilderWizardPreview() {
  const [open, setOpen] = useState(true);
  const [format, setFormat] = useState<FormatType>('single');
  const [description, setDescription] = useState('');
  const [sessionDays, setSessionDays] = useState<SessionDay[]>(() => [newSessionDay()]);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [weeks, setWeeks] = useState('8');

  return (
    <DevPage title="Kursbygger — drawer" bleed>
      {/* Stand-in for the page the drawer opens over. */}
      <div className="flex min-h-[calc(100vh-73px)] items-center justify-center bg-canvas p-8">
        <Button onClick={() => setOpen(true)}>Nytt kurs</Button>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full gap-0">
          <SheetHeader>
            <SheetTitle>Nytt kurs</SheetTitle>
          </SheetHeader>

          <div className="@container min-h-0 flex-1 overflow-y-auto px-6">
            <div className="divide-y divide-border-subtle">
              <section className="space-y-3 py-6">
                <SectionHeader
                  title="Type"
                  description="Enkelttime for én økt, eller kursrekke over flere uker."
                />
                <SegmentedTabs<FormatType>
                  value={format}
                  onChange={setFormat}
                  tabs={FORMAT_TABS}
                  ariaLabel="Type"
                  role="radiogroup"
                  stretch
                />
              </section>

              <section className="space-y-3 py-6">
                <CoverDrop />
              </section>

              <section className="space-y-5 py-6">
                <FieldRow label="Tittel">
                  <Input defaultValue="Morgenyoga" />
                </FieldRow>
                <FieldRow label="Beskrivelse">
                  <RichTextEditor value={description} onChange={setDescription} />
                </FieldRow>
              </section>

              <section className="space-y-5 py-6">
                {format === 'single' ? (
                  <SessionDaysEditor value={sessionDays} onChange={setSessionDays} />
                ) : (
                  <>
                    <FieldRow label="Startdato">
                      <DatePicker
                        value={startDate}
                        onChange={setStartDate}
                        placeholder="Velg dato"
                        fromDate={new Date()}
                        icon={Calendar}
                      />
                    </FieldRow>
                    <fieldset>
                      <legend className="mb-2 block text-sm font-medium text-foreground">Tidspunkt</legend>
                      <div className="flex items-center gap-2">
                        <Select
                          value={startTime}
                          onValueChange={(v) => {
                            setStartTime(v);
                            if (endTime && timeToMin(endTime) <= timeToMin(v)) setEndTime('');
                          }}
                        >
                          <SelectTrigger className="w-full gap-2.5" aria-label="Starttid">
                            <Clock className="size-5 shrink-0 text-foreground-subtle" strokeWidth={1.75} />
                            <SelectValue placeholder="Start" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            {ALL_TIME_SLOTS.map((slot) => (
                              <SelectItem key={slot} value={slot}>
                                {slot}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span aria-hidden className="shrink-0 text-base font-medium text-foreground-muted">
                          –
                        </span>
                        <Select value={endTime} onValueChange={setEndTime}>
                          <SelectTrigger className="w-full gap-2.5" aria-label="Sluttid">
                            <Clock className="size-5 shrink-0 text-foreground-subtle" strokeWidth={1.75} />
                            <SelectValue placeholder="Slutt" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            {endTimeSlotsFor(startTime).map((slot) => (
                              <SelectItem key={slot} value={slot}>
                                {slot}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </fieldset>
                    <FieldRow label="Antall uker">
                      <Input
                        type="number"
                        inputMode="numeric"
                        min="2"
                        max="50"
                        value={weeks}
                        onChange={(e) => setWeeks(e.target.value)}
                      />
                    </FieldRow>
                  </>
                )}
              </section>

              <section className="space-y-5 py-6">
                <FieldRow label="Sted">
                  <Input defaultValue="Flow Studio, Oslo" />
                </FieldRow>
                <div className="grid gap-4 @sm:grid-cols-2">
                  <FieldRow label="Antall plasser">
                    <Input defaultValue="12" inputMode="numeric" />
                  </FieldRow>
                  <FieldRow label="Pris">
                    <Input defaultValue="350" inputMode="numeric" className="tabular-nums" />
                  </FieldRow>
                </div>
              </section>
            </div>
          </div>

          <SheetFooter className="flex-row items-center justify-end gap-2">
            <Button variant="secondary">Lagre utkast</Button>
            <Button>Publiser</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </DevPage>
  );
}
