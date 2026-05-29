import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert } from '@/components/ui/alert';
import { friendlyError } from '@/lib/error-messages';
import { sendCourseMessage } from '@/services/courses';

const BODY_MAX = 4000;

interface SendCourseMessageDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  courseTitle: string;
  /** Number of confirmed participants — shown as context so the teacher knows
   * how many will receive the message before sending. */
  recipientCount: number;
}

export function SendCourseMessageDrawer({
  open,
  onOpenChange,
  courseId,
  courseTitle,
  recipientCount,
}: SendCourseMessageDrawerProps) {
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form whenever drawer opens — keeps stale drafts out of the next session.
  useEffect(() => {
    if (open) {
      setBody('');
      setError(null);
    }
  }, [open]);

  const recipientLabel =
    recipientCount === 0
      ? 'Ingen påmeldte enda'
      : `${recipientCount} ${recipientCount === 1 ? 'deltaker' : 'deltakere'}`;

  const canSend = !submitting && body.trim().length > 0 && recipientCount > 0;

  async function handleSend() {
    if (!canSend) return;
    setSubmitting(true);
    setError(null);
    const { data, error: sendError } = await sendCourseMessage({
      courseId,
      body: body.trim(),
    });
    setSubmitting(false);
    if (sendError) {
      setError(friendlyError(sendError, 'Kunne ikke sende meldingen.'));
      return;
    }
    const notified = data?.notified ?? 0;
    const failed = data?.failed ?? 0;
    if (failed > 0 && notified === 0) {
      setError('Ingen av meldingene gikk gjennom. Prøv igjen senere.');
      return;
    }
    toast.success(
      failed > 0
        ? `Meldingen er sendt til ${notified}. ${failed} feilet.`
        : `Meldingen er sendt til ${notified} ${notified === 1 ? 'deltaker' : 'deltakere'}.`,
    );
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-[480px] p-0 gap-0">
        <SheetHeader>
          <SheetTitle>Send melding</SheetTitle>
        </SheetHeader>

        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div className="rounded-md bg-muted px-3 py-2.5 text-base text-foreground-muted leading-relaxed">
              Meldingen sendes som e-post til {recipientLabel} på {courseTitle}.
            </div>

            {error && (
              <Alert variant="error" size="sm">
                {error}
              </Alert>
            )}

            <div className="space-y-1.5">
              <label htmlFor="message-body" className="text-base font-medium text-foreground">
                Melding
              </label>
              <Textarea
                id="message-body"
                value={body}
                onChange={(e) => setBody(e.target.value.slice(0, BODY_MAX))}
                placeholder="Skriv meldingen din her."
                rows={10}
                maxLength={BODY_MAX}
                disabled={submitting}
                className="resize-y min-h-[200px]"
              />
              <p className="text-sm text-foreground-muted text-right tabular-nums">
                {body.length} / {BODY_MAX}
              </p>
            </div>
          </div>

          <SheetFooter className="flex-row justify-end">
            <Button
              onClick={handleSend}
              disabled={!canSend}
              loading={submitting}
              loadingText="Sender"
            >
              Send melding
            </Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}
