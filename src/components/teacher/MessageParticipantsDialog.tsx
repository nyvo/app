import { useState } from 'react';
import { Send } from '@/lib/icons';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { sendTeacherBroadcast } from '@/services/emails';

interface Participant {
  name: string;
  email: string;
}

interface MessageParticipantsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  courseName: string;
  participants: Participant[];
  organizationName?: string;
}

export function MessageParticipantsDialog({
  open,
  onOpenChange,
  courseId,
  courseName,
  participants,
  organizationName = 'Ease',
}: MessageParticipantsDialogProps) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    const trimmed = message.trim();
    if (!trimmed || participants.length === 0) return;

    setIsSending(true);

    const results = await Promise.allSettled(
      participants.map((p) =>
        sendTeacherBroadcast(p.email, {
          courseId,
          courseName,
          message: trimmed,
          organizationName,
        }),
      ),
    );

    const failed = results.filter(
      (r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)
    );

    if (failed.length === 0) {
      toast.success(`Melding sendt til ${participants.length} deltaker${participants.length !== 1 ? 'e' : ''}`);
      setMessage('');
      onOpenChange(false);
    } else if (failed.length < participants.length) {
      toast.warning(`Sendt til ${participants.length - failed.length} av ${participants.length} deltakere`);
      setMessage('');
      onOpenChange(false);
    } else {
      toast.error('Kunne ikke sende melding. Prøv igjen.');
    }

    setIsSending(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Melding til deltakere</DialogTitle>
          <DialogDescription>
            Sendes på e-post til <span className="tabular-nums">{participants.length}</span> deltaker{participants.length !== 1 ? 'e' : ''} i {courseName}
          </DialogDescription>
        </DialogHeader>

        <div>
        <label htmlFor="participant-message" className="text-xs font-medium mb-1.5 block text-foreground">Melding</label>
        <Textarea
          id="participant-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Skriv meldingen din"
          rows={5}
          className="resize-none"
          disabled={isSending}
        />
        </div>

        <DialogFooter>
          <Button
            variant="outline-soft"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSending}
          >
            Avbryt
          </Button>
          <Button
            size="sm"
            onClick={handleSend}
            disabled={!message.trim() || isSending}
            loading={isSending}
            loadingText="Sender"
          >
            <Send className="size-3.5" />
            Send melding
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
