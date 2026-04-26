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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { UserPlus } from '@/lib/icons';
import { checkCourseAvailability, createSignup } from '@/services/signups';
import { friendlyError } from '@/lib/error-messages';
import { isValidEmail } from '@/lib/utils';


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

    if (!formData.email.trim()) {
      newErrors.email = 'Skriv inn e-post';
    } else if (!isValidEmail(formData.email)) {
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
      setSubmitError('Noe gikk galt. Last siden på nytt.');
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

      // ticket_type_id + the 3 snapshots are auto-resolved inside createSignup
      // from the course's default tier — manual adds don't need to pick one.
      const { error } = await createSignup({
        organization_id: organizationId,
        course_id: courseId,
        participant_name: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
        participant_email: formData.email.trim().toLowerCase(),
        participant_phone: formData.phone.trim() || null,
        note: formData.note.trim() || null,
        status: 'confirmed',
        payment_status: paymentMarked,
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
      setSubmitError(err instanceof Error ? err.message : 'Noe gikk galt. Prøv igjen.');
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Legg til deltaker</DialogTitle>
          <DialogDescription>
            Legg til deltaker manuelt.
          </DialogDescription>
        </DialogHeader>

        {isCheckingCapacity ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size="lg" className="text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
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
                  className="text-xs font-medium mb-1.5 block text-foreground"
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
                  aria-invalid={!!errors.firstName}
                  aria-describedby={
                    errors.firstName && touched.firstName ? 'firstName-error' : undefined
                  }
                  aria-required="true"
                  disabled={isSubmitting}
                  className={
                    errors.firstName && touched.firstName
                      ? 'border-destructive bg-destructive/5 animate-shake'
                      : ''
                  }
                />
                {errors.firstName && touched.firstName && (
                  <p
                    id="firstName-error"
                    role="alert"
                    className="text-xs mt-1.5 text-destructive"
                  >
                    {errors.firstName}
                  </p>
                )}
              </div>

              {/* Last Name */}
              <div>
                <label
                  htmlFor="lastName"
                  className="text-xs font-medium mb-1.5 block text-foreground"
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
                  aria-invalid={!!errors.lastName}
                  aria-describedby={
                    errors.lastName && touched.lastName ? 'lastName-error' : undefined
                  }
                  aria-required="true"
                  disabled={isSubmitting}
                  className={
                    errors.lastName && touched.lastName
                      ? 'border-destructive bg-destructive/5 animate-shake'
                      : ''
                  }
                />
                {errors.lastName && touched.lastName && (
                  <p
                    id="lastName-error"
                    role="alert"
                    className="text-xs mt-1.5 text-destructive"
                  >
                    {errors.lastName}
                  </p>
                )}
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="text-xs font-medium mb-1.5 block text-foreground">
                E-post <span className="text-destructive">*</span>
              </label>
              <Input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                onBlur={() => handleBlur('email')}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email && touched.email ? 'email-error' : 'email-hint'}
                aria-required="true"
                disabled={isSubmitting}
                className={
                  errors.email && touched.email
                    ? 'border-destructive bg-destructive/5 animate-shake'
                    : ''
                }
              />
              {errors.email && touched.email ? (
                <p
                  id="email-error"
                  role="alert"
                  className="text-xs mt-1.5 text-destructive"
                >
                  {errors.email}
                </p>
              ) : (
                <p id="email-hint" className="text-xs mt-1.5 text-muted-foreground">
                  Bekreftelse sendes hit
                </p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="text-xs font-medium mb-1.5 block text-foreground">
                Telefonnummer <span className="text-muted-foreground">(valgfritt)</span>
              </label>
              <Input
                id="phone"
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="9xx xx xxx"
                aria-describedby="phone-hint"
                disabled={isSubmitting}
              />
              <p id="phone-hint" className="text-xs mt-1.5 text-muted-foreground">
                For kontakt ved endringer
              </p>
            </div>

            {/* Note */}
            <div>
              <label htmlFor="note" className="text-xs font-medium mb-1.5 block text-foreground">
                Notat <span className="text-muted-foreground">(valgfritt)</span>
              </label>
              <Textarea
                id="note"
                name="note"
                value={formData.note}
                onChange={handleInputChange}
                rows={3}
                disabled={isSubmitting}
              />
              <p className="text-xs mt-1.5 text-muted-foreground">Synlig kun for instruktør</p>
            </div>

            {/* Payment Toggle */}
            <div>
              <p id="payment-label" className="text-xs font-medium mb-1.5 text-foreground">
                Betalingsstatus
              </p>
              <ToggleGroup
                type="single"
                value={paymentMarked}
                onValueChange={(v) => {
                  if (v === 'pending' || v === 'paid') setPaymentMarked(v);
                }}
                variant="segmented"
                size="sm"
                aria-labelledby="payment-label"
                disabled={isSubmitting}
                className="w-full"
              >
                <ToggleGroupItem value="pending" className="flex-1">Venter betaling</ToggleGroupItem>
                <ToggleGroupItem value="paid" className="flex-1">Betalt</ToggleGroupItem>
              </ToggleGroup>
              <p className="text-xs mt-1.5 text-muted-foreground">Registreres utenfor betalingsløsningen</p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline-soft"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Avbryt
              </Button>
              <Button type="submit" size="sm" disabled={isFull} loading={isSubmitting} loadingText="Legger til">
                <UserPlus className="size-3.5" />
                Legg til deltaker
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
