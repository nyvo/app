import { Link } from 'react-router-dom';
import { CalendarPlus, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const CoursesEmptyState = () => {
  return (
    <div className="flex flex-col items-center pt-[20vh]">
      <div className="flex flex-col items-center text-center">
        <div className="size-10 rounded-lg border border-border bg-background flex items-center justify-center mb-4">
          <Calendar className="size-4 text-muted-foreground" />
        </div>

        <h2 className="font-geist text-sm font-medium text-foreground">
          Ingen kurs ennå
        </h2>
        <p className="mt-1 text-sm text-muted-foreground max-w-xs">
          Opprett ditt første kurs for å komme i gang.
        </p>

        <Button asChild size="default" className="gap-2 mt-6">
          <Link to="/teacher/new-course">
            <CalendarPlus className="h-4 w-4" />
            Opprett nytt kurs
          </Link>
        </Button>
      </div>
    </div>
  );
};
