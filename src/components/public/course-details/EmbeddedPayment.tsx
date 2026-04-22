import React, { useEffect, useMemo, useState } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import type { StripeError } from '@stripe/stripe-js';
import { getStripe } from '@/lib/stripe';
import { Button } from '@/components/ui/button';
import { CreditCard, Lock, ChevronLeft } from '@/lib/icons';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { calculateServiceFee, calculateTotalPrice } from '@/lib/pricing';
import { formatKroner } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

export interface EmbeddedPaymentProps {
  clientSecret: string
  courseName: string
  price: number
  onPaymentSuccess: (paymentIntentId: string) => void
  onPaymentError: (error: string) => void
  onBack: () => void
}

function PaymentForm({
  courseName,
  price,
  onPaymentSuccess,
  onPaymentError,
  onBack,
}: {
  courseName: string
  price: number
  onPaymentSuccess: (paymentIntentId: string) => void
  onPaymentError: (error: string) => void
  onBack: () => void
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message || 'Noe gikk galt');
      setProcessing(false);
      return;
    }

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.href,
        payment_method_data: {
          billing_details: {
            address: {
              country: 'NO',
            },
          },
        },
      },
      redirect: 'if_required',
    });

    if (result.error) {
      const stripeError = result.error as StripeError;
      const message = stripeError.message || 'Betalingen feilet. Prøv igjen.';
      setError(message);
      setProcessing(false);
      onPaymentError(message);
    } else if (result.paymentIntent) {
      if (result.paymentIntent.status === 'requires_capture' || result.paymentIntent.status === 'succeeded') {
        onPaymentSuccess(result.paymentIntent.id);
      } else {
        setError('Noe gikk galt med betalingen. Prøv igjen eller kontakt oss.');
        setProcessing(false);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Back button */}
      <Button
        variant="plain"
        size="xs"
        type="button"
        onClick={onBack}
        disabled={processing}
        className="font-medium"
      >
        <ChevronLeft className="size-3.5" />
        Tilbake
      </Button>

      {/* Order summary */}
      <div className="space-y-3 rounded-lg bg-muted p-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-foreground">{courseName}</span>
          <span className="text-sm font-mono tabular-nums text-foreground">{formatKroner(price)}</span>
        </div>
        {calculateServiceFee(price) > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Servicegebyr</span>
            <span className="text-sm font-mono tabular-nums text-muted-foreground">{formatKroner(calculateServiceFee(price))}</span>
          </div>
        )}
        <Separator />
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-foreground">Totalt</span>
          <span className="text-sm font-mono font-medium tabular-nums text-foreground">{formatKroner(calculateTotalPrice(price))}</span>
        </div>
      </div>

      {/* Stripe Payment Element */}
      <PaymentElement
        options={{
          layout: 'tabs',
          fields: {
            billingDetails: {
              address: {
                country: 'never',
              },
            },
          },
        }}
      />

      {/* Error display */}
      {error && (
        <Alert variant="error" size="sm">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Submit button */}
      <Button
        type="submit"
        size="sm"
        className="w-full"
        disabled={!stripe || processing}
        loading={processing}
        loadingText="Behandler betaling"
      >
        <Lock className="size-3.5 mr-1.5" />
        Betal {formatKroner(calculateTotalPrice(price))}
      </Button>

      <p className="text-xs flex items-center justify-center gap-1 text-center text-muted-foreground">
        <CreditCard className="size-3.5" />
        Sikker betaling via Stripe
      </p>
    </form>
  );
}

/**
 * Inline embedded Stripe Payment Element.
 * Renders inside the BookingSidebar, replacing the booking form.
 */
export const EmbeddedPayment: React.FC<EmbeddedPaymentProps> = ({
  clientSecret,
  courseName,
  price,
  onPaymentSuccess,
  onPaymentError,
  onBack,
}) => {
  const stripePromise = getStripe();
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 640px)').matches);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 640px)');
    const handleChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  const appearanceRules = useMemo(() => {
    if (isMobile) {
      return {
        '.Tab': {
          border: '1px solid #e5e5e5',
          borderRadius: '8px',
          backgroundColor: '#ffffff',
        },
        '.Tab:hover': {
          border: '1px solid #a3a3a3',
        },
        '.Tab--selected': {
          border: '1px solid #1a1a1a',
          boxShadow: '0 0 0 1px #1a1a1a',
        },
        '.Error': {
          fontSize: '12px',
        },
      };
    }

    return {
      '.Input': {
        border: '1px solid #e5e5e5',
        padding: '10px 16px',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
        backgroundColor: '#ffffff',
      },
      '.Input:hover': {
        border: '1px solid #a3a3a3',
      },
      '.Input:focus': {
        border: '1px solid #a3a3a3',
        backgroundColor: '#ffffff',
        boxShadow: '0 0 0 2px rgba(163, 163, 163, 0.5)',
        outline: 'none',
      },
      '.Label': {
        fontSize: '12px',
        fontWeight: '500',
        color: '#737373',
        marginBottom: '6px',
      },
      '.Tab': {
        border: '1px solid #e5e5e5',
        borderRadius: '8px',
        backgroundColor: '#ffffff',
      },
      '.Tab:hover': {
        border: '1px solid #a3a3a3',
      },
      '.Tab--selected': {
        border: '1px solid #1a1a1a',
        boxShadow: '0 0 0 1px #1a1a1a',
      },
      '.Error': {
        fontSize: '12px',
      },
    };
  }, [isMobile]);

  return (
    <Elements
      key={clientSecret}
      stripe={stripePromise}
      options={{
        clientSecret,
        locale: 'nb',
        appearance: {
          theme: 'flat',
          variables: {
            colorPrimary: '#1a1a1a',
            colorBackground: '#ffffff',
            colorText: '#18181b',
            colorTextSecondary: '#737373',
            colorTextPlaceholder: '#a3a3a3',
            colorDanger: '#dc2626',
            fontFamily: 'Geist Sans, system-ui, -apple-system, sans-serif',
            fontSizeBase: '14px',
            fontSizeSm: '12px',
            borderRadius: '8px',
            spacingUnit: '4px',
            focusBoxShadow: '0 0 0 2px rgba(163, 163, 163, 0.5)',
            focusOutline: 'none',
          },
          rules: appearanceRules as Record<string, Record<string, string>>,
        },
      }}
    >
      <PaymentForm
        courseName={courseName}
        price={price}
        onPaymentSuccess={onPaymentSuccess}
        onPaymentError={onPaymentError}
        onBack={onBack}
      />
    </Elements>
  );
};
