import { useState } from 'react';
import { Send } from 'lucide-react';
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
import { sendEmail } from '@/services/emails';
import { logger } from '@/lib/logger';

interface Participant {
  name: string;
  email: string;
}

interface MessageParticipantsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseName: string;
  participants: Participant[];
  organizationName?: string;
}

export function MessageParticipantsDialog({
  open,
  onOpenChange,
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

    try {
      const subject = `Melding fra ${organizationName}: ${courseName}`;
      const escapedMessage = trimmed
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { font-size: 24px; font-weight: bold; color: #10b981; }
    .message-box { background: #f9fafb; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .footer { margin-top: 40px; text-align: center; color: #9ca3af; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Ease</div>
    </div>
    <p>Hei,</p>
    <p>Du har mottatt en melding om <strong>${courseName.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</strong>:</p>
    <div class="message-box">
      <p>${escapedMessage}</p>
    </div>
    <div class="footer">
      <p>Hilsen,<br>${organizationName}</p>
    </div>
  </div>
</body>
</html>`;

      const text = `Hei,\n\nDu har mottatt en melding om ${courseName}:\n\n${trimmed}\n\nHilsen,\n${organizationName}`;

      const results = await Promise.allSettled(
        participants.map((p) => sendEmail(p.email, subject, html, { text }))
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
    } catch (err) {
      logger.error('Message participants error:', err);
      toast.error('Noe gikk galt. Prøv igjen.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Melding til deltakere</DialogTitle>
          <DialogDescription>
            Sendes på e-post til {participants.length} deltaker{participants.length !== 1 ? 'e' : ''} i {courseName}
          </DialogDescription>
        </DialogHeader>

        <div>
        <label htmlFor="participant-message" className="block text-xs font-medium text-text-primary mb-1.5">Melding</label>
        <textarea
          id="participant-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Skriv melding..."
          rows={5}
          className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
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
            loadingText="Sender..."
          >
            <Send className="h-3.5 w-3.5" />
            Send melding
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
