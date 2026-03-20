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
            className="text-xs font-medium text-muted-foreground block"
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
          />
          {touched.firstName && errors.firstName && (
            <p className="text-xs text-destructive">Skriv inn fornavnet ditt</p>
          )}
        </div>

        <div className="space-y-2">
          <label
            htmlFor="lastName"
            className="text-xs font-medium text-muted-foreground block"
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
          />
          {touched.lastName && errors.lastName && (
            <p className="text-xs text-destructive">Skriv inn etternavnet ditt</p>
          )}
        </div>
      </div>

      {/* Email */}
      <div className="space-y-2">
        <label
          htmlFor="email"
          className="text-xs font-medium text-muted-foreground block"
        >
          E-post
        </label>
        <div className="relative group">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-text-primary transition-colors pointer-events-none" />
          <Input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={onChange}
            onBlur={() => onBlur('email')}
            disabled={submitting}
            className={`pl-9 ${
              touched.email && errors.email
                ? 'border-destructive focus:border-destructive focus:ring-destructive'
                : ''
            }`}
            placeholder="ola@eksempel.no"
            aria-invalid={touched.email && errors.email}
          />
        </div>
        {touched.email && errors.email && (
          <p className="text-xs text-destructive">Ugyldig e-post</p>
        )}
      </div>

      {/* Message (optional) */}
      <div className="space-y-2">
        <label
          htmlFor="message"
          className="text-xs font-medium text-muted-foreground block"
        >
          Beskjed <span className="text-muted-foreground">(valgfritt)</span>
        </label>
        <Textarea
          id="message"
          name="message"
          value={formData.message}
          onChange={onChange}
          disabled={submitting}
          rows={2}
          placeholder="Noe vi bør vite om?"
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
        />
        <label htmlFor="termsAccepted" className="text-xs text-muted-foreground select-none">
          Bekreft{' '}
          <Link
            to="/terms"
            className="text-text-primary underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-500"
            target="_blank"
          >
            vilkår
          </Link>
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
