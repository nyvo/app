import { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Plus,
  Calendar,
  TrendingUp,
  MoreHorizontal,
  StickyNote,
  XCircle,
  Flower2,
  Menu,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { TeacherSidebar } from '@/components/teacher/TeacherSidebar';
import type { Signup, SignupStatus, SignupPaymentType } from '@/types/dashboard';

// Sort types
type SortField = 'classDateTime' | 'registeredAt' | null;
type SortDirection = 'asc' | 'desc';

// Extended signup type with sortable timestamps
interface SignupWithTimestamps extends Signup {
  classDateTime: Date;
  registeredAtTimestamp: Date;
}

// Mock data for signups with timestamps for sorting
const mockSignups: SignupWithTimestamps[] = [
  {
    id: '1',
    participant: {
      name: 'Kari Nordmann',
      email: 'kari.n@gmail.com',
      avatar: 'https://i.pravatar.cc/150?u=32',
    },
    className: 'Vinyasa Flow',
    classDate: 'Ons 23. Okt',
    classTime: '16:00',
    classDateTime: new Date('2024-10-23T16:00:00'),
    registeredAt: '2 timer siden',
    registeredAtTimestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    status: 'confirmed',
    paymentType: 'klippekort',
    paymentDetails: '2/10',
  },
  {
    id: '2',
    participant: {
      name: 'Lars Hansen',
      email: 'lars.hansen@outlook.com',
      avatar: 'https://i.pravatar.cc/150?u=55',
    },
    className: 'Ashtanga Intro',
    classDate: 'Tor 24. Okt',
    classTime: '18:00',
    classDateTime: new Date('2024-10-24T18:00:00'),
    registeredAt: 'I går',
    registeredAtTimestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
    status: 'waitlist',
    waitlistPosition: 1,
    paymentType: 'månedskort',
    note: 'Har en skade i skulderen, trenger tilpasninger.',
  },
  {
    id: '3',
    participant: {
      name: 'Ida Johansen',
      email: 'ida.j@hotmail.com',
      initials: 'IJ',
    },
    className: 'Yin Yoga',
    classDate: 'Fre 25. Okt',
    classTime: '09:00',
    classDateTime: new Date('2024-10-25T09:00:00'),
    registeredAt: '3 dager siden',
    registeredAtTimestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    status: 'cancelled',
    paymentType: 'unpaid',
  },
  {
    id: '4',
    participant: {
      name: 'Erik Solberg',
      email: 'erik.s@gmail.com',
      avatar: 'https://i.pravatar.cc/150?u=12',
    },
    className: 'Vinyasa Flow',
    classDate: 'Ons 23. Okt',
    classTime: '16:00',
    classDateTime: new Date('2024-10-23T16:00:00'),
    registeredAt: '4 timer siden',
    registeredAtTimestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
    status: 'confirmed',
    paymentType: 'drop-in',
    paymentDetails: 'Vipps',
    note: 'Ny elev, ønsker introduksjon.',
  },
  {
    id: '5',
    participant: {
      name: 'Sofia Berg',
      email: 'sofia.berg@gmail.com',
      avatar: 'https://i.pravatar.cc/150?u=41',
    },
    className: 'Pilates Core',
    classDate: 'Fre 25. Okt',
    classTime: '17:00',
    classDateTime: new Date('2024-10-25T17:00:00'),
    registeredAt: '1 dag siden',
    registeredAtTimestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
    status: 'confirmed',
    paymentType: 'halvårskort',
  },
];

// Sortable column header component
const SortableHeader = ({
  label,
  field,
  currentSort,
  currentDirection,
  onSort,
}: {
  label: string;
  field: SortField;
  currentSort: SortField;
  currentDirection: SortDirection;
  onSort: (field: SortField) => void;
}) => {
  const isActive = currentSort === field;

  return (
    <button
      onClick={() => onSort(field)}
      className="flex items-center gap-1.5 group py-3 px-6 text-xs font-medium uppercase tracking-wider text-[#78716C] hover:text-[#292524] transition-colors"
    >
      {label}
      <span className={`transition-colors ${isActive ? 'text-[#292524]' : 'text-[#A8A29E] group-hover:text-[#78716C]'}`}>
        {isActive ? (
          currentDirection === 'asc' ? (
            <ArrowUp className="h-3.5 w-3.5" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5" />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5" />
        )}
      </span>
    </button>
  );
};

// Status badge component
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
    <span className={`inline-flex items-center gap-1.5 rounded-full ${bg} px-2.5 py-1 text-xs font-medium ${text} border ${border}`}>
      {status === 'cancelled' ? (
        <XCircle className="h-3 w-3" />
      ) : (
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      )}
      {label}
    </span>
  );
};

