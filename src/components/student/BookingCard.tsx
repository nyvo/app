import { useState, useCallback } from 'react';
import { format, isValid } from 'date-fns';
import { nb } from 'date-fns/locale';
import { MapPin, Calendar, Clock, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/ui/user-avatar';
import { StatusIndicator } from '@/components/ui/status-indicator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from 'sonner';
import { checkCancellationWindow } from '@/lib/cancellation';
import { cancelMySignup } from '@/services/studentSignups';
import type { StudentSignupWithCourse } from '@/services/studentSignups';

interface BookingCardProps {
  signup: StudentSignupWithCourse;
  onStatusChange: () => void;
}

export const BookingCard = ({ signup, onStatusChange }: BookingCardProps) => {
  const { course } = signup;
  const [isCancelling, setIsCancelling] = useState(false);

  if (!course) return null;

  // Format Date & Time
  const startDate = course.start_date ? new Date(course.start_date) : null;
  const dateStr = startDate && isValid(startDate) ? format(startDate, 'd. MMMM yyyy', { locale: nb }) : 'Dato ikke satt';
  const timeStr = course.time_schedule ? course.time_schedule.split(',')[1]?.trim() || course.time_schedule : '';
  
  // Check Cancellation
  const { canCancel } = checkCancellationWindow(course.start_date || new Date().toISOString());
  
  // Payment Status Visuals - using StatusIndicator component
  const getPaymentBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <StatusIndicator variant="success" mode="inline" size="xs" label="Betalt" />;
      case 'pending':
        return <StatusIndicator variant="warning" mode="inline" size="xs" label="Venter" />;
      case 'refunded':
        return <StatusIndicator variant="neutral" mode="inline" size="xs" label="Refundert" />;
      default:
        return <StatusIndicator variant="error" mode="badge" size="xs" label="Feilet" />;
    }
  };

  const handleCancellation = useCallback(async () => {
    setIsCancelling(true);
    try {
      const { error } = await cancelMySignup(signup.id);
      if (error) {
        toast.error('Kunne ikke avbestille. Prøv på nytt.');
        return;
      }
      toast.success('Avbestilt. Du får refusjon.');
      onStatusChange();
    } catch {
      toast.error('Noe gikk galt.');
    } finally {
      setIsCancelling(false);
    }
  }, [signup.id, onStatusChange]);

  const handleContactTeacher = useCallback(() => {
    toast.info("Meldinger kommer snart.");
  }, []);

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-4 sm:p-5 flex flex-col md:flex-row gap-4 md:gap-6 transition-all hover:border-zinc-400">
      
      {/* Left: Date Box */}
      <div className="hidden md:flex flex-col items-center justify-center w-24 h-24 rounded-lg bg-surface border border-zinc-100 shrink-0">
        {startDate && isValid(startDate) ? (
          <>
            <span className="text-sm font-medium text-text-tertiary uppercase tracking-wide">
              {format(startDate, 'MMM', { locale: nb }).replace('.', '')}
            </span>
            <span className="text-3xl font-semibold text-text-primary">
              {format(startDate, 'd')}
            </span>
          </>
        ) : (
          <span className="text-xs text-text-tertiary">—</span>
        )}
      </div>

      {/* Center: Content */}
      <div className="flex-1 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
             <div className="md:hidden flex items-center gap-2 text-sm text-text-tertiary mb-1">
                <Calendar className="h-4 w-4" />
                <span>{dateStr}</span>
             </div>
             <h3 className="text-lg font-medium text-text-primary leading-tight">
               {course.title}
             </h3>
          </div>
          {getPaymentBadge(signup.payment_status)}
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm text-text-secondary">
           <div className="flex items-center gap-1.5">
             <Clock className="h-4 w-4 text-text-tertiary" />
             <span>{timeStr || 'Tid mangler'}</span>
           </div>
           <div className="flex items-center gap-1.5">
             <MapPin className="h-4 w-4 text-text-tertiary" />
             <span>{course.location || 'Sted mangler'}</span>
           </div>
        </div>

        {course.instructor && (
          <div className="flex items-center gap-2 pt-1">
            <UserAvatar
              name={course.instructor.name}
              src={course.instructor.avatar_url}
              size="xs"
            />
            <span className="text-sm text-text-secondary">
              Med <span className="font-medium text-text-primary">{course.instructor.name}</span>
            </span>
          </div>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex flex-row md:flex-col items-center md:items-end justify-end md:justify-center gap-2 pt-4 md:pt-0 md:pl-4 border-t md:border-t-0 md:border-l border-zinc-100 w-full md:w-auto md:min-w-[140px]">
         <Button 
           variant="outline-soft" 
           size="sm" 
           className="w-full justify-center"
           onClick={handleContactTeacher}
         >
           <MessageCircle className="h-4 w-4 mr-2" />
           Send melding
         </Button>

         {canCancel ? (
           <AlertDialog>
             <AlertDialogTrigger asChild>
               <Button variant="ghost" size="sm" className="w-full justify-center text-text-tertiary hover:text-status-error-text hover:bg-status-error-bg">
                 Avbestill
               </Button>
             </AlertDialogTrigger>
             <AlertDialogContent>
               <AlertDialogHeader>
                 <AlertDialogTitle>Avbestille?</AlertDialogTitle>
                 <AlertDialogDescription>
                   Du får refusjon fordi det er mer enn 48 timer til start.
                 </AlertDialogDescription>
               </AlertDialogHeader>
               <AlertDialogFooter>
                 <AlertDialogCancel>Behold plassen</AlertDialogCancel>
                 <AlertDialogAction
                   onClick={handleCancellation}
                   disabled={isCancelling}
                   className="bg-destructive hover:bg-destructive/90 text-white border-none"
                 >
                   {isCancelling ? 'Avbestiller...' : 'Avbestill'}
                 </AlertDialogAction>
               </AlertDialogFooter>
             </AlertDialogContent>
           </AlertDialog>
         ) : (
           <TooltipProvider>
             <Tooltip>
               <TooltipTrigger asChild>
                 <div className="w-full">
                   <Button variant="ghost" size="sm" disabled className="w-full justify-center text-text-tertiary opacity-50 cursor-not-allowed">
                     Avbestill
                   </Button>
                 </div>
               </TooltipTrigger>
               <TooltipContent>
                 <p>Kan avbestilles inntil 48 timer før start</p>
               </TooltipContent>
             </Tooltip>
           </TooltipProvider>
         )}
      </div>
    </div>
  );
};
