import { useNavigate } from 'react-router-dom';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
} from '@/components/ui/responsive-dialog';
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
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Sett opp betalinger for å publisere</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {courseTitle && <span className="text-base font-medium text-foreground">{courseTitle}</span>}
            {courseTitle ? ' er lagret, men kan' : 'Kurset er lagret, men kan'} ikke ta imot påmeldinger før betalinger er satt opp.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <ResponsiveDialogFooter>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => onOpenChange(false)}
          >
            Ikke nå
          </Button>
          <Button size="lg" onClick={handleGoToPayments}>
            Sett opp betalinger
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
