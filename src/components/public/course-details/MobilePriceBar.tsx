import { Button } from '@/components/ui/button';
import { formatCoursePrice } from '@/lib/utils';
import type { PublicCourseWithDetails } from '@/services/publicCourses';

interface MobilePriceBarProps {
  course: PublicCourseWithDetails;
}

/**
 * Sticky bottom bar on mobile / tablet. Always shows price; CTA scrolls to
 * the inline booking form. Hidden on lg+ where the right rail is visible.
 */
export function MobilePriceBar({ course }: MobilePriceBarProps) {
  const isFull = course.max_participants !== null && course.spots_available <= 0;
  const isCancelled = course.status === 'cancelled';
  const lowSpots =
    course.max_participants !== null &&
    course.spots_available > 0 &&
    course.spots_available <= 3;

  function scrollToForm() {
    const el = document.getElementById('booking');
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top: y, behavior: 'smooth' });
    setTimeout(() => {
      const firstInput = el.querySelector<HTMLInputElement>('input');
      firstInput?.focus({ preventScroll: true });
    }, 450);
  }

  return (
    <div className="lg:hidden fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xl font-semibold tracking-tight tabular-nums text-foreground">
            {formatCoursePrice(course.price)}
          </div>
          {lowSpots && !isFull && (
            <div className="text-xs font-medium text-warning">
              {course.spots_available} plasser igjen
            </div>
          )}
        </div>
        <Button
          type="button"
          size="default"
          disabled={isFull || isCancelled}
          onClick={scrollToForm}
          className="shrink-0"
        >
          {isCancelled ? 'Avlyst' : isFull ? 'Fullt' : 'Meld på'}
        </Button>
      </div>
    </div>
  );
}
