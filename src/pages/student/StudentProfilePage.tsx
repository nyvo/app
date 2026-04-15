import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { User, Mail, Phone, Calendar } from '@/lib/icons';
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
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Min profil
        </h1>
        <p className="text-sm text-muted-foreground">
          Oppdater kontaktinformasjonen din og se kontodetaljer.
        </p>
      </div>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-base font-medium text-foreground">Kontoinformasjon</h2>
          <p className="text-sm text-muted-foreground">
            Endringer her brukes når du melder deg på kurs og kommuniserer med instruktører.
          </p>
        </div>

        <Card className="overflow-hidden border-border bg-card">
          <div className="space-y-8 p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <User className="size-4" />
              </div>
              <div className="flex-1">
                <label htmlFor="student-name" className="text-xs font-medium mb-1.5 block text-foreground">
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

            <div className="flex items-start gap-4">
              <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Mail className="size-4" />
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium tracking-wide mb-1 block text-muted-foreground">
                  E-post
                </label>
                <p className="text-sm py-2 text-foreground">
                  {user?.email}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Phone className="size-4" />
              </div>
              <div className="flex-1">
                <label htmlFor="student-phone" className="text-xs font-medium mb-1.5 block text-foreground">
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

            <div className="flex items-start gap-4">
              <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Calendar className="size-4" />
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium tracking-wide mb-1 block text-muted-foreground">
                  Medlem siden
                </label>
                <p className="text-sm py-2 text-foreground">
                  {profile?.created_at
                    ? format(new Date(profile.created_at), 'd. MMMM yyyy', { locale: nb })
                    : 'Ukjent'}
                </p>
              </div>
            </div>
          </div>

          {isDirty && (
            <div className="flex justify-end border-t border-border bg-muted/50 px-6 py-4 sm:px-8">
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
      </section>
    </div>
  );
};

export default StudentProfilePage;
