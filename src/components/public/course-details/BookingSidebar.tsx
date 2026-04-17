import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight } from '@/lib/icons';
import type { PublicCourseWithDetails } from '@/services/publicCourses';
import { PriceHeader } from './PriceHeader';
import { TicketSelector } from './TicketSelector';
import { StudentDetailsForm, type StudentDetailsFormData } from './StudentDetailsForm';
import { EmbeddedPayment } from './EmbeddedPayment';

export interface BookingSidebarProps {
  course: PublicCourseWithDetails;
  isFull: boolean;
  isAlreadySignedUp?: boolean;
  formData: StudentDetailsFormData;
  errors: Record<string, boolean>;
  touched: Record<string, boolean>;
  submitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onBlur: (field: string) => void;
  clientSecret: string | null;
  onPaymentSuccess: (paymentIntentId: string) => void;
  onPaymentError: (error: string) => void;
  onPaymentBack: () => void;
}

/**
 * Linear-style booking sidebar — bordered card with step header + form/payment
 */
export const BookingSidebar: React.FC<BookingSidebarProps> = ({
  course,
  isFull,
  formData,
  errors,
  touched,
  submitting,
  onSubmit,
  onInputChange,
  onBlur,
  clientSecret,
  onPaymentSuccess,
  onPaymentError,
  onPaymentBack,
}) => {
  const stripeNotReady = course.organization?.stripe_onboarding_complete === false;
  const showPayment = !!clientSecret;

  return (
    <div className="bg-background rounded-lg border border-border">
      {/* Step header */}
      <PriceHeader
        label={showPayment ? 'Betaling' : 'Påmelding'}
        step={showPayment ? 'Steg 2 av 2' : (course.price && course.price > 0 ? 'Steg 1 av 2' : undefined)}
      />

      {/* Step content */}
      {showPayment ? (
        <div className="p-6">
          <EmbeddedPayment
            clientSecret={clientSecret}
            courseName={course.title}
            price={course.price || 0}
            onPaymentSuccess={onPaymentSuccess}
            onPaymentError={onPaymentError}
            onBack={onPaymentBack}
          />
        </div>
      ) : (
        <form
          id="booking-form"
          onSubmit={onSubmit}
          className="p-6 space-y-5"
        >
          <div className={`space-y-5 ${isFull || stripeNotReady ? 'opacity-40 pointer-events-none select-none' : ''}`}>
            {/* Ticket selection (if paid) */}
            {course.price && course.price > 0 && (
              <TicketSelector price={course.price} />
            )}

            <StudentDetailsForm
              formData={formData}
              errors={errors}
              touched={touched}
              submitting={submitting}
              onChange={onInputChange}
              onBlur={onBlur}
            />

            {/* Submit */}
            {!isFull && (
              <div className="pt-2">
                {stripeNotReady ? (
                  <Button
                    size="compact"
                    className="w-full"
                    disabled
                  >
                    Påmelding åpner snart
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    className="text-sm font-medium h-auto w-full rounded-lg bg-primary py-3 text-primary-foreground hover:bg-primary/80"
                    loading={submitting}
                    loadingText="Behandler"
                  >
                    <span className="flex items-center justify-center gap-2">
                      {course.price && course.price > 0 ? 'Fortsett til betaling' : 'Fullfør påmelding'}
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </Button>
                )}
              </div>
            )}
          </div>
        </form>
      )}
    </div>
  );
};
