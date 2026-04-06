import { Link } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { UserAvatar } from '@/components/ui/user-avatar';
import { PaymentBadge } from '@/components/ui/payment-badge';
import type { PaymentStatus } from '@/components/ui/payment-badge';
import type { Registration } from '@/types/dashboard';

interface DashboardRegistrationsCardProps {
  registrations: Registration[];
}

function SignupCard({ registration }: { registration: Registration }) {
  return (
    <Link
      to="/teacher/signups"
      className="block overflow-hidden rounded-lg border border-border bg-surface-muted p-3 outline-none smooth-transition hover:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <div className="flex items-center gap-3">
        <UserAvatar
          name={registration.participant.name}
          src={registration.participant.avatar}
          size="sm"
        />
        <div className="min-w-0 flex-1">
          <p className="type-label truncate text-foreground">{registration.participant.name}</p>
          <p className="type-body-sm mt-0.5 truncate text-muted-foreground">{registration.course}</p>
        </div>
      </div>
      <div className="mt-2 h-5 pl-9">
        {registration.paymentStatus && (
          <PaymentBadge status={registration.paymentStatus as PaymentStatus} size="sm" />
        )}
      </div>
    </Link>
  );
}

export function DashboardRegistrationsCard({ registrations }: DashboardRegistrationsCardProps) {
  const recentRegistrations = registrations.slice(0, 3);

  return (
    <section>
      <h2 className="type-title mb-3 text-foreground">Påmeldinger</h2>

      {recentRegistrations.length === 0 ? (
        <div className="flex items-center gap-3 py-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-muted-foreground">
            <UserPlus className="h-4 w-4" />
          </div>
          <p className="type-label text-foreground">Ingen nye påmeldinger</p>
        </div>
      ) : (
        <div className="space-y-2">
          {recentRegistrations.map((registration) => (
            <SignupCard key={registration.id} registration={registration} />
          ))}
        </div>
      )}
    </section>
  );
}
