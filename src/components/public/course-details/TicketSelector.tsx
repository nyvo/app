import React from 'react';
import { calculateServiceFee, calculateTotalPrice } from '@/lib/pricing';
import { formatKroner } from '@/lib/utils';

export interface TicketSelectorProps {
  price: number | null;
}

/**
 * Order summary card — shows course fee, service fee, and total
 * Matches Stripe's embedded order summary styling (bg-zinc-50, no border)
 */
export const TicketSelector: React.FC<TicketSelectorProps> = ({ price }) => {
  const basePrice = price || 0;
  const isFree = basePrice === 0;

  if (isFree) return null;

  const serviceFee = calculateServiceFee(price);
  const total = calculateTotalPrice(price);

  return (
    <div className="rounded-xl bg-surface-elevated p-4 space-y-3">
      {/* Course fee */}
      <div className="flex justify-between items-center">
        <span className="text-sm text-text-primary">Kursavgift</span>
        <span className="text-sm text-text-primary">{formatKroner(basePrice)}</span>
      </div>

      {/* Service fee */}
      <div className="flex justify-between items-center">
        <span className="text-sm text-text-secondary">Servicegebyr</span>
        <span className="text-sm text-text-secondary">{formatKroner(serviceFee)}</span>
      </div>

      {/* Divider */}
      <div className="border-t border-zinc-200" />

      {/* Total */}
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-text-primary">Totalt</span>
        <span className="text-sm font-medium text-text-primary">{formatKroner(total)}</span>
      </div>
    </div>
  );
};
