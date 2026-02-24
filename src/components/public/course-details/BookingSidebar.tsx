import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
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
  redirectingToPayment: boolean;
  isAuthStudent: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onBlur: (field: string) => void;
}

/**
 * Booking sidebar - orchestrates two-step booking flow
 * Sticky on desktop, responsive on mobile
 */
export const BookingSidebar: React.FC<BookingSidebarProps> = ({
  course,
  isFull,
  isAlreadySignedUp,
  formData,
  errors,
  touched,
  submitting,
  redirectingToPayment,
  isAuthStudent,
  onSubmit,
  onInputChange,
  onBlur,
}) => {

  return (
    <div className="sticky top-28">
      {/* Booking container */}
      <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
        {/* Price header */}
        <PriceHeader
          price={course.price}
          spotsAvailable={course.spots_available}
        />

        {/* Content */}
        {course.organization?.stripe_onboarding_complete === false ? (
          <div className="p-6">
            <p className="text-sm text-text-secondary text-center py-6">
              Påmelding er ikke tilgjengelig ennå.
            </p>
          </div>
        ) : (
        <form id="booking-form" onSubmit={onSubmit} className="p-6 space-y-8">
          {/* Redirecting to payment state */}
          {redirectingToPayment ? (
            <div className="py-12 text-center">
              <Spinner size="xl" className="mx-auto mb-4 text-text-primary" />
              <p className="text-sm font-medium text-text-primary">
                Går til betaling ...
              </p>
              <p className="text-xs text-text-secondary mt-1">
                Vent litt
              </p>
            </div>
          ) : (
            <div className={`space-y-6 ${isFull ? 'opacity-40 pointer-events-none select-none' : ''}`}>
              {/* Step 1: Ticket Selection */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-text-tertiary">
                    Steg 1
                  </span>
                  <div className="h-px flex-1 bg-zinc-200"></div>
                </div>
                <TicketSelector price={course.price} />
              </div>

              {/* Step 2: Your Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-text-tertiary">
                    Steg 2
                  </span>
                  <div className="h-px flex-1 bg-zinc-200"></div>
                </div>
                <StudentDetailsForm
                  formData={formData}
                  errors={errors}
                  touched={touched}
                  submitting={submitting}
                  isAuthStudent={isAuthStudent}
                  onChange={onInputChange}
                  onBlur={onBlur}
                />
              </div>

              {/* Submit button & disclaimer - hidden when full (header badge is sufficient) */}
              {!isFull && (
                <div className="space-y-3">
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
                      className="w-full"
                      loading={submitting}
                      loadingText="Behandler"
                    >
                      <span className="flex items-center justify-center gap-2">
                        Fullfør påmelding
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </Button>
                  )}
                  <p className="text-center text-xs text-text-tertiary">
                    Sikker betaling. Du belastes ikke før bekreftelse.
                  </p>
                </div>
              )}
            </div>
          )}
        </form>
        )}
      </div>
    </div>
  );
};
