import { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { MobileTeacherHeader } from '@/components/teacher/MobileTeacherHeader';
import { Button } from '@/components/ui/button';
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
import { pageTransition, pageVariants } from '@/lib/motion';
import { sendSupportMessage } from '@/services/support';

const SUBJECTS = [
  'Kurs og påmeldinger',
  'Betaling og utbetaling',
  'Studio og innstillinger',
  'Innlogging og konto',
  'Annet',
] as const;

export default function HelpPage() {
  const { currentSeller } = useAuth();
  const [subject, setSubject] = useState<string>('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = subject.length > 0 && message.trim().length > 0;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || submitting) return;

    setSubmitting(true);
    const { error } = await sendSupportMessage({
      subject,
      message: message.trim(),
      sellerId: currentSeller?.id ?? null,
    });
    setSubmitting(false);

    if (error) {
      toast.error(error.message || 'Kunne ikke sende meldingen.');
      return;
    }

    setSubject('');
    setMessage('');
    toast.success('Meldingen er sendt');
  }

  return (
    <main className="flex-1 min-h-full overflow-y-auto bg-background">
      <MobileTeacherHeader title="Hjelp" />

      <motion.div
        variants={pageVariants}
        initial="initial"
        animate="animate"
        transition={pageTransition}
        className="mx-auto w-full max-w-7xl px-6 pb-24 md:pb-8 lg:px-8"
      >
        <div className="mb-12 pt-6 lg:pt-12">
          <h1 className="text-2xl font-medium tracking-tight text-foreground">Hjelp</h1>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-foreground-muted">
            Send oss en kort melding om hva du står fast på, så svarer vi på e-posten du er logget inn med.
          </p>
        </div>

        <section className="max-w-2xl rounded-lg border border-border p-5">
          <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="help-subject" className="text-base font-medium text-foreground">
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

            <div className="flex flex-col gap-1.5">
              <label htmlFor="help-message" className="text-base font-medium text-foreground">
                Melding
              </label>
              <Textarea
                id="help-message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={8}
                placeholder="Skriv kort hva du prøver å gjøre, og hva som ikke fungerer."
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={!canSubmit || submitting}>
                {submitting ? 'Sender...' : 'Send'}
              </Button>
            </div>
          </form>
        </section>
      </motion.div>
    </main>
  );
}
