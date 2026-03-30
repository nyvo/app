import { Link } from 'react-router-dom';
import { CalendarPlus, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const CoursesEmptyState = () => {
  return (
    <div className="flex flex-col items-center pt-[20vh]">
      <div className="flex flex-col items-center text-center">
        <div className="w-10 h-10 rounded-xl border border-zinc-200 bg-white flex items-center justify-center mb-4">
          <Calendar className="w-4 h-4 text-text-secondary" />
        </div>

        <h2 className="font-geist text-sm font-medium text-text-primary">
          Ingen kurs ennå
        </h2>
        <p className="mt-1 text-sm text-text-secondary max-w-xs">
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
