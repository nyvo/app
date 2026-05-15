import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { routes } from '@/lib/routes';

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
    navigate(routes.settingsPayouts);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sett opp betalinger for å publisere</DialogTitle>
          <DialogDescription>
            {courseTitle && <span className="text-sm font-medium text-foreground">{courseTitle}</span>}
            {courseTitle ? ' er lagret, men kan' : 'Kurset er lagret, men kan'} ikke ta imot påmeldinger før betalinger er satt opp. Du kobles til Dintero – det tar bare noen minutter.
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
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