// Payment badge component
const PaymentBadge = ({ paymentType, paymentDetails }: { paymentType: SignupPaymentType; paymentDetails?: string }) => {
  if (paymentType === 'unpaid') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-[#FECACA] bg-[#FEF2F2] px-2 py-0.5 text-xs font-medium text-[#991B1B]">
        Ikke betalt
      </span>
    );
  }

  const labels: Record<SignupPaymentType, string> = {
    klippekort: `Klippekort${paymentDetails ? ` (${paymentDetails})` : ''}`,
    månedskort: 'Månedskort',
    'drop-in': `Drop-in${paymentDetails ? ` (${paymentDetails})` : ''}`,
    halvårskort: 'Halvårskort',
    unpaid: 'Ikke betalt',
  };

  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-[#E7E5E4] bg-[#FAFAFA] px-2 py-0.5 text-xs font-medium text-[#57534E]">
      {labels[paymentType]}
    </span>
  );
};

// Note tooltip component
const NoteTooltip = ({ note, hasNote }: { note?: string; hasNote: boolean }) => {
  if (!hasNote) return null;

  return (
    <div className="group/note relative inline-flex">
      <StickyNote className={`h-4 w-4 cursor-help ${note ? 'text-[#F59E0B]' : 'text-[#A8A29E] group-hover:text-[#F59E0B]'} transition-colors`} />
      {note && (
        <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 w-48 rounded-lg bg-[#292524] p-2 text-[10px] text-[#F5F5F4] shadow-lg opacity-0 invisible group-hover/note:opacity-100 group-hover/note:visible transition-all z-20">
          {note}
        </div>
      )}
    </div>
  );
};

// Participant avatar component
const ParticipantAvatar = ({ participant }: { participant: Signup['participant'] }) => {
  if (participant.avatar) {
    return (
      <img
        src={participant.avatar}
        className="h-9 w-9 rounded-full object-cover ring-1 ring-[#E7E5E4]"
        alt={participant.name}
      />
    );
  }

  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F5F5F4] text-xs font-medium text-[#57534E] ring-1 ring-[#E7E5E4]">
      {participant.initials}
    </div>
  );
};

// Stats card component
const StatsCard = ({
  label,
  value,
  trend,
  trendLabel,
}: {
  label: string;
  value: number;
  trend?: number;
  trendLabel?: string;
}) => (
  <div className="flex flex-col rounded-xl border border-[#E7E5E4] bg-white p-4 shadow-[0_2px_4px_rgba(0,0,0,0.01)]">
    <span className="text-xs font-medium text-[#78716C] uppercase tracking-wide">{label}</span>
    <div className="mt-2 flex items-baseline gap-2">
      <span className="text-2xl font-semibold text-[#292524]">{value}</span>
      {trend !== undefined ? (
        <span className="text-xs font-medium text-[#10B981] flex items-center gap-0.5">
          <TrendingUp className="h-3 w-3" /> +{trend}%
        </span>
      ) : trendLabel ? (
        <span className="text-xs font-medium text-[#78716C]">{trendLabel}</span>
      ) : null}
    </div>
  </div>
);

