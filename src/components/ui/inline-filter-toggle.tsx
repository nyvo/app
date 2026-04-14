import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { FilterTabs, FilterTab } from '@/components/ui/filter-tabs';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface FilterOption {
  value: string;
  label: string;
  icon?: LucideIcon;
  count?: number;
  hidden?: boolean;
}

interface InlineFilterToggleProps {
  value: string;
  onValueChange: (value: string) => void;
  options: FilterOption[];
  defaultLabel?: string;
  className?: string;
}

export function InlineFilterToggle({
  value,
  onValueChange,
  options,
  defaultLabel = 'Filter',
  className,
}: InlineFilterToggleProps) {
  const [isOpen, setIsOpen] = useState(false);

  const activeOption = options.find(o => o.value === value);
  const buttonLabel = value === 'all' || !activeOption
    ? defaultLabel
    : activeOption.label;

  const visibleOptions = options.filter(o => !o.hidden);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        variant="outline-soft"
        size="sm"
        onClick={() => setIsOpen(prev => !prev)}
        className="gap-1.5 shrink-0"
      >
        {buttonLabel}
        <ChevronRight className={cn(
          "h-3.5 w-3.5 smooth-transition",
          isOpen && "rotate-90"
        )} />
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 'auto', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
          >
            <FilterTabs value={value} onValueChange={onValueChange} variant="contained">
              {visibleOptions.map(({ value: optValue, label, icon: Icon, count }) => (
                <FilterTab key={optValue} value={optValue}>
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                    {Icon && <Icon className="h-3.5 w-3.5" />}
                    {label}{count != null && count > 0 ? ` (${count})` : ''}
                  </span>
                </FilterTab>
              ))}
            </FilterTabs>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
