import { Link } from 'react-router-dom';
import { Plus, NotebookPen } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const CoursesEmptyState = () => {
  return (
    <div className="rounded-xl bg-white border border-gray-200 overflow-hidden">
      {/* Table Header - matching active state */}
      <div className="flex items-center px-4 py-3 border-b border-gray-200 bg-surface/50">
        <div className="flex-[2] pr-4 text-xxs font-medium uppercase tracking-wide text-muted-foreground">Kurs & Sted</div>
        <div className="hidden md:block flex-1 pr-4 text-xxs font-medium uppercase tracking-wide text-muted-foreground">Kurstype</div>
        <div className="hidden md:block flex-1 pr-4 text-xxs font-medium uppercase tracking-wide text-muted-foreground">Status</div>
        <div className="hidden md:block flex-1 pr-4 text-xxs font-medium uppercase tracking-wide text-muted-foreground">Tidspunkt</div>
        <div className="hidden lg:block flex-1 pr-4 text-xxs font-medium uppercase tracking-wide text-muted-foreground">Deltakere</div>
        <div className="hidden lg:block w-24 pr-4 text-right text-xxs font-medium uppercase tracking-wide text-muted-foreground">Pris</div>
        <div className="w-12"></div>
      </div>

      {/* Empty State Content - matching SignupsPage pattern */}
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white">
        <div className="mb-4 rounded-full bg-surface p-4 border border-surface-elevated">
          <NotebookPen className="h-8 w-8 text-text-tertiary stroke-[1.5]" />
        </div>
        <h3 className="font-geist text-sm font-medium text-text-primary">Ingen kurs funnet</h3>
        <p className="mt-1 text-xs text-muted-foreground max-w-xs">
          Du har ingen kurs enda. Opprett et kurs for å komme i gang.
        </p>
        <Button asChild size="compact" className="gap-2 mt-6">
          <Link to="/teacher/new-course">
            <Plus className="h-3.5 w-3.5" />
            Opprett nytt kurs
          </Link>
        </Button>
      </div>
    </div>
  );
};
