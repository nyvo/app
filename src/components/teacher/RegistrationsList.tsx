import { Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StatusBadge } from '@/components/ui/status-badge';
import { ParticipantAvatar } from '@/components/ui/participant-avatar';
import type { Registration } from '@/types/dashboard';

interface RegistrationsListProps {
  registrations: Registration[];
}

export const RegistrationsList = ({ registrations }: RegistrationsListProps) => {
  return (
    <div className="col-span-1 md:col-span-3 lg:col-span-4 rounded-3xl border border-border bg-white p-0 shadow-sm overflow-hidden ios-ease hover:border-ring hover:shadow-md">
      <div className="flex items-center justify-between p-5 px-7 border-b border-border">
        <h3 className="font-geist text-sm font-semibold text-text-primary">Påmeldinger</h3>
        <Link
          to="/teacher/signups"
          className="text-xs font-medium text-text-tertiary hover:text-text-secondary transition-colors"
        >
          Se alle
        </Link>
      </div>

      {registrations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8">
          {/* Stacked avatars placeholder */}
          <div className="flex items-center -space-x-2 mb-3 opacity-40 grayscale">
            <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white"></div>
            <div className="w-8 h-8 rounded-full bg-gray-300 border-2 border-white"></div>
            <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white"></div>
          </div>
          <p className="text-sm font-medium text-text-primary">Ingen påmeldinger ennå</p>
          <p className="text-xs text-text-tertiary mt-1">Påmeldinger vil vises her når du publiserer et kurs.</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {registrations.map((registration) => (
            <div
              key={registration.id}
              className="group flex items-center gap-4 px-7 py-4 hover:bg-surface cursor-pointer transition-colors"
            >
              {/* Avatar */}
              <div className="flex-shrink-0">
                <ParticipantAvatar participant={registration.participant} size="lg" />
              </div>

              {/* Participant Info: Name + Email */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {registration.participant.name}
                  </p>
                  <span className="text-xxs font-medium text-text-tertiary group-hover:text-muted-foreground flex-shrink-0">
                    {registration.registeredAt}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {registration.participant.email}
                </p>
              </div>

              {/* Course & Time */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate mb-0.5">
                  {registration.course}
                </p>
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3 w-3 text-text-tertiary" />
                  <p className="text-xs text-muted-foreground truncate group-hover:text-text-secondary">
                    {registration.courseTime}
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex-1 min-w-0 flex justify-end">
                <StatusBadge status={registration.status} size="sm" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
