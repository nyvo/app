import { Link } from 'react-router-dom';
import { CalendarPlus, Calendar } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { routes } from '@/lib/routes';

export const CoursesEmptyState = () => {
  return (
    <div className="flex flex-col items-center pt-[20vh]">
      <EmptyState
        icon={Calendar}
        title="Ingen kurs ennå"
        description="Opprett ditt første kurs for å komme i gang."
        action={(
          <Button asChild size="default" className="gap-2">
            <Link to={routes.newCourse}>
              <CalendarPlus className="size-4" />
              Opprett kurs
            </Link>
          </Button>
        )}
      />
    </div>
  );
};
