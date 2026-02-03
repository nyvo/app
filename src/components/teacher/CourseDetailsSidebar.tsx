import { Calendar, MapPin, Clock, BarChart2, Mail, Settings2, UserPlus, Link as LinkIcon, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusIndicator } from '@/components/ui/status-indicator';
import { toast } from 'sonner';

interface CourseDetailsProps {
  course: {
    title: string;
    date: string;
    location: string;
    price: number;
    level: string;
    duration: string;
    enrolled: number;
    capacity: number;
    formattedDateRange: string | null;
  };
  courseUrl?: string;
}

export const CourseDetailsCard = ({ course }: CourseDetailsProps) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 ring-1 ring-border overflow-hidden h-full">
      <div className="p-5 border-b border-gray-100">
        <h3 className="text-sm font-medium text-text-primary">Kursdetaljer</h3>
      </div>
      
      <div className="p-5 space-y-5">
        {/* Date & Time */}
        <div className="flex gap-3">
          <div className="h-8 w-8 rounded-lg bg-surface flex items-center justify-center text-text-secondary shrink-0">
            <Calendar className="h-4 w-4" />
          </div>
          <div>
            <span className="text-xs font-medium text-text-tertiary block mb-0.5">Tidspunkt</span>
            {course.formattedDateRange ? (
              <>
                <p className="text-sm font-medium text-text-primary">{course.formattedDateRange}</p>
                {course.date && <p className="text-xs text-text-secondary mt-0.5">{course.date}</p>}
              </>
            ) : (
              <p className="text-sm font-medium text-text-primary">{course.date || 'Ikke angitt'}</p>
            )}
          </div>
        </div>

        {/* Location */}
        <div className="flex gap-3">
          <div className="h-8 w-8 rounded-lg bg-surface flex items-center justify-center text-text-secondary shrink-0">
            <MapPin className="h-4 w-4" />
          </div>
          <div>
            <span className="text-xs font-medium text-text-tertiary block mb-0.5">Sted</span>
            <p className="text-sm font-medium text-text-primary">{course.location}</p>
          </div>
        </div>

        {/* Price */}
        <div className="flex gap-3">
          <div className="h-8 w-8 rounded-lg bg-surface flex items-center justify-center text-text-secondary shrink-0">
            <span className="text-xs font-medium">kr</span>
          </div>
          <div>
            <span className="text-xs font-medium text-text-tertiary block mb-0.5">Pris</span>
            <p className="text-sm font-medium text-text-primary">{course.price},-</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="flex items-center gap-2">
            <BarChart2 className="h-3.5 w-3.5 text-text-tertiary" />
            <span className="text-xs text-text-secondary">{course.level}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-text-tertiary" />
            <span className="text-xs text-text-secondary">{course.duration}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const CourseOccupancyCard = ({ course, courseUrl }: CourseDetailsProps) => {
  const spotsLeft = course.capacity - course.enrolled;
  const progressPercentage = course.capacity > 0 ? (course.enrolled / course.capacity) * 100 : 0;
  const revenue = course.price * course.enrolled;
  const isEmpty = course.enrolled === 0;

  const handleCopyLink = () => {
    if (courseUrl) {
      navigator.clipboard.writeText(courseUrl);
      toast.success('Lenke kopiert til utklippstavlen');
    } else {
      toast.error('Ingen lenke tilgjengelig');
    }
  };

  const handleInvite = () => {
      if (courseUrl) {
         // Placeholder: For now, we'll just copy the link as invitation
         navigator.clipboard.writeText(courseUrl);
         toast.success('Invitasjonslenke kopiert');
      } else {
          toast.info("Ingen lenke å dele");
      }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 ring-1 ring-border p-5 h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-text-primary">Påmelding</h3>
          <StatusIndicator
            variant="success"
            mode="inline"
            size="sm"
            label={`${spotsLeft} ${spotsLeft === 1 ? 'plass' : 'plasser'} igjen`}
          />
        </div>

        {isEmpty ? (
          <div className="text-center py-4 px-2 space-y-3">
             <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-surface-elevated border border-dashed border-gray-300">
               <Users className="h-5 w-5 text-text-tertiary" />
             </div>
             <div>
                <p className="text-sm font-medium text-text-primary">Ingen påmeldte enda</p>
                <p className="text-xs text-muted-foreground mt-0.5">Inviter deltakere for å komme i gang.</p>
             </div>
             <div className="grid grid-cols-2 gap-2 pt-1">
                <Button variant="outline-soft" size="sm" onClick={handleCopyLink} className="h-8">
                   <LinkIcon className="h-3.5 w-3.5 mr-1.5" />
                   Kopier lenke
                </Button>
                <Button variant="default" size="sm" onClick={handleInvite} className="h-8">
                   <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                   Inviter
                </Button>
             </div>
          </div>
        ) : (
          <div className="space-y-2 mb-4">
            <div className="flex items-end justify-between text-xs">
              <span className="text-text-secondary">Deltakere</span>
              <span className="font-medium text-text-primary">
                {course.enrolled} / {course.capacity}
              </span>
            </div>
            <div className="h-2 w-full bg-surface-elevated rounded-full overflow-hidden">
              <div
                className="h-full bg-text-primary rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>
      
      {/* Progress Bar always visible even if empty, or at least the capacity info? 
          User asked for "Add a progress bar (Tailwind) to visualize the 0/1 capacity" 
          If I show the empty state above, I might hide the standard progress bar to avoid clutter, 
          OR I can show it below the empty state buttons. 
          Let's show it below if empty? 
          Actually, the empty state UI replaces the "0/1" display according to the prompt "Instead of just showing '0/1', add an empty state UI...".
          But then it says "Add a progress bar...". 
          I will keep the revenue footer.
      */}

      {!isEmpty && (
          <div className="pt-4 border-t border-gray-100 flex justify-between items-center mt-auto">
            <span className="text-xs text-text-tertiary">Estimert omsetning</span>
            <span className="text-sm font-medium text-text-primary">{revenue.toLocaleString('nb-NO')} kr</span>
          </div>
      )}
       {isEmpty && (
           <div className="pt-4 border-t border-gray-100 mt-auto">
                <div className="flex items-end justify-between text-xs mb-2">
                  <span className="text-text-secondary">Kapasitet</span>
                  <span className="font-medium text-text-primary">
                    {course.enrolled} / {course.capacity}
                  </span>
                </div>
                <div className="h-2 w-full bg-surface-elevated rounded-full overflow-hidden">
                  <div
                    className="h-full bg-text-primary rounded-full transition-all duration-500"
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
           </div>
       )}
    </div>
  );
};

interface CourseActionsProps {
  course: {
    title: string;
    enrolled: number;
  };
  courseUrl: string;
  onEditTime: () => void;
  onMessage: () => void;
  onViewPage: () => void;
}

export const CourseActionsCard = ({
  course,
  courseUrl: _courseUrl,
  onEditTime,
  onMessage,
  onViewPage: _onViewPage
}: CourseActionsProps) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 ring-1 ring-border p-5">
      <h3 className="text-sm font-medium text-text-primary mb-4">Handlinger</h3>
      <div className="space-y-2">
        <Button
          variant="outline-soft"
          size="sm"
          className="w-full justify-start"
          disabled={course.enrolled === 0}
          onClick={onMessage}
        >
          <Mail className="h-3.5 w-3.5 mr-2 text-text-secondary" />
          Send melding
        </Button>
        <Button 
          variant="default" 
          size="sm" 
          className="w-full justify-start" 
          onClick={onEditTime}
        >
          <Settings2 className="h-3.5 w-3.5 mr-2 text-white" />
          Rediger / Endre time
        </Button>
      </div>
    </div>
  );
};

interface CourseDetailsSidebarProps {
  course: {
    title: string;
    date: string;
    location: string;
    price: number;
    level: string;
    duration: string;
    enrolled: number;
    capacity: number;
    formattedDateRange: string | null;
  };
  courseUrl: string;
  onEditTime: () => void;
  onMessage: () => void;
  onViewPage: () => void;
}

export const CourseDetailsSidebar = (props: CourseDetailsSidebarProps) => {
  return (
    <div className="space-y-6">
      <CourseDetailsCard course={props.course} />
      <CourseOccupancyCard course={props.course} courseUrl={props.courseUrl} />
      <CourseActionsCard {...props} />
    </div>
  );
};
