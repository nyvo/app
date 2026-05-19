import { useState } from 'react';
import { Loader2 } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { typedFrom } from '@/lib/supabase';

type Status = 'idle' | 'submitting' | 'success' | 'error';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function WaitlistForm({
  source,
  className = '',
  helperText,
}: {
  source: string;
  className?: string;
  helperText?: string;
}) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();

    if (!trimmed || !EMAIL_RE.test(trimmed)) {
      setStatus('error');
      setError('Skriv en gyldig e-postadresse.');
      return;
    }

    setStatus('submitting');
    setError(null);

    const { error: insertError } = await typedFrom('waitlist').insert({
      email: trimmed,
      source,
    });

    if (insertError && insertError.code !== '23505') {
      setStatus('error');
      setError('Noe gikk galt. Prøv igjen.');
      return;
    }

    setStatus('success');
  }

  if (status === 'success') {
    return (
      <div className={`mx-auto max-w-md text-center ${className}`}>
        <p className="text-base font-medium text-foreground">Takk! Vi sier fra når Openspot åpner.</p>
      </div>
    );
  }

  const submitting = status === 'submitting';

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className={`mx-auto w-full max-w-md ${className}`}
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor={`waitlist-${source}`} className="sr-only">
          E-postadresse
        </label>
        <Input
          id={`waitlist-${source}`}
          type="email"
          autoComplete="email"
          placeholder="din@epost.no"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status === 'error') {
              setStatus('idle');
              setError(null);
            }
          }}
          disabled={submitting}
          aria-invalid={status === 'error' || undefined}
          className="h-11 flex-1 text-base"
        />
        <Button type="submit" size="cta" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              <span className="sr-only">Sender…</span>
            </>
          ) : (
            'Bli varslet'
          )}
        </Button>
      </div>
      {status === 'error' && error ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      ) : helperText ? (
        <p className="mt-3 text-sm text-foreground-muted">{helperText}</p>
      ) : null}
    </form>
  );
}
