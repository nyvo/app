import { Link } from 'react-router-dom';
import { Plus, Calendar, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const CoursesEmptyState = () => {
  return (
    <div className="h-full flex items-start pt-8">
      <div className="w-full max-w-2xl mx-auto">
        {/* Main card with gradient background */}
        <div className="relative rounded-3xl border border-border bg-gradient-to-br from-white to-surface-elevated/50 p-8 overflow-hidden">
          {/* Content */}
          <div className="relative z-10 flex flex-col items-center text-center">
            {/* Icon */}
            <div className="mb-6 rounded-2xl bg-white p-4 border border-border">
              <Calendar className="h-8 w-8 text-text-tertiary stroke-[1.5]" />
            </div>

            {/* Text */}
            <h2 className="font-geist text-xl font-medium tracking-tight text-text-primary mb-6">
              Opprett ditt første kurs
            </h2>

            {/* CTA Button */}
            <Button asChild size="default" className="gap-2">
              <Link to="/teacher/new-course">
                <Plus className="h-4 w-4" />
                Opprett nytt kurs
              </Link>
            </Button>
          </div>
        </div>

        {/* Hints section */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-white border border-gray-200">
            <div className="shrink-0 rounded-lg bg-surface p-2">
              <Layers className="h-4 w-4 text-text-tertiary" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">Kursrekker</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Faste ukentlige kurs som går over flere uker
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-white border border-gray-200">
            <div className="shrink-0 rounded-lg bg-surface p-2">
              <Calendar className="h-4 w-4 text-text-tertiary" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">Arrangementer</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Workshops og enkeltarrangementer
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
