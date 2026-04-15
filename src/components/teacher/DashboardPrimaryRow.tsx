import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CreditCard, Calendar } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { listContainerVariants, listItemVariants } from '@/lib/motion';

interface BentoCardProps {
  count: number;
  label: string;
  to: string;
  icon: LucideIcon;
}

function BentoCard({ count, label, to, icon: Icon }: BentoCardProps) {
  return (
    <motion.div variants={listItemVariants}>
      <Link
        to={to}
        className="group flex flex-col justify-between rounded-lg border border-border bg-card p-4 sm:p-5 outline-none smooth-transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 h-full min-h-[100px] sm:min-h-[112px]"
      >
        <div className="flex items-center justify-between">
          <span className="text-4xl font-semibold tracking-tight tabular-nums leading-none text-foreground">
            {count}
          </span>
          <Icon className="h-5 w-5 text-muted-foreground/40" />
        </div>
        <p className="mt-3 text-xs font-medium text-muted-foreground">{label}</p>
      </Link>
    </motion.div>
  );
}

interface DashboardPrimaryRowProps {
  outstandingPayments: number;
  activeCourses: number;
}

export function DashboardPrimaryRow({ outstandingPayments, activeCourses }: DashboardPrimaryRowProps) {
  return (
    <section aria-label="Nøkkeltall">
      <motion.div
        variants={listContainerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 gap-2 sm:gap-3"
      >
        <BentoCard
          count={outstandingPayments}
          label="Utestående betalinger"
          to="/teacher/signups"
          icon={CreditCard}
        />
        <BentoCard
          count={activeCourses}
          label="Aktive kurs"
          to="/teacher/courses"
          icon={Calendar}
        />
      </motion.div>
    </section>
  );
}
