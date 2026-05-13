import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { routes } from '@/lib/routes';

export const CoursesEmptyState = () => {
  return (
    <EmptyState
      title="Ingen kurs ennå"
      description="Opprett ditt første kurs for å komme i gang."
      action={(
        <Button asChild size="default">
          <Link to={routes.coursesNew}>
            Opprett kurs
          </Link>
        </Button>
      )}
    />
  );
};
