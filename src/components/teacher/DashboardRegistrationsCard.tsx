import { Link } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { UserAvatar } from '@/components/ui/user-avatar';
import { PaymentBadge } from '@/components/ui/payment-badge';
import { Card } from '@/components/ui/card';
import type { PaymentStatus } from '@/components/ui/payment-badge';
import type { Registration } from '@/types/dashboard';

interface DashboardRegistrationsCardProps {
  registrations: Registration[];
}

function SignupRow({ registration }: { registration: Registration }) {
  return (
    <Link
      to="/teacher/signups"
      className="group flex items-center gap-2 sm:gap-3 rounded-lg px-2 py-3 outline-none smooth-transition hover:bg-surface-muted/50 focus-visible:bg-surface-muted/50"
    >
      <UserAvatar
        name={registration.participant.name}
        src={registration.participant.avatar}
        size="sm"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate text-foreground">{registration.participant.name}</p>
        <p className="text-sm mt-0.5 truncate text-muted-foreground">{registration.course}</p>
      </div>
      {registration.paymentStatus && (
        <PaymentBadge status={registration.paymentStatus as PaymentStatus} size="sm" />
      )}
    </Link>
  );
}

export function DashboardRegistrationsCard({ registrations }: DashboardRegistrationsCardProps) {
  const recentRegistrations = registrations.slice(0, 3);

  return (
    <section>
      <h2 className="text-base font-medium mb-3 text-foreground">Påmeldinger</h2>
      <Card className="p-3 sm:p-4">
        {recentRegistrations.length === 0 ? (
        <div className="flex items-center gap-2 sm:gap-3 py-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-muted-foreground">
            <UserPlus className="h-4 w-4" />
          </div>
          <p className="text-sm font-medium text-foreground">Ingen nye påmeldinger</p>
        </div>
      ) : (
        <div className="divide-y divide-border/50">
          {recentRegistrations.map((registration) => (
            <SignupRow key={registration.id} registration={registration} />
          ))}
        </div>
        )}
      </Card>
    </section>
  );
}
