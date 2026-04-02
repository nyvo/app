import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

import { Link } from 'react-router-dom';

export interface StudentDetailsFormData {
  firstName: string;
  lastName: string;
  email: string;
  message: string;
  termsAccepted: boolean;
}

export interface StudentDetailsFormProps {
  formData: StudentDetailsFormData;
  errors: Record<string, boolean>;
  touched: Record<string, boolean>;
  submitting: boolean;
  isAuthStudent: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onBlur: (field: string) => void;
}

/**
 * Linear-style student details form
 * Compact inputs with xs labels, clean error states
 */
export const StudentDetailsForm: React.FC<StudentDetailsFormProps> = ({
  formData,
  errors,
  touched,
  submitting,
  onChange,
  onBlur,
}) => {
  return (
    <div className="space-y-5">
      {/* Name fields */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label
            htmlFor="firstName"
            className="text-xs font-medium text-foreground mb-1.5 block"
          >
            Fornavn
          </label>
          <Input
            type="text"
            id="firstName"
            name="firstName"
            value={formData.firstName}
            onChange={onChange}
            onBlur={() => onBlur('firstName')}
            disabled={submitting}
            className={`${
              touched.firstName && errors.firstName
                ? 'border-destructive focus:border-destructive focus:ring-destructive'
                : ''
            }`}
            placeholder="Ola"
            aria-invalid={touched.firstName && errors.firstName}
            aria-describedby={touched.firstName && errors.firstName ? 'firstName-error' : undefined}
          />
          {touched.firstName && errors.firstName && (
            <p id="firstName-error" role="alert" className="text-xs text-destructive">Skriv inn fornavnet ditt</p>
          )}
        </div>

        <div className="space-y-2">
          <label
            htmlFor="lastName"
            className="text-xs font-medium text-foreground mb-1.5 block"
          >
            Etternavn
          </label>
          <Input
            type="text"
            id="lastName"
            name="lastName"
            value={formData.lastName}
            onChange={onChange}
            onBlur={() => onBlur('lastName')}
            disabled={submitting}
            className={`${
              touched.lastName && errors.lastName
                ? 'border-destructive focus:border-destructive focus:ring-destructive'
                : ''
            }`}
            placeholder="Nordmann"
            aria-invalid={touched.lastName && errors.lastName}
            aria-describedby={touched.lastName && errors.lastName ? 'lastName-error' : undefined}
          />
          {touched.lastName && errors.lastName && (
            <p id="lastName-error" role="alert" className="text-xs text-destructive">Skriv inn etternavnet ditt</p>
          )}
        </div>
      </div>

      {/* Email */}
      <div className="space-y-2">
        <label
          htmlFor="email"
          className="text-xs font-medium text-foreground mb-1.5 block"
        >
          E-post
        </label>
        <Input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={onChange}
          onBlur={() => onBlur('email')}
          disabled={submitting}
          className={
            touched.email && errors.email
              ? 'border-destructive focus:border-destructive focus:ring-destructive'
              : ''
          }
          placeholder="ola@eksempel.no"
          aria-invalid={touched.email && errors.email}
          aria-describedby={touched.email && errors.email ? 'email-booking-error' : undefined}
        />
        {touched.email && errors.email && (
          <p id="email-booking-error" role="alert" className="text-xs text-destructive">Ugyldig e-post</p>
        )}
      </div>

      {/* Message (optional) */}
      <div className="space-y-2">
        <label
          htmlFor="message"
          className="text-xs font-medium text-foreground mb-1.5 block"
        >
          Beskjed til instruktør <span className="text-muted-foreground">(valgfritt)</span>
        </label>
        <Textarea
          id="message"
          name="message"
          value={formData.message}
          onChange={onChange}
          disabled={submitting}
          rows={2}
          placeholder="Noe instruktøren bør vite?"
        />
      </div>

      {/* Terms checkbox */}
      <div className="flex items-center gap-3 pt-2">
        <Checkbox
          id="termsAccepted"
          name="termsAccepted"
          checked={formData.termsAccepted}
          onCheckedChange={(checked) => {
            onChange({
              target: { name: 'termsAccepted', type: 'checkbox', checked: !!checked }
            } as React.ChangeEvent<HTMLInputElement>);
          }}
          disabled={submitting}
          aria-invalid={touched.termsAccepted && errors.termsAccepted ? true : undefined}
          aria-describedby={touched.termsAccepted && errors.termsAccepted ? 'terms-error' : undefined}
          aria-required="true"
        />
        <label htmlFor="termsAccepted" className="text-xs text-muted-foreground select-none">
          Jeg godtar{' '}
          <Link
            to="/terms"
            className="text-foreground underline decoration-border underline-offset-2 hover:decoration-muted-foreground"
            target="_blank"
            rel="noopener noreferrer"
          >
            vilkårene for påmelding
          </Link>
        </label>
      </div>
      {touched.termsAccepted && errors.termsAccepted && (
        <p id="terms-error" role="alert" className="text-xs text-destructive -mt-2">
          Du må godta vilkårene for å gå videre
        </p>
      )}
    </div>
  );
};
