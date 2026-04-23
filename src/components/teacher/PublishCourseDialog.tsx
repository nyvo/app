import { useNavigate } from 'react-router-dom';
import { ArrowRight } from '@/lib/icons';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface PublishCourseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseTitle?: string;
}

export function PublishCourseDialog({
  open,
  onOpenChange,
  courseTitle,
}: PublishCourseDialogProps) {
  const navigate = useNavigate();

  const handleGoToPayments = () => {
    navigate('/teacher/payments');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sett opp betalinger for å publisere</DialogTitle>
          <DialogDescription>
            {courseTitle && <span className="text-sm font-medium text-foreground">{courseTitle}</span>}
            {courseTitle ? ' er lagret, men kan' : 'Kurset er lagret, men kan'} ikke ta imot påmeldinger før betalinger er satt opp. Du kobles til Dintero — det tar bare noen minutter.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline-soft"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Ikke nå
          </Button>
          <Button size="sm" onClick={handleGoToPayments}>
            Sett opp betalinger
            <ArrowRight className="size-3.5" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
