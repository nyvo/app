import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { FieldError } from '@/components/ui/field-error';
import { checkCourseAvailability, createSignup } from '@/services/signups';
import { friendlyError } from '@/lib/error-messages';
import { AUTH_VALIDATION } from '@/lib/auth-messages';
import { isValidEmail } from '@/lib/utils';


interface AddParticipantDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  organizationId: string;
  onSuccess: () => void;
}

export function AddParticipantDrawer({
  open,
  onOpenChange,
  courseId,
  organizationId,
  onSuccess,
}: AddParticipantDrawerProps) {
  // Form data
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    note: '',
  });

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Capacity check
  const [availableSpots, setAvailableSpots] = useState<number | null>(null);
  const [isCheckingCapacity, setIsCheckingCapacity] = useState(true);

  // Submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isFull = availableSpots !== null && availableSpots <= 0;

  // Check capacity when dialog opens
  useEffect(() => {
    if (open) {
      checkCapacity();
    }
  }, [open, courseId]);

  // Reset form when drawer closes
  useEffect(() => {
    if (!open) {
      setFormData({ firstName: '', lastName: '', email: '', phone: '', note: '' });
      setErrors({});
      setTouched({});
      setSubmitError(null);
    }
  }, [open]);

  const checkCapacity = async () => {
    setIsCheckingCapacity(true);
    const { available, error } = await checkCourseAvailability(courseId);

    if (!error) {
      setAvailableSpots(available);
    }

    setIsCheckingCapacity(false);
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Skriv inn fornavn';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Skriv inn etternavn';
    }

    if (!formData.email.trim()) {
      newErrors.email = AUTH_VALIDATION.emailRequired;
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = AUTH_VALIDATION.emailInvalid;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({
      firstName: true,
      lastName: true,
      email: true,
    });

    if (!validateForm()) {
      return;
    }

    // Validate organizationId is present
    if (!organizationId) {
      setSubmitError('Noe gikk galt. Last inn siden på nytt.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Re-check capacity to handle race condition
      const { available } = await checkCourseAvailability(courseId);
      if (available <= 0) {
        setSubmitError('Kurset er fullt.');
        setIsSubmitting(false);
        return;
      }

      // ticket_type_id + the 3 snapshots are auto-resolved inside createSignup
      // from the course's default tier — manual adds don't need to pick one.
      // Manual signups bypass the integrated payment flow — the teacher
      // handles the transaction outside the system (Vipps, cash, invoice).
      // Always recorded as 'paid' here; if the money never actually arrives,
      // the teacher can cancel/refund from the row action menu later.
      const { error } = await createSignup({
        seller_id: organizationId,
        course_id: courseId,
        participant_name: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
        participant_email: formData.email.trim().toLowerCase(),
        participant_phone: formData.phone.trim() || null,
        note: formData.note.trim() || null,
        status: 'confirmed',
        payment_status: 'paid',
      });

      if (error) {
        setSubmitError(friendlyError(error, 'Kunne ikke legge til deltaker'));
        setIsSubmitting(false);
        return;
      }

      // Success!
      setIsSubmitting(false);
      onOpenChange(false);
      onSuccess(); // Trigger refresh
      toast.success('Deltaker lagt til');
    } catch (err) {
      setSubmitError(friendlyError(err, 'Noe gikk galt. Prøv igjen.'));
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-[480px] p-0 gap-0">
        <SheetHeader>
          <SheetTitle>Legg til deltaker</SheetTitle>
        </SheetHeader>

        {isCheckingCapacity ? (
          // Capacity check resolves in <200ms — render nothing in the body
          // rather than flash a spinner (Studio § 10). The SheetHeader above
          // keeps the drawer feeling anchored during the brief wait.
          <div className="flex-1" aria-hidden="true" />
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {/* Mental-model note — manual signups bypass the integrated
                payment flow. Muted fill, no border, no icon — this is
                context, not an alert. */}
            <div className="rounded-md bg-muted px-3 py-2.5 text-sm text-foreground-muted leading-relaxed">
              Manuelle påmeldinger registreres som betalt. Du håndterer betalingen selv (Vipps, kontant, faktura).
            </div>

            {/* Info banner if full */}
            {isFull && (
              <Alert variant="info" size="sm">
                Kurset er fullt. Det er ikke mulig å legge til flere deltakere.
              </Alert>
            )}

            {/* Error banner */}
            {submitError && (
              <Alert variant="error" size="sm">
                {submitError}
              </Alert>
            )}

            {/* Form fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* First Name */}
              <div>
                <label
                  htmlFor="firstName"
                  data-error={(errors.firstName && touched.firstName) || undefined}
                  className="text-xs font-medium mb-1.5 block text-foreground data-[error=true]:text-danger"
                >
                  Fornavn
                </label>
                <Input
                  id="firstName"
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  onBlur={() => handleBlur('firstName')}
                  aria-invalid={!!errors.firstName}
                  aria-describedby={
                    errors.firstName && touched.firstName ? 'firstName-error' : undefined
                  }
                  aria-required="true"
                  disabled={isSubmitting}
                  className={
                    errors.firstName && touched.firstName
                      ? 'border-danger bg-danger-subtle animate-shake'
                      : ''
                  }
                />
                {errors.firstName && touched.firstName && (
                  <FieldError id="firstName-error">{errors.firstName}</FieldError>
                )}
              </div>

              {/* Last Name */}
              <div>
                <label
                  htmlFor="lastName"
                  data-error={(errors.lastName && touched.lastName) || undefined}
                  className="text-xs font-medium mb-1.5 block text-foreground data-[error=true]:text-danger"
                >
                  Etternavn
                </label>
                <Input
                  id="lastName"
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  onBlur={() => handleBlur('lastName')}
                  aria-invalid={!!errors.lastName}
                  aria-describedby={
                    errors.lastName && touched.lastName ? 'lastName-error' : undefined
                  }
                  aria-required="true"
                  disabled={isSubmitting}
                  className={
                    errors.lastName && touched.lastName
                      ? 'border-danger bg-danger-subtle animate-shake'
                      : ''
                  }
                />
                {errors.lastName && touched.lastName && (
                  <FieldError id="lastName-error">{errors.lastName}</FieldError>
                )}
              </div>
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                data-error={(errors.email && touched.email) || undefined}
                className="text-xs font-medium mb-1.5 block text-foreground data-[error=true]:text-danger"
              >
                E-post
              </label>
              <Input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                onBlur={() => handleBlur('email')}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email && touched.email ? 'email-error' : undefined}
                aria-required="true"
                disabled={isSubmitting}
                className={
                  errors.email && touched.email
                    ? 'border-danger bg-danger-subtle animate-shake'
                    : ''
                }
              />
              {errors.email && touched.email && (
                <FieldError id="email-error">{errors.email}</FieldError>
              )}
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="text-xs font-medium mb-1.5 block text-foreground">
                Telefonnummer <span className="text-foreground-muted">(valgfritt)</span>
              </label>
              <Input
                id="phone"
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                disabled={isSubmitting}
              />
            </div>

            {/* Note */}
            <div>
              <label htmlFor="note" className="text-xs font-medium mb-1.5 block text-foreground">
                Notat <span className="text-foreground-muted">(valgfritt)</span>
              </label>
              <Textarea
                id="note"
                name="note"
                value={formData.note}
                onChange={handleInputChange}
                rows={3}
                disabled={isSubmitting}
              />
            </div>
            </div>

            <SheetFooter className="flex-row justify-end">
              <Button type="submit" size="sm" disabled={isFull} loading={isSubmitting} loadingText="Legger til">
                Legg til deltaker
              </Button>
            </SheetFooter>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
