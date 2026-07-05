import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { MobileTeacherHeader } from '@/components/teacher/MobileTeacherHeader';
import { PageShell } from '@/components/teacher/PageShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { sendSupportMessage } from '@/services/support';
import {
  fetchSupportCourses,
  fetchSupportSignups,
  type SupportCourseOption,
  type SupportSignupOption,
} from '@/services/support-context';

const SUBJECTS = [
  'Kurs og påmeldinger',
  'Betaling og utbetaling',
  'Studio og innstillinger',
  'Innlogging og konto',
  'Annet',
] as const;

const COURSE_SIGNUP_SUBJECT = 'Kurs og påmeldinger';

export default function HelpPage() {
  const { currentSeller } = useAuth();
  const [subject, setSubject] = useState<string>('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [courses, setCourses] = useState<SupportCourseOption[]>([]);
  const [signups, setSignups] = useState<SupportSignupOption[]>([]);
  const [courseId, setCourseId] = useState('');
  const [signupId, setSignupId] = useState('');
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingSignups, setLoadingSignups] = useState(false);

  const canSubmit = subject.length > 0 && message.trim().length > 0;
  // Only show the course context fields when the subject calls for them AND
  // the user has something to pick. Drop the empty select if there's nothing.
  const showCourseFields =
    subject === COURSE_SIGNUP_SUBJECT &&
    !!currentSeller?.id &&
    (loadingCourses || courses.length > 0);
  const showSignupField =
    !!courseId && (loadingSignups || signups.length > 0);

  useEffect(() => {
    setCourseId('');
    setSignupId('');
    setSignups([]);

    if (subject !== COURSE_SIGNUP_SUBJECT || !currentSeller?.id) {
      setCourses([]);
      return;
    }

    let cancelled = false;
    setLoadingCourses(true);
    void fetchSupportCourses(currentSeller.id).then(({ data, error }) => {
      if (cancelled) return;
      setLoadingCourses(false);
      if (error) {
        toast.error('Kunne ikke hente kurs');
        return;
      }
      setCourses(data);
    });

    return () => {
      cancelled = true;
    };
  }, [subject, currentSeller?.id]);

  useEffect(() => {
    setSignupId('');
    setSignups([]);

    if (!courseId) return;

    let cancelled = false;
    setLoadingSignups(true);
    void fetchSupportSignups(courseId).then(({ data, error }) => {
      if (cancelled) return;
      setLoadingSignups(false);
      if (error) {
        toast.error('Kunne ikke hente påmeldinger');
        return;
      }
      setSignups(data);
    });

    return () => {
      cancelled = true;
    };
  }, [courseId]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || submitting) return;

    setSubmitting(true);
    const { error } = await sendSupportMessage({
      subject,
      message: message.trim(),
      sellerId: currentSeller?.id ?? null,
      courseId: courseId || null,
      signupId: signupId || null,
    });
    setSubmitting(false);

    if (error) {
      toast.error(error.message || 'Kunne ikke sende meldingen.');
      return;
    }

    setSubject('');
    setMessage('');
    setCourseId('');
    setSignupId('');
    toast.success('Meldingen er sendt');
  }

  return (
    <main className="flex-1 min-h-full overflow-y-auto bg-canvas">
      <MobileTeacherHeader />

      <PageShell
        narrow="centered"
        title="Hjelp"
        description="Send oss en melding, så hjelper vi deg videre."
      >
        <Card>
          <CardContent>
          <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="help-subject" className="text-sm font-medium text-foreground">
                Hva gjelder det?
              </label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger id="help-subject" className="w-full">
                  <SelectValue placeholder="Velg emne" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {SUBJECTS.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {showCourseFields && (
              <>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="help-course" className="text-sm font-medium text-foreground">
                    Gjelder kurs
                  </label>
                  <Select value={courseId} onValueChange={setCourseId} disabled={loadingCourses}>
                    <SelectTrigger id="help-course" className="w-full">
                      <SelectValue placeholder={loadingCourses ? 'Henter kurs…' : 'Velg kurs'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {courses.map((course) => (
                          <SelectItem key={course.id} value={course.id}>
                            {course.title}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                {showSignupField && (
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="help-signup" className="text-sm font-medium text-foreground">
                      Gjelder påmelding
                    </label>
                    <Select value={signupId} onValueChange={setSignupId} disabled={loadingSignups}>
                      <SelectTrigger id="help-signup" className="w-full">
                        <SelectValue placeholder={loadingSignups ? 'Henter påmeldinger…' : 'Valgfritt'} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {signups.map((signup) => (
                            <SelectItem key={signup.id} value={signup.id}>
                              {signup.participantName} · {signup.participantEmail}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}

            <div className="flex flex-col gap-1.5">
              <label htmlFor="help-message" className="text-sm font-medium text-foreground">
                Melding
              </label>
              <Textarea
                id="help-message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={8}
                placeholder="Hva trenger du hjelp med?"
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={!canSubmit || submitting}>
                {submitting ? 'Sender…' : 'Send'}
              </Button>
            </div>
          </form>
          </CardContent>
        </Card>
      </PageShell>
    </main>
  );
}
