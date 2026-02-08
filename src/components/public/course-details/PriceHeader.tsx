import React from 'react';
import { StatusIndicator } from '@/components/ui/status-indicator';

export interface PriceHeaderProps {
  price: number | null;
  spotsAvailable: number;
}

/**
 * Displays course price and availability status
 * Uses StatusIndicator for WCAG-compliant availability badges
 */
export const PriceHeader: React.FC<PriceHeaderProps> = ({
  price,
  spotsAvailable,
}) => {
  // Determine availability badge variant and label
  const getAvailabilityBadge = () => {
    if (spotsAvailable === 0) {
      return {
        variant: 'neutral' as const,
        label: 'Fullt',
      };
    } else if (spotsAvailable <= 3) {
      return {
        variant: 'warning' as const,
        label: `${spotsAvailable} ${spotsAvailable === 1 ? 'plass' : 'plasser'} igjen`,
      };
    } else {
      return {
        variant: 'success' as const,
        label: 'Ledige plasser',
      };
    }
  };

  const availabilityBadge = getAvailabilityBadge();
  const displayPrice = price !== null && price > 0 ? price : null;

  return (
    <div className="px-6 py-5 border-b border-zinc-100 bg-surface/50 flex justify-between items-center">
      <div>
        <span className="block text-xxs font-medium text-muted-foreground uppercase tracking-wider">
          Pris
        </span>
        <div className="flex items-baseline gap-1 mt-1">
          {displayPrice ? (
            <>
              <span className="text-2xl font-medium text-text-primary">
                {displayPrice} kr
              </span>
              <span className="text-sm text-muted-foreground font-normal">/ time</span>
            </>
          ) : (
            <span className="text-2xl font-medium text-status-confirmed-text">Gratis</span>
          )}
        </div>
      </div>
      <div>
        <StatusIndicator
          variant={availabilityBadge.variant}
          label={availabilityBadge.label}
          mode="badge"
          size="sm"
        />
      </div>
    </div>
  );
};
