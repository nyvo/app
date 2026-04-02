import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { User, Mail, Phone, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { typedFrom } from '@/lib/supabase';
import { toast } from 'sonner';

const StudentProfilePage = () => {
  const { user, profile } = useAuth();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setPhone(profile.phone || '');
    }
  }, [profile]);

  const isDirty = useMemo(() => {
    if (!profile) return false;
    return (
      name.trim() !== (profile.name || '') ||
      phone.trim() !== (profile.phone || '')
    );
  }, [name, phone, profile]);

  const handleSave = async () => {
    if (!profile?.id || !isDirty) return;
    setIsSaving(true);

    const { error } = await typedFrom('profiles')
      .update({ name: name.trim(), phone: phone.trim() || null } as any)
      .eq('id', profile.id);

    if (error) {
      toast.error('Kunne ikke lagre profilen');
    } else {
      toast.success('Profilen er oppdatert');
    }
    setIsSaving(false);
  };

  return (
    <>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="font-geist tracking-tight text-2xl font-medium text-foreground">
            Min profil
          </h1>
          <p className="text-muted-foreground mt-1">
            Kontoinformasjon
          </p>
        </div>

        <Card className="overflow-hidden">
          <div className="p-6 space-y-6">

            {/* Name */}
            <div className="flex items-start gap-4">
              <div className="mt-1 size-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                <User className="size-4" />
              </div>
              <div className="flex-1">
                <label htmlFor="student-name" className="block text-xs font-medium text-foreground mb-1.5">
                  Navn
                </label>
                <Input
                  id="student-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ditt fulle navn"
                />
              </div>
            </div>

            {/* Email (read-only) */}
            <div className="flex items-start gap-4">
              <div className="mt-1 size-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                <Mail className="size-4" />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  E-post
                </label>
                <p className="text-sm text-foreground py-2">
                  {user?.email}
                </p>
              </div>
            </div>

            {/* Phone */}
            <div className="flex items-start gap-4">
              <div className="mt-1 size-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                <Phone className="size-4" />
              </div>
              <div className="flex-1">
                <label htmlFor="student-phone" className="block text-xs font-medium text-foreground mb-1.5">
                  Telefon
                </label>
                <Input
                  id="student-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Telefonnummer"
                />
              </div>
            </div>

            {/* Member since (read-only) */}
            <div className="flex items-start gap-4">
              <div className="mt-1 size-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                <Calendar className="size-4" />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Medlem siden
                </label>
                <p className="text-sm text-foreground py-2">
                  {profile?.created_at
                    ? format(new Date(profile.created_at), 'd. MMMM yyyy', { locale: nb })
                    : 'Ukjent'}
                </p>
              </div>
            </div>

          </div>

          {isDirty && (
            <div className="px-6 py-4 border-t border-border flex justify-end">
              <Button
                onClick={handleSave}
                disabled={isSaving}
                size="sm"
              >
                {isSaving ? 'Lagrer...' : 'Lagre endringer'}
              </Button>
            </div>
          )}
        </Card>
      </div>
    </>
  );
};

export default StudentProfilePage;
