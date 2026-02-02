import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import type { PublicCourseWithDetails } from '@/services/publicCourses';
import { PriceHeader } from './PriceHeader';
import { TicketSelector } from './TicketSelector';
import { StudentDetailsForm, type StudentDetailsFormData } from './StudentDetailsForm';

export interface BookingSidebarProps {
  course: PublicCourseWithDetails;
  isFull: boolean;
  isAlreadySignedUp: boolean;
  formData: StudentDetailsFormData;
  errors: Record<string, boolean>;
  touched: Record<string, boolean>;
  submitting: boolean;
  joiningWaitlist: boolean;
  redirectingToPayment: boolean;
  currentWaitlistCount: number | null;
  isAuthStudent: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onJoinWaitlist: (e: React.FormEvent) => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onBlur: (field: string) => void;
}

/**
 * Booking sidebar - orchestrates two-step booking flow
 * Sticky on desktop, responsive on mobile
 * Handles both normal booking and waitlist flows
 */
export const BookingSidebar: React.FC<BookingSidebarProps> = ({
  course,
  isFull,
  isAlreadySignedUp,
  formData,
  errors,
  touched,
  submitting,
  joiningWaitlist,
  redirectingToPayment,
  currentWaitlistCount,
  isAuthStudent,
  onSubmit,
  onJoinWaitlist,
  onInputChange,
  onBlur,
}) => {

  return (
    <div className="sticky top-28">
      {/* Booking container */}
      <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/40 border border-gray-200 overflow-hidden">
        {/* Price header */}
        <PriceHeader
          price={course.price}
          spotsAvailable={course.spots_available}
        />

        {/* Content */}
        <form id="booking-form" onSubmit={isFull ? onJoinWaitlist : onSubmit} className="p-6 space-y-8">
          {/* Redirecting to payment state */}
          {redirectingToPayment ? (
            <div className="py-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-text-primary" />
              <p className="text-sm font-medium text-text-primary">
                Sender deg til betaling...
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Vennligst vent
              </p>
            </div>
          ) : (
            <>
              {/* Step 1: Ticket Selection */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-xxs font-medium text-text-tertiary uppercase tracking-wider">
                    Trinn 1
                  </span>
                  <div className="h-px flex-1 bg-gray-200"></div>
                </div>
                <TicketSelector price={course.price} />
              </div>

              {/* Step 2: Your Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-xxs font-medium text-text-tertiary uppercase tracking-wider">
                    Trinn 2
                  </span>
                  <div className="h-px flex-1 bg-gray-200"></div>
                </div>
                <StudentDetailsForm
                  formData={formData}
                  errors={errors}
                  touched={touched}
                  submitting={submitting || joiningWaitlist}
                  isAuthStudent={isAuthStudent}
                  onChange={onInputChange}
                  onBlur={onBlur}
                />
              </div>

              {/* Submit button */}
              <div className="pt-2">
                {isAlreadySignedUp ? (
                  <Button
                    size="compact"
                    className="w-full"
                    disabled
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Du er påmeldt
                  </Button>
                ) : (
                  <Button
                    size="compact"
                    type="submit"
                    className="w-full transition-all"
                    disabled={submitting || joiningWaitlist}
                  >
                    {submitting || joiningWaitlist ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {isFull ? 'Melder på...' : 'Behandler'}
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        {isFull ? (
                          <>
                            Meld på venteliste
                            {currentWaitlistCount !== null && (
                              <span className="text-xs opacity-70">(#{currentWaitlistCount + 1})</span>
                            )}
                          </>
                        ) : (
                          <>
                            Fullfør påmelding
                            <ArrowRight className="h-4 w-4" />
                          </>
                        )}
                      </span>
                    )}
                  </Button>
                )}
              </div>

              {/* Disclaimer */}
              <p className="text-center text-xxs text-text-tertiary -mt-2">
                {isFull
                  ? 'Ingen betaling nå. Vi varsler deg når plass blir ledig.'
                  : 'Sikker betaling via Stripe. Ingen belastning før bekreftelse.'}
              </p>
            </>
          )}
        </form>
      </div>
    </div>
  );
};
