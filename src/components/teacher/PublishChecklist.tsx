import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { Check } from '@/lib/icons';
import { cn } from '@/lib/utils';

export type ChecklistItemKey = 'image' | 'description' | 'location' | 'payments';

export interface ChecklistItem {
  key: ChecklistItemKey;
  /** Short title of the missing/completed piece. */
  title: string;
  /** Secondary line — always rendered, kept short. */
  description: string;
  done: boolean;
  /** Required items block publishing until complete. Optional items are recommendations. */
  required?: boolean;
}

interface PublishChecklistProps {
  items: ChecklistItem[];
  /** Fires when a row is clicked. Caller routes to the right tab/anchor. */
  onItemClick: (key: ChecklistItemKey) => void;
}

/**
 * Pre-publish checklist on the course Oversikt tab. Visual pattern mirrors
 * the onboarding "Kom i gang" list (GetStartedPage) — bordered container,
 * whole-row clickable, leading status circle, trailing chevron. Hides
 * itself once every row is done.
 */
export function PublishChecklist({ items, onItemClick }: PublishChecklistProps) {
  const requiredItems = items.filter((item) => item.required !== false);
  const completedRequiredCount = requiredItems.filter((item) => item.done).length;
  const allItemsDone = items.every((item) => item.done);
  if (allItemsDone) return null;

  return (
    <section>
      <header className="mb-4 flex items-baseline justify-between gap-4">
        <h2 className="text-base font-medium text-foreground">
          Før du publiserer
        </h2>
        <p className="text-base text-foreground-muted tabular-nums">
          {completedRequiredCount} av {requiredItems.length} påkrevd fullført
        </p>
      </header>

      <div className="overflow-hidden rounded-lg border border-border">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onItemClick(item.key)}
              className={cn(
                'group flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:bg-muted',
                !isLast && 'border-b border-border',
              )}
            >
              <span
                className={cn(
                  'grid size-5 shrink-0 place-items-center rounded-full',
                  item.done
                    ? 'bg-success-subtle text-success'
                    : 'border-2 border-border',
                )}
              >
                {item.done && <Check className="size-3" strokeWidth={2.5} />}
              </span>
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    'text-base font-medium',
                    item.done ? 'text-foreground-muted' : 'text-foreground',
                  )}
                >
                  {item.title}
                </p>
                <p className="text-base text-foreground-muted">{item.description}</p>
              </div>
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                size={16}
                strokeWidth={1.75}
                className="text-foreground-muted shrink-0"
              />
            </button>
          );
        })}
      </div>
    </section>
  );
}
