import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { checkCourseAvailability, createSignup } from '@/services/signups';

import type { SignupInsert } from '@/types/database';

interface AddParticipantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  organizationId: string;
  onSuccess: () => void;
}

export function AddParticipantDialog({
  open,
  onOpenChange,
  courseId,
  organizationId,
  onSuccess,
}: AddParticipantDialogProps) {
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

  // Payment marking
  const [paymentMarked, setPaymentMarked] = useState<'pending' | 'paid'>('pending');

  // Submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Derived state
  const isFull = availableSpots !== null && availableSpots <= 0;

  // Check capacity when dialog opens
  useEffect(() => {
    if (open) {
      checkCapacity();
    }
  }, [open, courseId]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setFormData({ firstName: '', lastName: '', email: '', phone: '', note: '' });
      setErrors({});
      setTouched({});
      setSubmitError(null);
      setPaymentMarked('pending');
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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'E-postadresse er påkrevd';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Skriv inn en gyldig e-postadresse';
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
      setSubmitError('Organisasjons-ID mangler. Vennligst last siden på nytt.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Re-check capacity to handle race condition
      const { available } = await checkCourseAvailability(courseId);
      if (available <= 0) {
        setSubmitError('Kurset er fullt. Kan ikke legge til flere deltakere.');
        setIsSubmitting(false);
        return;
      }

      const signupData: SignupInsert = {
        organization_id: organizationId,
        course_id: courseId,
        participant_name: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
        participant_email: formData.email.trim(),
        participant_phone: formData.phone.trim() || null,
        note: formData.note.trim() || null,
        status: 'confirmed',
        payment_status: paymentMarked,
      };

      const { error } = await createSignup(signupData);

      if (error) {
        setSubmitError(error.message || 'Kunne ikke legge til deltaker');
        setIsSubmitting(false);
        return;
      }

      // Success!
      setIsSubmitting(false);
      onOpenChange(false);
      onSuccess(); // Trigger refresh
      toast.success('Deltaker lagt til');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'En feil oppstod');
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Legg til deltaker</DialogTitle>
          <DialogDescription>
            Fyll inn deltakerinformasjon for å legge til manuelt.
          </DialogDescription>
        </DialogHeader>

        {isCheckingCapacity ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size="lg" className="text-text-secondary" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Info banner if full */}
            {isFull && (
              <Alert variant="info" size="sm">
                <p className="text-sm text-text-secondary">
                  Kurset er fullt. Det er ikke mulig å legge til flere deltakere.
                </p>
              </Alert>
            )}

            {/* Error banner */}
            {submitError && (
              <Alert variant="error" icon={false}>
                <p className="text-sm text-status-error-text">{submitError}</p>
              </Alert>
            )}

            {/* Form fields */}
            <div className="grid grid-cols-2 gap-4">
              {/* First Name */}
              <div>
                <label
                  htmlFor="firstName"
                  className="block text-xs font-medium text-text-secondary mb-1.5"
                >
                  Fornavn <span className="text-destructive">*</span>
                </label>
                <Input
                  id="firstName"
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  onBlur={() => handleBlur('firstName')}
                  placeholder="Ola"
                  aria-invalid={!!errors.firstName}
                  aria-describedby={
                    errors.firstName && touched.firstName ? 'firstName-error' : undefined
                  }
                  aria-required="true"
                  disabled={isSubmitting}
                  className={
                    errors.firstName && touched.firstName
                      ? 'border-status-error-text bg-status-error-bg animate-shake'
                      : ''
                  }
                />
                {errors.firstName && touched.firstName && (
                  <p
                    id="firstName-error"
                    role="alert"
                    className="text-xs text-status-error-text font-medium mt-1.5"
                  >
                    {errors.firstName}
                  </p>
                )}
              </div>

              {/* Last Name */}
              <div>
                <label
                  htmlFor="lastName"
                  className="block text-xs font-medium text-text-secondary mb-1.5"
                >
                  Etternavn <span className="text-destructive">*</span>
                </label>
                <Input
                  id="lastName"
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  onBlur={() => handleBlur('lastName')}
                  placeholder="Nordmann"
                  aria-invalid={!!errors.lastName}
                  aria-describedby={
                    errors.lastName && touched.lastName ? 'lastName-error' : undefined
                  }
                  aria-required="true"
                  disabled={isSubmitting}
                  className={
                    errors.lastName && touched.lastName
                      ? 'border-status-error-text bg-status-error-bg animate-shake'
                      : ''
                  }
                />
                {errors.lastName && touched.lastName && (
                  <p
                    id="lastName-error"
                    role="alert"
                    className="text-xs text-status-error-text font-medium mt-1.5"
                  >
                    {errors.lastName}
                  </p>
                )}
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-text-secondary mb-1.5">
                E-postadresse <span className="text-destructive">*</span>
              </label>
              <Input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                onBlur={() => handleBlur('email')}
                placeholder="ola@eksempel.no"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email && touched.email ? 'email-error' : 'email-hint'}
                aria-required="true"
                disabled={isSubmitting}
                className={
                  errors.email && touched.email
                    ? 'border-status-error-text bg-status-error-bg animate-shake'
                    : ''
                }
              />
              {errors.email && touched.email ? (
                <p
                  id="email-error"
                  role="alert"
                  className="text-xs text-status-error-text font-medium mt-1.5"
                >
                  {errors.email}
                </p>
              ) : (
                <p id="email-hint" className="text-xs text-text-tertiary mt-1.5">
                  Bekreftelse sendes hit
                </p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-xs font-medium text-text-secondary mb-1.5">
                Telefonnummer <span className="text-text-tertiary font-normal">(valgfritt)</span>
              </label>
              <Input
                id="phone"
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="+47 000 00 000"
                aria-describedby="phone-hint"
                disabled={isSubmitting}
              />
              <p id="phone-hint" className="text-xs text-text-tertiary mt-1.5">
                For kontakt ved endringer
              </p>
            </div>

            {/* Note */}
            <div>
              <label htmlFor="note" className="block text-xs font-medium text-text-secondary mb-1.5">
                Kommentar <span className="text-text-tertiary font-normal">(valgfritt)</span>
              </label>
              <Textarea
                id="note"
                name="note"
                value={formData.note}
                onChange={handleInputChange}
                placeholder="Skriv en beskjed"
                rows={3}
                disabled={isSubmitting}
              />
              <p className="text-xs text-text-tertiary mt-1.5">Synlig kun for instruktør</p>
            </div>

            {/* Payment Toggle */}
            <div>
              <p id="payment-label" className="text-xs font-medium text-text-secondary mb-2">
                Betalingsstatus
              </p>
              <div
                role="radiogroup"
                aria-labelledby="payment-label"
                className="flex gap-1 border-b border-border"
              >
                {[
                  { value: 'pending' as const, label: 'Ikke betalt' },
                  { value: 'paid' as const, label: 'Betalt' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={paymentMarked === option.value}
                    onClick={() => setPaymentMarked(option.value)}
                    disabled={isSubmitting}
                    className={`cursor-pointer flex-1 py-1.5 px-3 text-xs font-medium smooth-transition disabled:opacity-50 disabled:cursor-not-allowed -mb-px border-b-2 ${
                      paymentMarked === option.value
                            ? 'border-text-primary text-text-primary'
                        : 'border-transparent text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-text-tertiary mt-1.5">Dette oppretter ikke noen faktisk betaling</p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline-soft"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Avbryt
              </Button>
              <Button type="submit" loading={isSubmitting} loadingText="Legger til...">
                Legg til deltaker
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
