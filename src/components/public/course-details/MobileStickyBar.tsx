import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { calculateTotalPrice } from '@/lib/pricing';
import { formatKroner } from '@/lib/utils';

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
 * Mobile sticky bar — fixed bottom, matches Linear aesthetic
 */
export const MobileStickyBar: React.FC<MobileStickyBarProps> = ({
  price,
  isFull,
  submitting,
  isEnded,
  studioUrl,
  stripeConnected = true,
}) => {
  const total = calculateTotalPrice(price);
  const priceLabel = formatKroner(total);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-200 bg-white md:hidden pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-lg items-center justify-between p-4">
        {isEnded ? (
          <>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Status</span>
              <span className="text-sm font-medium text-muted-foreground">Fullført</span>
            </div>
            <Button asChild size="default" variant="outline">
              <Link to={studioUrl}>Se kommende kurs</Link>
            </Button>
          </>
        ) : isFull ? (
          null
        ) : (
          <>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Total</span>
              <span className="text-xl font-medium text-text-primary">{priceLabel}</span>
            </div>

            {!stripeConnected ? (
              <Button size="default" disabled>
                Åpner snart
              </Button>
            ) : (
              <Button
                className="flex items-center gap-2 bg-zinc-900 text-white hover:bg-zinc-800 rounded-lg"
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
