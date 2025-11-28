import { useState, useMemo } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Search,
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Plus,
  Calendar,
  MoreHorizontal,
  StickyNote,
  XCircle,
  Flower2,
  Menu,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff
} from 'lucide-react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { TeacherSidebar } from '@/components/teacher/TeacherSidebar';
import type { Signup, SignupStatus, SignupPaymentType } from '@/types/dashboard';
import { useEmptyState } from '@/context/EmptyStateContext';
import { Button } from '@/components/ui/button';
import { mockSignups, emptySignups, type SignupWithTimestamps } from '@/data/mockData';

// Sort types
type SortField = 'classDateTime' | 'registeredAt' | null;
type SortDirection = 'asc' | 'desc';

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
  // Simplified avatar: Always show initials/generic icon unless specific override
  // User requested to drop profile photos, so we default to initials
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F5F5F4] text-xs font-medium text-[#57534E] ring-1 ring-[#E7E5E4]">
      {participant.initials || participant.name.substring(0, 2).toUpperCase()}
    </div>
  );
};

export const SignupsPage = () => {
  const { showEmptyState, toggleEmptyState } = useEmptyState();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [statusFilter, setStatusFilter] = useState<string>('Alle');
  const [classFilter, setClassFilter] = useState<string>('Alle');

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
    const data = showEmptyState ? emptySignups : mockSignups;
    
    // First filter by search query
    let result = data;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (signup) =>
          signup.participant.name.toLowerCase().includes(query) ||
          signup.participant.email.toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (statusFilter !== 'Alle') {
      if (statusFilter === 'Påmeldt') {
        result = result.filter(s => s.status === 'confirmed');
      } else if (statusFilter === 'Venteliste') {
        result = result.filter(s => s.status === 'waitlist');
      } else if (statusFilter === 'Avbestilt') {
        result = result.filter(s => s.status === 'cancelled');
      }
    }

    // Filter by class (simple implementation)
    if (classFilter !== 'Alle') {
      result = result.filter(s => s.className === classFilter);
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
  }, [searchQuery, sortField, sortDirection, showEmptyState]);

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
              <h1 className="font-geist text-3xl font-medium tracking-tight text-[#292524]">Påmeldinger</h1>
              <p className="text-sm text-[#78716C] mt-1">Oversikt over studenter og bookinger.</p>
            </div>
            <div className="flex items-center gap-3">
               <button 
                onClick={toggleEmptyState}
                className="flex items-center gap-2 rounded-full border border-[#E7E5E4] bg-white px-3.5 py-2 text-sm font-medium text-[#57534E] hover:bg-[#F5F5F4] hover:text-[#292524] hover:border-[#D6D3D1] transition-all shadow-sm"
                aria-label="Toggle empty state"
              >
                {showEmptyState ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                {showEmptyState ? 'Vis data' : 'Vis tomt'}
              </button>
              <button className="flex items-center gap-2 rounded-full border border-[#E7E5E4] bg-white px-3.5 py-2 text-sm font-medium text-[#57534E] hover:bg-[#F5F5F4] hover:text-[#292524] hover:border-[#D6D3D1] transition-all shadow-sm">
                <Download className="h-4 w-4" />
                Eksporter
              </button>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                <span>Manuell booking</span>
              </Button>
            </div>
          </div>

          {/* Removed Stats Cards per request */}
          
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
                className="h-10 w-full rounded-full border border-[#E7E5E4] bg-white pl-10 pr-4 text-sm text-[#292524] placeholder:text-[#A8A29E] focus:border-[#A8A29E] focus:outline-none focus:ring-1 focus:ring-[#A8A29E] transition-all shadow-sm hover:border-[#D6D3D1]"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={`flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-all shadow-sm whitespace-nowrap ${statusFilter !== 'Alle' ? 'bg-white text-[#292524] border-[#E7E5E4]' : 'bg-white text-[#57534E] border-[#E7E5E4] hover:bg-[#F5F5F4] hover:text-[#292524] hover:border-[#D6D3D1]'}`}>
                    <Filter className={`h-3.5 w-3.5 ${statusFilter !== 'Alle' ? 'text-[#292524]' : 'text-[#A8A29E]'}`} />
                    Status: {statusFilter}
                    <ChevronDown className={`ml-1 h-3.5 w-3.5 ${statusFilter !== 'Alle' ? 'text-[#292524]' : 'text-[#A8A29E]'}`} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {['Alle', 'Påmeldt', 'Venteliste', 'Avbestilt'].map((status) => (
                    <DropdownMenuItem key={status} onClick={() => setStatusFilter(status)}>
                      {status}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={`flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-all shadow-sm whitespace-nowrap ${classFilter !== 'Alle' ? 'bg-white text-[#292524] border-[#E7E5E4]' : 'bg-white text-[#57534E] border-[#E7E5E4] hover:bg-[#F5F5F4] hover:text-[#292524] hover:border-[#D6D3D1]'}`}>
                    Kurs: {classFilter}
                    <ChevronDown className={`ml-1 h-3.5 w-3.5 ${classFilter !== 'Alle' ? 'text-[#292524]' : 'text-[#A8A29E]'}`} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => setClassFilter('Alle')}>Alle</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setClassFilter('Vinyasa Flow')}>Vinyasa Flow</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setClassFilter('Yin Yoga')}>Yin Yoga</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setClassFilter('Meditation')}>Meditation</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

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
                        label="Kurs & Tid"
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
                             {showEmptyState ? 'Det er ingen påmeldinger å vise.' : 'Prøv å søke etter et annet navn eller e-post'}
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