export const SignupsPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Handle sort toggle
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field with default asc direction
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filtered and sorted signups
  const filteredAndSortedSignups = useMemo(() => {
    // First filter by search query
    let result = mockSignups;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = mockSignups.filter(
        (signup) =>
          signup.participant.name.toLowerCase().includes(query) ||
          signup.participant.email.toLowerCase().includes(query)
      );
    }

    // Then sort if a sort field is selected
    if (sortField) {
      result = [...result].sort((a, b) => {
        let comparison = 0;

        if (sortField === 'classDateTime') {
          comparison = a.classDateTime.getTime() - b.classDateTime.getTime();
        } else if (sortField === 'registeredAt') {
          comparison = a.registeredAtTimestamp.getTime() - b.registeredAtTimestamp.getTime();
        }

        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [searchQuery, sortField, sortDirection]);

  return (
    <SidebarProvider>
      <TeacherSidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-[#FDFBF7]">
        {/* Mobile Header */}
        <div className="flex md:hidden items-center justify-between p-6 border-b border-[#E7E5E4] bg-[#FDFBF7]/80 backdrop-blur-xl z-30 shrink-0">
          <div className="flex items-center gap-3">
            <Flower2 className="h-5 w-5 text-[#354F41]" />
            <span className="font-geist text-base font-semibold text-[#292524]">ZenStudio</span>
          </div>
          <SidebarTrigger>
            <Menu className="h-6 w-6 text-[#78716C]" />
          </SidebarTrigger>
        </div>

        {/* Header Toolbar */}
        <header className="flex flex-col gap-6 px-8 py-8 shrink-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="font-geist text-2xl font-semibold text-[#292524] tracking-tight">Påmeldinger</h1>
              <p className="text-sm text-[#78716C] mt-1">Oversikt over studenter og bookinger.</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 rounded-lg border border-[#E7E5E4] bg-white px-3.5 py-2 text-sm font-medium text-[#57534E] hover:bg-[#F5F5F4] hover:text-[#292524] hover:border-[#D6D3D1] transition-all shadow-sm">
                <Download className="h-4 w-4" />
                Eksporter
              </button>
              <button className="group flex items-center gap-2 rounded-full bg-[#292524] px-4 py-2 text-sm font-medium text-[#F5F5F4] shadow-lg shadow-[#292524]/10 hover:bg-[#44403C] hover:shadow-[#292524]/20 hover:scale-[1.02] active:scale-[0.98] ios-ease transition-all">
                <Plus className="h-4 w-4" />
                <span>Manuell booking</span>
              </button>
            </div>
          </div>

          {/* Quick Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatsCard label="Aktive påmeldinger" value={142} trend={12} />
            <StatsCard label="Venteliste" value={8} trendLabel="Totalt denne uken" />
            <StatsCard label="Nye studenter" value={24} trend={5} />
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-md group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A8A29E] group-focus-within:text-[#292524] transition-colors" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Søk etter navn eller e-post..."
                className="h-10 w-full rounded-lg border border-[#E7E5E4] bg-white pl-10 pr-4 text-sm text-[#292524] placeholder:text-[#A8A29E] focus:border-[#A8A29E] focus:outline-none focus:ring-1 focus:ring-[#A8A29E] transition-all shadow-sm hover:border-[#D6D3D1]"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
              <button className="flex items-center gap-2 rounded-lg border border-[#E7E5E4] bg-white px-3.5 py-2 text-sm font-medium text-[#57534E] hover:bg-[#F5F5F4] hover:text-[#292524] hover:border-[#D6D3D1] transition-all shadow-sm whitespace-nowrap">
                <Filter className="h-3.5 w-3.5 text-[#A8A29E]" />
                Status: Alle
                <ChevronDown className="ml-1 h-3.5 w-3.5 text-[#A8A29E]" />
              </button>
              <button className="flex items-center gap-2 rounded-lg border border-[#E7E5E4] bg-white px-3.5 py-2 text-sm font-medium text-[#57534E] hover:bg-[#F5F5F4] hover:text-[#292524] hover:border-[#D6D3D1] transition-all shadow-sm whitespace-nowrap">
                Klasse: Alle
                <ChevronDown className="ml-1 h-3.5 w-3.5 text-[#A8A29E]" />
              </button>
              <button className="flex items-center gap-2 rounded-lg border border-[#E7E5E4] bg-white px-3.5 py-2 text-sm font-medium text-[#57534E] hover:bg-[#F5F5F4] hover:text-[#292524] hover:border-[#D6D3D1] transition-all shadow-sm whitespace-nowrap">
                Dato: Denne uken
                <ChevronDown className="ml-1 h-3.5 w-3.5 text-[#A8A29E]" />
              </button>
            </div>
          </div>
        </header>

        {/* Table Container */}
        <div className="flex-1 overflow-hidden px-8 pb-8">
          <div className="h-full rounded-xl border border-[#E7E5E4] bg-white shadow-sm overflow-hidden flex flex-col">
            <div className="overflow-auto flex-1 custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10 bg-[#FDFBF7] shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                  <tr>
                    <th className="py-3 px-6 text-xs font-medium uppercase tracking-wider text-[#78716C]">Deltaker</th>
                    <th className="p-0">
                      <SortableHeader
                        label="Klasse & Tid"
                        field="classDateTime"
                        currentSort={sortField}
                        currentDirection={sortDirection}
                        onSort={handleSort}
                      />
                    </th>
                    <th className="p-0">
                      <SortableHeader
                        label="Påmeldt"
                        field="registeredAt"
                        currentSort={sortField}
                        currentDirection={sortDirection}
                        onSort={handleSort}
                      />
                    </th>
                    <th className="py-3 px-6 text-xs font-medium uppercase tracking-wider text-[#78716C]">Status</th>
                    <th className="py-3 px-6 text-xs font-medium uppercase tracking-wider text-[#78716C]">Betaling</th>
                    <th className="py-3 px-6 text-xs font-medium uppercase tracking-wider text-[#78716C] text-center">Info</th>
                    <th className="py-3 px-4 text-xs font-medium uppercase tracking-wider text-[#78716C]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F5F5F4] bg-white">
                  {filteredAndSortedSignups.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <Search className="h-8 w-8 text-[#D6D3D1]" />
                          <p className="text-sm font-medium text-[#292524]">Ingen resultater</p>
                          <p className="text-xs text-[#78716C]">
                            Prøv å søke etter et annet navn eller e-post
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredAndSortedSignups.map((signup) => (
                    <tr key={signup.id} className="group hover:bg-[#FAFAFA] transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <ParticipantAvatar participant={signup.participant} />
                          <div>
                            <p className="text-sm font-medium text-[#292524]">{signup.participant.name}</p>
                            <p className="text-xs text-[#78716C]">{signup.participant.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-[#292524]">{signup.className}</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Calendar className="h-3 w-3 text-[#A8A29E]" />
                            <span className="text-xs text-[#78716C]">{signup.classDate}, {signup.classTime}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm text-[#57534E]">{signup.registeredAt}</span>
                      </td>
                      <td className="py-4 px-6">
                        <StatusBadge status={signup.status} waitlistPosition={signup.waitlistPosition} />
                      </td>
                      <td className="py-4 px-6">
                        <PaymentBadge paymentType={signup.paymentType} paymentDetails={signup.paymentDetails} />
                      </td>
                      <td className="py-4 px-6 text-center">
                        <NoteTooltip note={signup.note} hasNote={!!signup.note} />
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button className="rounded-lg p-2 text-[#A8A29E] opacity-0 group-hover:opacity-100 hover:bg-[#F5F5F4] hover:text-[#292524] transition-all">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="border-t border-[#E7E5E4] bg-[#FAFAFA] px-6 py-3 flex items-center justify-between">
              <span className="text-xs text-[#78716C]">
                Viser <span className="font-medium text-[#292524]">{filteredAndSortedSignups.length > 0 ? '1' : '0'}-{filteredAndSortedSignups.length}</span> av <span className="font-medium text-[#292524]">{filteredAndSortedSignups.length}</span> resultater
                {searchQuery && <span className="ml-1">(filtrert)</span>}
              </span>
              <div className="flex items-center gap-2">
                <button className="rounded-lg border border-[#E7E5E4] bg-white p-1.5 text-[#A8A29E] hover:border-[#D6D3D1] hover:text-[#292524] disabled:opacity-50 transition-all">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button className="rounded-lg border border-[#E7E5E4] bg-white p-1.5 text-[#292524] hover:border-[#D6D3D1] transition-all">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #E7E5E4;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #D6D3D1;
        }
      `}</style>
    </SidebarProvider>
  );
};

export default SignupsPage;
