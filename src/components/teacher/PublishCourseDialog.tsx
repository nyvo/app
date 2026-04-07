import { useState } from 'react';
import { toast } from 'sonner';
import { ArrowRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { createStripeConnectLink } from '@/services/stripe-connect';

interface PublishCourseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  courseTitle?: string;
}

export function PublishCourseDialog({
  open,
  onOpenChange,
  organizationId,
  courseTitle,
}: PublishCourseDialogProps) {
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    const { data, error } = await createStripeConnectLink(organizationId);
    if (error || !data?.url) {
      toast.error(error?.message || 'Kunne ikke opprette Stripe-tilkobling');
      setConnecting(false);
      return;
    }
    window.location.href = data.url;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sett opp betalinger for å publisere</DialogTitle>
          <DialogDescription>
            {courseTitle && <span className="type-label text-foreground">{courseTitle}</span>}
            {courseTitle ? ' er lagret, men kan' : 'Kurset er lagret, men kan'} ikke ta imot påmeldinger før betalinger er satt opp. Du kobles til Stripe — det tar bare noen minutter.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline-soft"
            size="compact"
            onClick={() => onOpenChange(false)}
          >
            Ikke nå
          </Button>
          <Button
            size="compact"
            onClick={handleConnect}
            loading={connecting}
            loadingText="Sender deg til Stripe …"
          >
            Sett opp betalinger
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
