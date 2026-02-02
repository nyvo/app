import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';

export interface MobileStickyBarProps {
  price: number | null;
  isFull: boolean;
  isAlreadySignedUp: boolean;
  submitting: boolean;
  joiningWaitlist: boolean;
  currentWaitlistCount: number | null;
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
  joiningWaitlist,
  currentWaitlistCount,
  isEnded,
  studioUrl,
}) => {
  const displayPrice = price || 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-white/80 backdrop-blur-xl lg:hidden">
      <div className="mx-auto flex max-w-lg items-center justify-between p-4">
        {isEnded ? (
          /* Course ended */
          <>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Status</span>
              <span className="font-geist text-base font-medium text-text-tertiary">
                Avsluttet
              </span>
            </div>
            <Button asChild size="compact" variant="outline">
              <a href={studioUrl}>Se kommende kurs</a>
            </Button>
          </>
        ) : (
          /* Price + Submit */
          <>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">
                {isFull ? 'Venteliste' : 'Total pris'}
              </span>
              <span className="font-geist text-xl font-medium text-text-primary">
                {isFull ? 'Gratis' : `${displayPrice} kr`}
              </span>
            </div>

            {isAlreadySignedUp ? (
              <Button size="compact" disabled>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Påmeldt
              </Button>
            ) : (
              <Button
                className="flex items-center gap-2"
                size="compact"
                type="submit"
                form="booking-form"
                disabled={submitting || joiningWaitlist}
              >
                {submitting || joiningWaitlist ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {isFull ? 'Melder på...' : 'Behandler'}
                  </>
                ) : (
                  <>
                    {isFull ? 'Meld på' : 'Fullfør'}
                    {isFull && currentWaitlistCount !== null && (
                      <span className="text-xs opacity-70">(#{currentWaitlistCount + 1})</span>
                    )}
                    {!isFull && <ArrowRight className="h-4 w-4" />}
                  </>
                )}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
};
