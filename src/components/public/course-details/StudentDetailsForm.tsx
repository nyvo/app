import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface StudentDetailsFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
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
 * Student details form for booking
 * Supports pre-filled data for authenticated students
 * Includes validation and error states
 */
export const StudentDetailsForm: React.FC<StudentDetailsFormProps> = ({
  formData,
  errors,
  touched,
  submitting,
  isAuthStudent,
  onChange,
  onBlur,
}) => {
  return (
    <div className="space-y-4">
      {/* Name fields */}
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-1">
          <label
            htmlFor="firstName"
            className="block text-xs font-medium text-text-secondary mb-1.5"
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
            disabled={submitting || isAuthStudent}
            className={`${
              touched.firstName && errors.firstName
                ? 'border-destructive focus:border-destructive focus:ring-destructive'
                : ''
            } ${isAuthStudent ? 'bg-surface-elevated opacity-60' : ''}`}
            placeholder="Ola"
            aria-invalid={touched.firstName && errors.firstName}
          />
          {touched.firstName && errors.firstName && (
            <p className="text-xs text-destructive mt-1">Skriv inn fornavnet ditt</p>
          )}
        </div>

        <div className="col-span-1">
          <label
            htmlFor="lastName"
            className="block text-xs font-medium text-text-secondary mb-1.5"
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
            disabled={submitting || isAuthStudent}
            className={`${
              touched.lastName && errors.lastName
                ? 'border-destructive focus:border-destructive focus:ring-destructive'
                : ''
            } ${isAuthStudent ? 'bg-surface-elevated opacity-60' : ''}`}
            placeholder="Nordmann"
            aria-invalid={touched.lastName && errors.lastName}
          />
          {touched.lastName && errors.lastName && (
            <p className="text-xs text-destructive mt-1">Skriv inn etternavnet ditt</p>
          )}
        </div>
      </div>

      {/* Email */}
      <div>
        <label
          htmlFor="email"
          className="block text-xs font-medium text-text-secondary mb-1.5"
        >
          E-post
        </label>
        <div className="relative group">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary group-focus-within:text-text-primary transition-colors pointer-events-none" />
          <Input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={onChange}
            onBlur={() => onBlur('email')}
            disabled={submitting || isAuthStudent}
            className={`pl-10 ${
              touched.email && errors.email
                ? 'border-destructive focus:border-destructive focus:ring-destructive'
                : ''
            } ${isAuthStudent ? 'bg-surface-elevated opacity-60' : ''}`}
            placeholder="ola@example.com"
            aria-invalid={touched.email && errors.email}
          />
        </div>
        {touched.email && errors.email && (
          <p className="text-xs text-destructive mt-1">
            Ugyldig e-post
          </p>
        )}
      </div>

      {/* Phone (optional) */}
      <div>
        <label
          htmlFor="phone"
          className="block text-xs font-medium text-text-secondary mb-1.5"
        >
          Telefon <span className="text-text-secondary">(valgfritt)</span>
        </label>
        <Input
          type="tel"
          id="phone"
          name="phone"
          value={formData.phone}
          onChange={onChange}
          disabled={submitting}
          placeholder="+47 123 45 678"
        />
      </div>

      {/* Message (optional) */}
      <div>
        <label
          htmlFor="message"
          className="block text-xs font-medium text-text-secondary mb-1.5"
        >
          Beskjed til instruktør <span className="text-text-secondary">(valgfritt)</span>
        </label>
        <Textarea
          id="message"
          name="message"
          value={formData.message}
          onChange={onChange}
          disabled={submitting}
          rows={3}
          placeholder="Noe instruktøren bør vite?"
        />
      </div>

      {/* Terms checkbox */}
      <div className="flex items-center gap-2.5 mt-4">
        <Checkbox
          id="termsAccepted"
          name="termsAccepted"
          checked={formData.termsAccepted}
          onChange={onChange}
          disabled={submitting}
          aria-invalid={touched.termsAccepted && errors.termsAccepted}
        />
        <label htmlFor="termsAccepted" className="text-xs text-text-secondary">
          Jeg godtar{' '}
          <Link
            to="/terms"
            className="underline hover:text-text-primary"
            target="_blank"
          >
            vilkårene
          </Link>{' '}
          for påmelding
        </label>
      </div>
      {touched.termsAccepted && errors.termsAccepted && (
        <p className="text-xs text-destructive -mt-2">
          Du må godta vilkårene for å gå videre
        </p>
      )}
    </div>
  );
};
