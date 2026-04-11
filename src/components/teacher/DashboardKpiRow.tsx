import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CreditCard, MessageSquare, Users, CalendarClock, CheckCircle2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { listItemVariants } from '@/lib/motion';

export interface KpiItem {
  id: string;
  count: number;
  label: string;
  to: string;
  icon: 'payment' | 'message' | 'enrollment' | 'capacity';
  /** Optional subtitle shown below the label when count > 0 */
  sublabel?: string;
}

interface DashboardKpiRowProps {
  items: KpiItem[];
}

const iconMap: Record<KpiItem['icon'], LucideIcon> = {
  payment: CreditCard,
  message: MessageSquare,
  enrollment: Users,
  capacity: CalendarClock,
};

function KpiCard({ item }: { item: KpiItem }) {
  const Icon = iconMap[item.icon];
  const isActive = item.count > 0;

  return (
    <motion.div variants={listItemVariants}>
      <Link
        to={item.to}
        className="group flex flex-col justify-between rounded-lg border border-border bg-surface p-3 sm:p-4 outline-none smooth-transition hover:bg-surface-muted/50 focus-visible:ring-2 focus-visible:ring-ring/50 h-full min-h-[88px] sm:min-h-[100px]"
      >
        <div className="flex items-center justify-between">
          <span
            className={`type-display-2 tabular-nums leading-none ${
              isActive ? 'text-foreground' : 'text-muted-foreground/40'
            }`}
          >
            {item.count}
          </span>
          <div
            className={`flex size-8 items-center justify-center rounded-lg ${
              isActive ? 'bg-surface-muted text-foreground' : 'bg-surface-muted/50 text-muted-foreground/40'
            }`}
          >
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3">
          <p
            className={`type-label-sm ${
              isActive ? 'text-foreground' : 'text-muted-foreground'
            }`}
          >
            {item.label}
          </p>
          {item.sublabel && isActive && (
            <p className="type-meta mt-0.5 text-muted-foreground">{item.sublabel}</p>
          )}
        </div>
      </Link>
    </motion.div>
  );
}

// Stagger delay per item (seconds)
const STAGGER_DELAY = 0.04;

export function DashboardKpiRow({ items }: DashboardKpiRowProps) {
  const allClear = items.every((item) => item.count === 0);
  const bannerDelay = items.length * STAGGER_DELAY + 0.18;

  return (
    <section aria-label="Nøkkeltall">
      <motion.div
        initial="hidden"
        animate="visible"
        transition={{ staggerChildren: STAGGER_DELAY }}
        className={`grid gap-2 sm:gap-3 ${
          items.length <= 3
            ? 'grid-cols-2 md:grid-cols-3'
            : 'grid-cols-2 md:grid-cols-4'
        }`}
      >
        {items.map((item) => (
          <KpiCard key={item.id} item={item} />
        ))}
      </motion.div>
      {allClear && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: bannerDelay, duration: 0.18 }}
          className="mt-3 flex items-center gap-2 px-1"
        >
          <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="type-body-sm text-muted-foreground">Alt ser bra ut — ingenting trenger oppfølging nå.</p>
        </motion.div>
      )}
    </section>
  );
}
