import type { courseBookability } from '@/components/public/studio/studioFacts';

/** Bookability state → CTA label, shared storefront-wide. */
export const BOOKABILITY_LABELS: Record<ReturnType<typeof courseBookability>, string> = {
  open: 'Reserver',
  full: 'Fullt',
  closed: 'Stengt',
  cancelled: 'Avlyst',
};
