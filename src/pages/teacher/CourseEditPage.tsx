import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { ArrowLeft } from '@/lib/icons';
import { pageVariants, pageTransition } from '@/lib/motion';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MobileTeacherHeader } from '@/components/teacher/MobileTeacherHeader';
import { useTeacherShell } from '@/components/teacher/TeacherShellContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCourseDetail } from '@/hooks/use-course-detail';
import { CourseSettingsTab } from '@/components/teacher/CourseSettingsTab';
import {
  updateCourse,
  cancelCourse,
  fetchCourseSessions,
  updateCourseSession,
} from '@/services/courses';
import {
  uploadCourseImage,
  deleteCourseImage,
} from '@/services/storage';
import { friendlyError } from '@/lib/error-messages';
import { formatKroner } from '@/lib/utils';
import { ARRIVAL_MINUTES_MAX, CUSTOM_BULLET_MAX_LENGTH } from '@/utils/practicalInfoUtils';
import type { AudienceLevel, EquipmentInfo, PracticalInfo } from '@/types/practicalInfo';
import type { Json } from '@/types/database';
import { routes } from '@/lib/routes';

// ---------------------------------------------------------------------------
// Dedicated route for editing a course's settings — title, description,
// image, dates, capacity, practical info, plus the "cancel course" flow.
//
// All state that previously lived on CourseDetailPage as the "Innstillinger"
// tab now lives here. Detail page links here via "Endre kurs". Cancelling
// the course navigates to /teacher/courses (success). Saving stays on the
// page with a success toast.
// ---------------------------------------------------------------------------

const CourseEditPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentSeller } = useAuth();
  const { setBreadcrumbs } = useTeacherShell();

  const {
    course: courseData,
    sessions,
    participants,
    loading: isLoading,
    error,
    setCourse: setCourseData,
    setSessions,
    setMaxParticipants,
    maxParticipants,
  } = useCourseDetail(id);

  // Settings form state
  const [settingsTitle, setSettingsTitle] = useState('');
  const [settingsDescription, setSettingsDescription] = useState('');
  const [settingsImageUrl, setSettingsImageUrl] = useState<string | null>(null);
  const [settingsImageFile, setSettingsImageFile] = useState<File | null>(null);
  const [imageToDelete, setImageToDelete] = useState<string | null>(null);
  const [settingsTime, setSettingsTime] = useState('09:00');
  const [settingsDate, setSettingsDate] = useState<Date | undefined>(undefined);
  const [settingsDuration, setSettingsDuration] = useState<number | null>(60);
  const [settingsAudienceLevel, setSettingsAudienceLevel] = useState<AudienceLevel | ''>('');
  const [settingsEquipment, setSettingsEquipment] = useState<EquipmentInfo | ''>('');
  const [settingsArrivalMinutes, setSettingsArrivalMinutes] = useState('');
  const [settingsCustomBullets, setSettingsCustomBullets] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Cancel-course flow
  const [showCancelPreview, setShowCancelPreview] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setBreadcrumbs([
      { label: 'Hjem', to: routes.dashboard },
      { label: 'Kurs', to: routes.courses },
      { label: courseData?.title || 'Kursdetaljer', to: id ? routes.course(id) : undefined },
      { label: 'Endre' },
    ]);
    return () => setBreadcrumbs(null);
  }, [courseData?.title, id, setBreadcrumbs]);

  // Initialize form fields when courseData arrives.
  useEffect(() => {
    if (!courseData) return;
    setSettingsTitle(courseData.title);
    setSettingsDescription(courseData.description || '');
    setSettingsImageUrl(courseData.imageUrl);
    const timeMatch = courseData.timeSchedule.match(/(\d{1,2}:\d{2})/);
    if (timeMatch) setSettingsTime(timeMatch[1]);
    setSettingsDuration(courseData.durationMinutes);
    if (courseData.startDate) setSettingsDate(new Date(courseData.startDate));
    const pi = courseData.practicalInfo;
    setSettingsAudienceLevel(pi?.audience_level || '');
    setSettingsEquipment(pi?.equipment || '');
    setSettingsArrivalMinutes(pi?.arrival_minutes_before?.toString() || '');
    setSettingsCustomBullets(pi?.custom_bullets || []);
    // Only run when courseData identity changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseData]);

  const isSettingsDirty = useMemo(() => {
    if (!courseData) return false;
    if (settingsTitle !== courseData.title) return true;
    if (settingsDescription !== (courseData.description || '')) return true;
    if (settingsImageUrl !== courseData.imageUrl) return true;
    if (settingsImageFile !== null) return true;
    if (imageToDelete !== null) return true;
    if (maxParticipants !== courseData.capacity) return true;
    if (settingsDuration !== courseData.durationMinutes) return true;
    const origDate = courseData.startDate ? new Date(courseData.startDate).toDateString() : '';
    const currDate = settingsDate ? settingsDate.toDateString() : '';
    if (currDate !== origDate) return true;
    const origTimeMatch = courseData.timeSchedule.match(/(\d{1,2}:\d{2})/);
    const origTime = origTimeMatch ? origTimeMatch[1] : '';
    if (settingsTime !== origTime) return true;
    const pi = courseData.practicalInfo;
    if (settingsAudienceLevel !== (pi?.audience_level || '')) return true;
    if (settingsEquipment !== (pi?.equipment || '')) return true;
    if (settingsArrivalMinutes !== (pi?.arrival_minutes_before?.toString() || '')) return true;
    const origBullets = pi?.custom_bullets || [];
    if (settingsCustomBullets.length !== origBullets.length) return true;
    if (settingsCustomBullets.some((b, i) => b !== origBullets[i])) return true;
    return false;
  }, [
    courseData, settingsTitle, settingsDescription, settingsImageUrl,
    settingsImageFile, imageToDelete, maxParticipants, settingsDuration,
    settingsDate, settingsTime, settingsAudienceLevel, settingsEquipment,
    settingsArrivalMinutes, settingsCustomBullets,
  ]);

  const refundPreview = useMemo(() => {
    const paidSignups = participants.filter((p) => p.payment_status === 'paid');
    const totalRefund = paidSignups.reduce((sum, p) => sum + (p.amount_paid || 0), 0);
    return {
      participants: paidSignups,
      totalAmount: totalRefund,
      count: paidSignups.length,
    };
  }, [participants]);

  const handleSaveSettings = async () => {
    if (!id) return;
    setIsSaving(true);
    setSaveError(null);

    try {
      let newImageUrl = settingsImageUrl;

      if (imageToDelete && currentSeller?.id) {
        await deleteCourseImage(id, imageToDelete, currentSeller.id);
        setImageToDelete(null);
      }

      if (settingsImageFile) {
        const { url, error: uploadError } = await uploadCourseImage(id, settingsImageFile);
        if (uploadError) {
          setSaveError(uploadError.message);
          return;
        }
        newImageUrl = url;
        setSettingsImageFile(null);
      }

      let timeSchedule: string | undefined;
      if (settingsDate && settingsTime) {
        const dayName = new Intl.DateTimeFormat('nb-NO', { weekday: 'long' }).format(settingsDate);
        timeSchedule = `${dayName.charAt(0).toUpperCase() + dayName.slice(1)}er, ${settingsTime}`;
      }

      const practicalInfo: PracticalInfo = {};
      if (settingsAudienceLevel) practicalInfo.audience_level = settingsAudienceLevel;
      if (settingsEquipment) practicalInfo.equipment = settingsEquipment;
      const arrivalNum = parseInt(settingsArrivalMinutes);
      if (!isNaN(arrivalNum) && arrivalNum > 0 && arrivalNum <= ARRIVAL_MINUTES_MAX) {
        practicalInfo.arrival_minutes_before = arrivalNum;
      }
      const filteredBullets = settingsCustomBullets
        .filter((b) => b.trim())
        .map((b) => b.trim().slice(0, CUSTOM_BULLET_MAX_LENGTH));
      if (filteredBullets.length > 0) practicalInfo.custom_bullets = filteredBullets;
      const hasPracticalInfo = Object.keys(practicalInfo).length > 0;

      const updateData = {
        title: settingsTitle.trim(),
        description: settingsDescription.trim() || null,
        max_participants: maxParticipants,
        time_schedule: timeSchedule,
        image_url: newImageUrl,
        duration: settingsDuration,
        practical_info: hasPracticalInfo ? (practicalInfo as unknown as Json) : null,
      };

      const { error: updateError } = await updateCourse(id, updateData);
      if (updateError) {
        setSaveError(updateError.message || 'Kunne ikke lagre endringer. Prøv på nytt.');
        return;
      }

      // Cascade time change to all sessions if it changed
      if (settingsTime && sessions.length > 0) {
        const oldTime = sessions[0]?.start_time;
        if (oldTime && oldTime !== settingsTime) {
          const updatePromises = sessions.map((session) =>
            updateCourseSession(session.id, { start_time: settingsTime })
          );
          await Promise.all(updatePromises);
          const updatedSessions = await fetchCourseSessions(id);
          if (updatedSessions.data) setSessions(updatedSessions.data);
        }
      }

      setCourseData((prev) =>
        prev
          ? {
              ...prev,
              title: settingsTitle.trim(),
              description: settingsDescription.trim(),
              capacity: maxParticipants,
              timeSchedule: timeSchedule || prev.timeSchedule,
              imageUrl: newImageUrl,
              durationMinutes: settingsDuration || prev.durationMinutes,
              practicalInfo: hasPracticalInfo ? practicalInfo : null,
            }
          : null
      );
      setSettingsImageUrl(newImageUrl);
      toast.success('Endringer lagret');
    } catch {
      setSaveError('Noe gikk galt. Prøv på nytt.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCourse = async () => {
    if (!id) return;
    setIsDeleting(true);
    try {
      const { data: result, error: cancelError } = await cancelCourse(id, {
        notify_participants: true,
      });
      if (cancelError) {
        setSaveError(cancelError.message || 'Kunne ikke avlyse kurset');
        setShowCancelPreview(false);
        return;
      }
      const message = result
        ? `Kurset er avlyst. ${result.refunds_processed} refusjoner behandlet, ${result.notifications_sent} deltakere varslet.`
        : 'Kurset er avlyst.';
      setShowCancelPreview(false);
      toast.success('Kurs avlyst');
      navigate(routes.courses, { state: { message } });
    } catch (err) {
      setSaveError(friendlyError(err, 'Kunne ikke avlyse kurset. Prøv igjen.'));
      setShowCancelPreview(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <main className="flex-1 min-h-full overflow-y-auto bg-background">
        <MobileTeacherHeader title="Endre kurs" />
        <div className="px-6 lg:px-8 py-8 mx-auto w-full max-w-4xl">
          <Skeleton className="h-8 w-64 mb-3" />
          <Skeleton className="h-4 w-32 mb-8" />
          <Skeleton className="h-96 rounded-lg" />
        </div>
      </main>
    );
  }

  if (error || !courseData) {
    return (
      <main className="flex-1 min-h-full bg-background">
        <MobileTeacherHeader title="Endre kurs" />
        <div className="flex-1 flex items-center justify-center text-center py-24">
          <div>
            <h1 className="text-3xl font-semibold mb-2 text-foreground">Kurs ikke funnet</h1>
            <p className="text-sm text-muted-foreground">{error || 'Kurset finnes ikke eller har blitt slettet.'}</p>
            <Button
              variant="outline-soft"
              size="sm"
              className="mt-6"
              onClick={() => navigate(routes.courses)}
            >
              Tilbake til kurs
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="flex-1 min-h-full overflow-y-auto bg-background">
        <MobileTeacherHeader title="Endre kurs" />
        <motion.div
          variants={pageVariants}
          initial="initial"
          animate="animate"
          transition={pageTransition}
          className="px-6 pb-24 md:pb-8 lg:px-8"
        >
          <div className="mx-auto w-full max-w-4xl pt-6 lg:pt-8">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="mb-3 -ml-2 text-muted-foreground hover:text-foreground"
            >
              <Link to={id ? routes.course(id) : routes.courses}>
                <ArrowLeft className="size-3.5" />
                Tilbake til kurs
              </Link>
            </Button>
            <h1 className="text-3xl font-semibold text-foreground">Endre kurs</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Juster kursdetaljer for {courseData.title}.
            </p>

            <div className="mt-8">
              <CourseSettingsTab
                settingsTitle={settingsTitle}
                onTitleChange={setSettingsTitle}
                settingsDescription={settingsDescription}
                onDescriptionChange={setSettingsDescription}
                settingsImageUrl={settingsImageUrl}
                onImageFileChange={(file) => {
                  setSettingsImageFile(file);
                  if (!file && settingsImageUrl) {
                    setImageToDelete(settingsImageUrl);
                    setSettingsImageUrl(null);
                  }
                }}
                onImageRemove={() => {
                  if (settingsImageUrl) {
                    setImageToDelete(settingsImageUrl);
                    setSettingsImageUrl(null);
                  }
                }}
                isSaving={isSaving}
                settingsDate={settingsDate}
                onDateChange={setSettingsDate}
                settingsTime={settingsTime}
                onTimeChange={setSettingsTime}
                settingsDuration={settingsDuration}
                onDurationChange={setSettingsDuration}
                maxParticipants={maxParticipants}
                onMaxParticipantsChange={setMaxParticipants}
                currentEnrolled={courseData.enrolled || 0}
                settingsAudienceLevel={settingsAudienceLevel}
                onAudienceLevelChange={setSettingsAudienceLevel}
                settingsEquipment={settingsEquipment}
                onEquipmentChange={setSettingsEquipment}
                settingsArrivalMinutes={settingsArrivalMinutes}
                onArrivalMinutesChange={setSettingsArrivalMinutes}
                settingsCustomBullets={settingsCustomBullets}
                onCustomBulletsChange={setSettingsCustomBullets}
                refundPreview={refundPreview}
                onCancelCourse={() => setShowCancelPreview(true)}
                isDirty={isSettingsDirty}
                saveError={saveError}
                onSave={handleSaveSettings}
                onCancel={() => navigate(id ? routes.course(id) : routes.courses)}
              />
            </div>
          </div>
        </motion.div>
      </main>

      <AlertDialog open={showCancelPreview} onOpenChange={setShowCancelPreview}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Avlyse kurset?</AlertDialogTitle>
            <AlertDialogDescription>
              {refundPreview.count > 0
                ? `${refundPreview.count} deltaker${refundPreview.count !== 1 ? 'e' : ''} vil bli refundert og varslet på e-post.`
                : 'Kurset vil bli avlyst.'}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {refundPreview.count > 0 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <span className="text-xs font-medium tracking-wide block text-muted-foreground">
                  Refunderes
                </span>
                <div className="max-h-[200px] overflow-y-auto">
                  {refundPreview.participants.map((p, i) => (
                    <div
                      key={p.id}
                      className={cn(
                        'flex items-center justify-between py-3',
                        i < refundPreview.participants.length - 1 && 'border-b border-border'
                      )}
                    >
                      <span className="text-sm font-medium text-foreground">
                        {p.participant_name || p.participant_email}
                      </span>
                      <span className="text-sm tabular-nums text-muted-foreground">
                        {formatKroner(p.amount_paid)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted px-4 py-3">
                <span className="text-xs font-medium tracking-wide text-muted-foreground">
                  Total refusjon
                </span>
                <span className="text-sm font-medium tabular-nums text-foreground">
                  {formatKroner(refundPreview.totalAmount)}
                </span>
              </div>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Avbryt</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={(e) => {
                e.preventDefault();
                handleDeleteCourse();
              }}
              disabled={isDeleting}
              loading={isDeleting}
              loadingText={
                refundPreview.count > 0
                  ? `Behandler ${refundPreview.count} refusjon${refundPreview.count > 1 ? 'er' : ''}`
                  : 'Avlyser'
              }
            >
              Avlys kurs
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default CourseEditPage;
