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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { FieldError } from '@/components/ui/field-error';
import { checkCourseAvailability, createSignup } from '@/services/signups';
import { friendlyError } from '@/lib/error-messages';
import { AUTH_VALIDATION } from '@/lib/auth-messages';
import { formatPersonName, isValidEmail } from '@/lib/utils';


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
    name: '',
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
      setFormData({ name: '', email: '', phone: '', note: '' });
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

  // Inline validation on blur (ui-patterns §2.3) — marking a field touched
  // without validating it would leave errors invisible until submit.
  const validateField = (field: 'name' | 'email') => {
    let message = '';
    if (field === 'name' && !formData.name.trim()) {
      message = 'Skriv inn navnet på deltakeren';
    }
    if (field === 'email') {
      if (!formData.email.trim()) message = AUTH_VALIDATION.emailRequired;
      else if (!isValidEmail(formData.email)) message = AUTH_VALIDATION.emailInvalid;
    }
    setErrors((prev) => {
      const next = { ...prev };
      if (message) next[field] = message;
      else delete next[field];
      return next;
    });
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    if (field === 'name' || field === 'email') validateField(field);
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

    if (!formData.name.trim()) {
      newErrors.name = 'Skriv inn navnet på deltakeren';
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
      name: true,
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
        participant_name: formatPersonName(formData.name),
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
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
            {/* Mental-model note — manual signups bypass the integrated
                payment flow. Shown as an info callout so the teacher clearly
                registers that they handle payment themselves. */}
            <Alert variant="info" size="sm">
              Manuelle påmeldinger registreres som betalt. Du håndterer betalingen selv (Vipps, kontant, faktura).
            </Alert>

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

            {/* Full name */}
            <div>
              <Label
                htmlFor="name"
                data-error={(errors.name && touched.name) || undefined}
                className="mb-2"
              >
                Navn
              </Label>
              <Input
                id="name"
                type="text"
                name="name"
                autoComplete="name"
                value={formData.name}
                onChange={handleInputChange}
                onBlur={() => handleBlur('name')}
                aria-invalid={!!(errors.name && touched.name)}
                aria-describedby={errors.name && touched.name ? 'name-error' : undefined}
                aria-required="true"
                disabled={isSubmitting}
              />
              {errors.name && touched.name && (
                <FieldError id="name-error">{errors.name}</FieldError>
              )}
            </div>

            {/* Email */}
            <div>
              <Label
                htmlFor="email"
                data-error={(errors.email && touched.email) || undefined}
                className="mb-2"
              >
                E-post
              </Label>
              <Input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                onBlur={() => handleBlur('email')}
                aria-invalid={!!(errors.email && touched.email)}
                aria-describedby={errors.email && touched.email ? 'email-error' : undefined}
                aria-required="true"
                disabled={isSubmitting}
              />
              {errors.email && touched.email && (
                <FieldError id="email-error">{errors.email}</FieldError>
              )}
            </div>

            {/* Phone */}
            <div>
              <Label htmlFor="phone" className="mb-2">
                Telefonnummer <span className="text-foreground-muted">(valgfritt)</span>
              </Label>
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
              <Label htmlFor="note" className="mb-2">
                Notat <span className="text-foreground-muted">(valgfritt)</span>
              </Label>
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

            <SheetFooter>
              <Button type="submit" className="w-full" disabled={isFull} loading={isSubmitting} loadingText="Legger til">
                Legg til deltaker
              </Button>
            </SheetFooter>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
