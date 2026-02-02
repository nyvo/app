import React from 'react';
import { Check } from 'lucide-react';

export interface TicketSelectorProps {
  price: number | null;
}

/**
 * Ticket selector for choosing pricing tiers
 * Currently shows only standard ticket - student pricing coming soon
 *
 * TODO: Implement student discount pricing when backend supports it
 * Backend requirements:
 * - Add priceStandard and priceStudent fields to Course model
 * - Update Stripe integration to handle different pricing tiers
 */
export const TicketSelector: React.FC<TicketSelectorProps> = ({ price }) => {
  const displayPrice = price || 0;

  return (
    <div className="space-y-3">
      {/* Standard ticket card */}
      <div className="relative border-2 border-text-primary bg-surface/30 rounded-xl p-4 cursor-default">
        {/* Selected indicator */}
        <div className="absolute top-3 right-3">
          <div className="h-5 w-5 rounded-full bg-text-primary flex items-center justify-center">
            <Check className="h-3 w-3 text-white" />
          </div>
        </div>

        <div className="pr-8">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-base font-medium text-text-primary">Standard</span>
            <span className="text-sm text-muted-foreground">•</span>
            <span className="text-base font-medium text-text-primary">{displayPrice} kr</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Per time
          </p>
        </div>
      </div>

      {/* Student pricing coming soon hint */}
      <p className="text-xxs text-text-tertiary text-center">
        Studentrabatt kommer snart
      </p>
    </div>
  );
};
