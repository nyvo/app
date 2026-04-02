import React from 'react';
import { calculateServiceFee, calculateTotalPrice } from '@/lib/pricing';
import { formatKroner } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

export interface TicketSelectorProps {
  price: number | null;
}

/**
 * Order summary card — shows course fee, service fee, and total
 * Matches Stripe's embedded order summary styling (bg-muted, no border)
 */
export const TicketSelector: React.FC<TicketSelectorProps> = ({ price }) => {
  const basePrice = price || 0;
  const isFree = basePrice === 0;

  if (isFree) return null;

  const serviceFee = calculateServiceFee(price);
  const total = calculateTotalPrice(price);

  return (
    <div className="rounded-lg bg-muted p-4 space-y-3">
      {/* Course fee */}
      <div className="flex justify-between items-center">
        <span className="text-sm text-foreground">Kursavgift</span>
        <span className="text-sm text-foreground">{formatKroner(basePrice)}</span>
      </div>

      {/* Service fee */}
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">Servicegebyr</span>
        <span className="text-sm text-muted-foreground">{formatKroner(serviceFee)}</span>
      </div>

      {/* Divider */}
      <Separator />

      {/* Total */}
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-foreground">Totalt</span>
        <span className="text-sm font-medium text-foreground">{formatKroner(total)}</span>
      </div>
    </div>
  );
};
