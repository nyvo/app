import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export interface MobileStickyBarProps {
  price: number | null;
  isFull: boolean;
  isAlreadySignedUp?: boolean;
  submitting: boolean;
  isEnded: boolean;
  studioUrl: string;
  stripeConnected?: boolean;
}

/**
 * Mobile sticky action bar (fixed bottom)
 * Mirrors BookingSidebar state
 * Hidden on desktop (lg:hidden)
 */
export const MobileStickyBar: React.FC<MobileStickyBarProps> = ({
  price,
  isFull,
  submitting,
  isEnded,
  studioUrl,
  stripeConnected = true,
}) => {
  const displayPrice = price || 0;
  const isFreePrice = displayPrice === 0;
  const priceLabel = isFreePrice ? 'Gratis' : `${displayPrice} kr`;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-200 bg-white/80 backdrop-blur-xl lg:hidden pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-lg items-center justify-between p-4">
        {isEnded ? (
          /* Course ended */
          <>
            <div className="flex flex-col">
              <span className="text-xs text-text-secondary">Status</span>
              <span className="font-geist text-base font-medium text-text-secondary">
                Fullført
              </span>
            </div>
            <Button asChild size="default" variant="outline">
              <Link to={studioUrl}>Se kommende kurs</Link>
            </Button>
          </>
        ) : isFull ? (
          null
        ) : (
          /* Price + Submit */
          <>
            <div className="flex flex-col">
              <span className="text-xs text-text-secondary">
                Totalpris
              </span>
              <span className="font-geist text-xl font-medium text-text-primary">
                {priceLabel}
              </span>
            </div>

            {!stripeConnected ? (
              <Button size="default" disabled>
                Åpner snart
              </Button>
            ) : (
              <Button
                className="flex items-center gap-2"
                size="default"
                type="submit"
                form="booking-form"
                loading={submitting}
                loadingText="Behandler"
              >
                Fullfør påmelding
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
};
