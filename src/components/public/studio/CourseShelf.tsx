import { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { CourseCard } from './CourseCard';
import type { PublicCourseWithDetails } from '@/services/publicCourses';

interface CourseShelfProps {
  title: string;
  description?: string;
  courses: PublicCourseWithDetails[];
  ratio?: 'portrait' | 'landscape';
}

/**
 * Horizontally scrollable row of course cards. Snap-x, hidden scrollbar,
 * arrow controls fade in on hover (desktop only). Mono section heading
 * pairs with editorial body copy.
 */
export function CourseShelf({ title, description, courses, ratio = 'portrait' }: CourseShelfProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  function updateArrows() {
    const el = scrollerRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }

  useEffect(() => {
    updateArrows();
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateArrows, { passive: true });
    window.addEventListener('resize', updateArrows);
    return () => {
      el.removeEventListener('scroll', updateArrows);
      window.removeEventListener('resize', updateArrows);
    };
  }, [courses.length]);

  function scrollBy(dir: 1 | -1) {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * (el.clientWidth * 0.85), behavior: 'smooth' });
  }

  if (courses.length === 0) return null;

  return (
    <section className="relative">
      <header className="mb-6 flex items-end justify-between gap-4">
        <div className="space-y-1.5">
          <h2 className="text-xl font-semibold text-foreground">
            {title}
          </h2>
          {description && (
            <p className="text-sm text-foreground-muted max-w-md leading-snug">
              {description}
            </p>
          )}
        </div>
        <div className="hidden md:flex items-center gap-1">
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            disabled={!canLeft}
            className={cn(
              'flex size-8 items-center justify-center rounded-full border border-border bg-background',
              'transition-colors duration-200',
              canLeft ? 'text-foreground hover:bg-muted' : 'text-foreground-disabled cursor-not-allowed',
            )}
            aria-label="Forrige"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            disabled={!canRight}
            className={cn(
              'flex size-8 items-center justify-center rounded-full border border-border bg-background',
              'transition-colors duration-200',
              canRight ? 'text-foreground hover:bg-muted' : 'text-foreground-disabled cursor-not-allowed',
            )}
            aria-label="Neste"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </header>

      {/* Scroller */}
      <div className="relative -mx-4 sm:-mx-6 lg:-mx-8">
        <div
          ref={scrollerRef}
          className={cn(
            'flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory',
            'px-4 sm:px-6 lg:px-8 pb-1',
            '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          )}
        >
          {courses.map(course => (
            <div
              key={course.id}
              className={cn(
                'snap-start shrink-0',
                ratio === 'portrait'
                  ? 'w-[68%] sm:w-[40%] md:w-[28%] lg:w-[22%]'
                  : 'w-[88%] sm:w-[56%] md:w-[42%] lg:w-[34%]',
              )}
            >
              <CourseCard course={course} ratio={ratio} />
            </div>
          ))}
          {/* Trailing edge spacer */}
          <div className="shrink-0 w-1" aria-hidden />
        </div>
        {/* Edge fade hints */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-8 sm:w-10 bg-gradient-to-r from-background to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 sm:w-10 bg-gradient-to-l from-background to-transparent" />
      </div>
    </section>
  );
}
