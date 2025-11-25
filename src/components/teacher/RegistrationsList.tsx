import { XCircle, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Registration, SignupStatus } from '@/types/dashboard';

interface RegistrationsListProps {
  registrations: Registration[];
}

// Status badge component (matching SignupsPage style)
const StatusBadge = ({ status, waitlistPosition }: { status: SignupStatus; waitlistPosition?: number }) => {
  const config = {
    confirmed: {
      bg: 'bg-[#ECFDF5]',
      border: 'border-[#D1FAE5]',
      text: 'text-[#059669]',
      dot: 'bg-[#059669]',
      label: 'Påmeldt',
    },
    waitlist: {
      bg: 'bg-[#FFFBEB]',
      border: 'border-[#FEF3C7]',
      text: 'text-[#B45309]',
      dot: 'bg-[#F59E0B]',
      label: `Venteliste #${waitlistPosition || 1}`,
    },
    cancelled: {
      bg: 'bg-[#F3F4F6]',
      border: 'border-[#E5E7EB]',
      text: 'text-[#4B5563]',
      label: 'Avbestilt',
    },
  };

  const { bg, border, text, dot, label } = config[status];

  return (
    <span className={`inline-flex items-center gap-1 rounded-full ${bg} px-2 py-0.5 text-[10px] font-semibold ${text} border ${border}`}>
      {status === 'cancelled' ? (
        <XCircle className="h-2.5 w-2.5" />
      ) : (
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      )}
      {label}
    </span>
  );
};

// Participant avatar component
const ParticipantAvatar = ({ participant }: { participant: Registration['participant'] }) => {
  if (participant.avatar) {
    return (
      <img
        src={participant.avatar}
        className="h-10 w-10 rounded-full object-cover border border-[#E7E5E4] group-hover:border-[#D6D3D1]"
        alt={participant.name}
      />
    );
  }

  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F5F5F4] text-xs font-medium text-[#57534E] border border-[#E7E5E4] group-hover:border-[#D6D3D1]">
      {participant.initials}
    </div>
  );
};

export const RegistrationsList = ({ registrations }: RegistrationsListProps) => {
  return (
    <div className="col-span-1 md:col-span-3 lg:col-span-4 rounded-3xl border border-[#E7E5E4] bg-white p-0 shadow-sm overflow-hidden ios-ease hover:border-[#D6D3D1] hover:shadow-md">
      <div className="flex items-center justify-between p-5 px-7 border-b border-[#F5F5F4]">
        <h3 className="font-geist text-sm font-semibold text-[#292524]">Påmeldinger</h3>
        <Link
          to="/teacher/signups"
          className="text-xs font-medium text-[#A8A29E] hover:text-[#57534E] transition-colors"
        >
          Se alle
        </Link>
      </div>

      {registrations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm font-medium text-[#292524] mb-1">Ingen påmeldinger</p>
          <p className="text-xs text-[#78716C]">Du har ingen nye påmeldinger</p>
        </div>
      ) : (
        <div className="divide-y divide-[#F5F5F4]">
          {registrations.map((registration) => (
            <div
              key={registration.id}
              className="group flex items-center gap-4 px-7 py-4 hover:bg-[#FDFBF7] cursor-pointer transition-colors"
            >
              {/* Avatar */}
              <div className="flex-shrink-0">
                <ParticipantAvatar participant={registration.participant} />
              </div>

              {/* Participant Info: Name + Email */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-medium text-[#292524] truncate">
                    {registration.participant.name}
                  </p>
                  <span className="text-[10px] font-medium text-[#A8A29E] group-hover:text-[#78716C] flex-shrink-0">
                    {registration.registeredAt}
                  </span>
                </div>
                <p className="text-xs text-[#78716C] truncate">
                  {registration.participant.email}
                </p>
              </div>

              {/* Course & Time */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#292524] truncate mb-0.5">
                  {registration.course}
                </p>
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3 w-3 text-[#A8A29E]" />
                  <p className="text-xs text-[#78716C] truncate group-hover:text-[#57534E]">
                    {registration.courseTime}
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex-1 min-w-0 flex justify-end">
                <StatusBadge status={registration.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
