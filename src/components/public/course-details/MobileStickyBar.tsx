import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

export interface MobileStickyBarProps {
  price: number | null;
  isFull: boolean;
  isAlreadySignedUp: boolean;
  submitting: boolean;
  isEnded: boolean;
  studioUrl: string;
}

/**
 * Mobile sticky action bar (fixed bottom)
 * Mirrors BookingSidebar state
 * Hidden on desktop (lg:hidden)
 */
export const MobileStickyBar: React.FC<MobileStickyBarProps> = ({
  price,
  isFull,
  isAlreadySignedUp,
  submitting,
  isEnded,
  studioUrl,
}) => {
  const displayPrice = price || 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-white/80 backdrop-blur-xl lg:hidden pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-lg items-center justify-between p-4">
        {isEnded ? (
          /* Course ended */
          <>
            <div className="flex flex-col">
              <span className="text-xs text-text-tertiary">Status</span>
              <span className="font-geist text-base font-medium text-text-tertiary">
                Avsluttet
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
              <span className="text-xs text-text-tertiary">
                Total pris
              </span>
              <span className="font-geist text-xl font-medium text-text-primary">
                {displayPrice} kr
              </span>
            </div>

            {isAlreadySignedUp ? (
              <Button size="default" disabled>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Påmeldt
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
                Fullfør
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
};
