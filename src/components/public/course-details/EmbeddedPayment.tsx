import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CreditCard, Lock, ChevronLeft } from '@/lib/icons';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { calculateServiceFee, calculateTotalPrice } from '@/lib/pricing';
import { formatKroner } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { embedDinteroCheckout, type DinteroCheckoutInstance } from '@/lib/dintero';

export interface EmbeddedPaymentProps {
  sid: string;
  courseName: string;
  price: number;
  onPaymentSuccess: (transactionId: string) => void;
  onPaymentError: (error: string) => void;
  onBack: () => void;
}

export const EmbeddedPayment: React.FC<EmbeddedPaymentProps> = ({
  sid,
  courseName,
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

  return (
    <div className="space-y-5">
      <Button
        variant="plain"
        size="xs"
        type="button"
        onClick={onBack}
        className="font-medium"
      >
        <ChevronLeft className="size-3.5" />
        Tilbake
      </Button>

      <div className="space-y-3 rounded-lg bg-muted p-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-foreground">{courseName}</span>
          <span className="text-sm font-mono tabular-nums text-foreground">{formatKroner(price)}</span>
        </div>
        {calculateServiceFee(price) > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Servicegebyr</span>
            <span className="text-sm font-mono tabular-nums text-muted-foreground">
              {formatKroner(calculateServiceFee(price))}
            </span>
          </div>
        )}
        <Separator />
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-foreground">Totalt</span>
          <span className="text-sm font-mono font-medium tabular-nums text-foreground">
            {formatKroner(calculateTotalPrice(price))}
          </span>
        </div>
      </div>

      <div
        ref={containerRef}
        className="min-h-[420px] w-full overflow-hidden rounded-lg border border-border"
      />

      {cancelled && (
        <Alert variant="info" size="sm">
          <AlertDescription>Betalingen ble avbrutt. Du kan starte på nytt.</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="error" size="sm">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <p className="text-xs flex items-center justify-center gap-1 text-center text-muted-foreground">
        <Lock className="size-3.5" />
        <CreditCard className="size-3.5" />
        Sikker betaling via Dintero
      </p>
    </div>
  );
};
