import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert } from '@/components/ui/alert';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { friendlyError } from '@/lib/error-messages';
import { sendCourseMessage } from '@/services/courses';

const BODY_MAX = 4000;
// Counter only earns its keep near the ceiling — showing "12 / 4000" the
// whole time is noise the teacher has to filter out on every keystroke.
const COUNTER_THRESHOLD = BODY_MAX * 0.9;

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
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Reset form whenever drawer opens — keeps stale drafts out of the next session.
  useEffect(() => {
    if (open) {
      setBody('');
      setError(null);
    }
  }, [open]);

  // Guard ESC/overlay/X against silently dropping a drafted message — only
  // the successful-send path (handleSend) closes without this check.
  function handleOpenChange(next: boolean) {
    if (!next && body.trim().length > 0) {
      setShowDiscardConfirm(true);
      return;
    }
    onOpenChange(next);
  }

  const recipientLabel =
    recipientCount === 0
      ? 'Ingen påmeldte ennå'
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
        ? `Meldingen er sendt til ${notified} – ${failed} feilet`
        : `Meldingen er sendt til ${notified} ${notified === 1 ? 'deltaker' : 'deltakere'}`,
    );
    onOpenChange(false);
  }

  return (
    <>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent side="right" className="sm:max-w-[480px] p-0 gap-0">
          <SheetHeader>
            <SheetTitle>Send melding</SheetTitle>
            <SheetDescription className="sr-only">
              Send en e-post til deltakerne på {courseTitle}.
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
              <Alert variant="info" size="sm">
                Meldingen sendes som e-post til {recipientLabel} på {courseTitle}.
              </Alert>

              {error && (
                <Alert variant="error" size="sm">
                  {error}
                </Alert>
              )}

              <div>
                <label htmlFor="message-body" className="text-sm font-medium mb-2 block text-foreground">
                  Melding
                </label>
                <Textarea
                  id="message-body"
                  value={body}
                  onChange={(e) => setBody(e.target.value.slice(0, BODY_MAX))}
                  rows={10}
                  maxLength={BODY_MAX}
                  disabled={submitting}
                  className="resize-y min-h-[200px]"
                />
                {body.length >= COUNTER_THRESHOLD && (
                  <p className="mt-2 text-sm text-foreground-muted text-right tabular-nums">
                    {body.length} / {BODY_MAX}
                  </p>
                )}
              </div>
            </div>

            <SheetFooter>
              <Button
                onClick={handleSend}
                className="w-full"
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

      <ConfirmDialog
        open={showDiscardConfirm}
        onOpenChange={setShowDiscardConfirm}
        title="Forkast meldingen?"
        body="Meldingen forsvinner og blir ikke sendt."
        actionLabel="Forkast"
        destructive
        onConfirm={() => {
          setShowDiscardConfirm(false);
          onOpenChange(false);
        }}
      />
    </>
  );
}
