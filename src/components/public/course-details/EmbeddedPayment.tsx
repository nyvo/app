import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { calculateServiceFee, calculateTotalPrice } from '@/lib/pricing';
import { formatKroner } from '@/lib/utils';
import { embedDinteroCheckout, type DinteroCheckoutInstance } from '@/lib/dintero';

export interface EmbeddedPaymentProps {
  sid: string;
  courseName: string;
  courseMeta: string | null;
  ticketLabel: string;
  customerName: string;
  customerEmail: string;
  price: number;
  onPaymentSuccess: (transactionId: string) => void;
  onPaymentError: (error: string) => void;
  onBack: () => void;
}

/**
 * Step 2 — receipt summary + Dintero iframe in one folded-receipt card.
 * Mirrors the step-1 panel structure (course title + meta, then price
 * breakdown) so the user sees the same receipt they confirmed in step 1,
 * now locked. "Endre" returns to step 1 to edit name/email.
 */
export const EmbeddedPayment: React.FC<EmbeddedPaymentProps> = ({
  sid,
  courseName,
  courseMeta,
  ticketLabel,
  customerName,
  customerEmail,
  price,
  onPaymentSuccess,
  onPaymentError,
  onBack,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const checkoutRef = useRef<DinteroCheckoutInstance | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !sid) return;

    let disposed = false;

    embedDinteroCheckout({
      container,
      sid,
      onPaymentAuthorized: (transactionId) => {
        onPaymentSuccess(transactionId);
      },
      onPaymentError: (message) => {
        setError(message);
        onPaymentError(message);
      },
      onSessionCancel: () => {
        setCancelled(true);
      },
    })
      .then((instance) => {
        if (disposed) {
          instance.destroy?.();
          return;
        }
        checkoutRef.current = instance;
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Kunne ikke laste betaling';
        setError(message);
        onPaymentError(message);
      });

    return () => {
      disposed = true;
      checkoutRef.current?.destroy?.();
      checkoutRef.current = null;
    };
  }, [sid, onPaymentSuccess, onPaymentError]);

  const fee = calculateServiceFee(price);
  const total = calculateTotalPrice(price);

  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      {/* Customer row — inline "Endre" replaces the detached "Tilbake" link */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{customerName}</p>
          <p className="text-sm text-foreground-muted truncate mt-0.5">{customerEmail}</p>
        </div>
        <Button variant="plain" size="xs" type="button" onClick={onBack}>
          Endre
        </Button>
      </div>

      {/* Course block */}
      <div className="mt-4 border-t border-border pt-4">
        <p className="text-sm font-medium text-foreground">{courseName}</p>
        {courseMeta && <p className="text-sm text-foreground-muted mt-0.5">{courseMeta}</p>}
      </div>

      {/* Price breakdown — same shape as step 1, locked */}
      <div className="mt-4 border-t border-border pt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-foreground">{ticketLabel}</span>
          <span className="tabular-nums text-foreground">{formatKroner(price)}</span>
        </div>
        {fee > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-foreground-muted">Tjenestegebyr</span>
            <span className="tabular-nums text-foreground-muted">{formatKroner(fee)}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
          <span className="text-foreground">Totalt</span>
          <span className="tabular-nums text-foreground">{formatKroner(total)}</span>
        </div>
      </div>

      {/* Dintero iframe — same continuous card surface */}
      <div
        ref={containerRef}
        className="mt-6 min-h-[420px] w-full overflow-hidden rounded-md border border-border"
      />

      {cancelled && (
        <Alert variant="info" size="sm" className="mt-4">
          <AlertDescription>Betalingen ble avbrutt. Du kan starte på nytt.</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="error" size="sm" className="mt-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};
