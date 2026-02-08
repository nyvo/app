import { StudentDashboardLayout } from '@/components/student/StudentDashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { User, Mail, Phone, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';

const StudentProfilePage = () => {
  const { user, profile } = useAuth();

  return (
    <StudentDashboardLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="font-geist text-2xl font-medium tracking-tight text-text-primary">
            Min profil
          </h1>
          <p className="text-muted-foreground mt-1">
            Kontoinformasjon
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
          <div className="p-6 space-y-6">
            
            {/* Name */}
            <div className="flex items-start gap-4">
              <div className="mt-1 h-8 w-8 rounded-lg bg-surface-elevated flex items-center justify-center text-text-secondary shrink-0">
                <User className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-text-tertiary uppercase tracking-wider mb-1">
                  Navn
                </label>
                <p className="text-base text-text-primary font-medium">
                  {profile?.name || 'Ikke registrert'}
                </p>
              </div>
            </div>

            {/* Email */}
            <div className="flex items-start gap-4">
              <div className="mt-1 h-8 w-8 rounded-lg bg-surface-elevated flex items-center justify-center text-text-secondary shrink-0">
                <Mail className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-text-tertiary uppercase tracking-wider mb-1">
                  E-post
                </label>
                <p className="text-base text-text-primary">
                  {user?.email}
                </p>
              </div>
            </div>

            {/* Phone */}
            <div className="flex items-start gap-4">
              <div className="mt-1 h-8 w-8 rounded-lg bg-surface-elevated flex items-center justify-center text-text-secondary shrink-0">
                <Phone className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-text-tertiary uppercase tracking-wider mb-1">
                  Telefon
                </label>
                <p className="text-base text-text-primary">
                  {profile?.phone || 'Ikke registrert'}
                </p>
              </div>
            </div>

            {/* Member since */}
            <div className="flex items-start gap-4">
              <div className="mt-1 h-8 w-8 rounded-lg bg-surface-elevated flex items-center justify-center text-text-secondary shrink-0">
                <Calendar className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-text-tertiary uppercase tracking-wider mb-1">
                  Medlem siden
                </label>
                <p className="text-base text-text-primary">
                  {profile?.created_at 
                    ? format(new Date(profile.created_at), 'd. MMMM yyyy', { locale: nb })
                    : 'Ukjent'}
                </p>
              </div>
            </div>

          </div>
          
          <div className="px-6 py-4 bg-surface/30 border-t border-zinc-200 text-xs text-muted-foreground">
            Ta kontakt hvis du trenger å endre noe.
          </div>
        </div>
      </div>
    </StudentDashboardLayout>
  );
};

export default StudentProfilePage;
