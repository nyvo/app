import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus } from '@/lib/icons';
import { pageVariants, pageTransition } from '@/lib/motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { MobileTeacherHeader } from '@/components/teacher/MobileTeacherHeader';
import { CreateSpaceDialog } from '@/components/teacher/spaces/CreateSpaceDialog';
import { JoinWithCodeForm } from '@/components/teacher/spaces/JoinWithCodeForm';
import { AdminSpaceCard } from '@/components/teacher/spaces/AdminSpaceCard';
import { TenantSpaceCard } from '@/components/teacher/spaces/TenantSpaceCard';
import { useAuth } from '@/contexts/AuthContext';
import { useMySpaces } from '@/hooks/use-my-spaces';

const SpacesPage = () => {
  const { organizations, currentOrganization } = useAuth();
  const { spaces, ownerAdminOrganizationIds, loading, error, refetch } = useMySpaces();
  const [createOpen, setCreateOpen] = useState(false);

  const canCreate = ownerAdminOrganizationIds.length > 0;

  return (
    <main className="flex-1 min-h-full overflow-y-auto bg-background">
      <MobileTeacherHeader title="Studio" />

      <motion.div
        variants={pageVariants}
        initial="initial"
        animate="animate"
        transition={pageTransition}
        className="px-6 pb-24 md:pb-8 lg:px-8"
      >
        <div className="mb-8 pt-6 lg:pt-8">
          <h1 className="text-3xl font-semibold text-foreground">Studio</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Et felles studio samler kurs fra flere instruktører på én side. Det er valgfritt —
            bruk det hvis du leier deg inn på et yogastudio eller samarbeider med andre instruktører.
          </p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-24" role="status" aria-label="Laster">
            <Spinner size="lg" />
          </div>
        )}

        {!loading && error && (
          <Card>
            <CardContent>
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {!loading && !error && (
          <div className="max-w-3xl space-y-6">
            {/* Empty state — two parallel action cards. Avoids any "you're
                missing something" framing; just shows what the user CAN do. */}
            {spaces.length === 0 && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <h2 className="text-base font-semibold text-foreground">Lag et nytt studio</h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Bli administrator og få en kode du kan dele med andre instruktører.
                    </p>
                  </CardHeader>
                  <CardContent>
                    {canCreate ? (
                      <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
                        <Plus className="size-4" />
                        Lag studio
                      </Button>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Du må være eier eller administrator av et studio for å lage et felles studio.
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <h2 className="text-base font-semibold text-foreground">Skriv inn invitasjonskode</h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Har du fått en kode fra et studio? Skriv den inn her.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <JoinWithCodeForm
                      ownerAdminOrganizationIds={ownerAdminOrganizationIds}
                      organizations={organizations}
                      defaultOrgId={currentOrganization?.id}
                      onJoined={refetch}
                    />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Has spaces — list them */}
            {spaces.length > 0 && (
              <>
                {spaces.map((s) =>
                  s.myRole === 'admin' ? (
                    <AdminSpaceCard key={s.id} space={s} onChanged={refetch} />
                  ) : (
                    <TenantSpaceCard key={s.id} space={s} onChanged={refetch} />
                  ),
                )}

                {/* Allow joining an additional space (rare for MVP, but free to support) */}
                <Card size="sm">
                  <CardHeader>
                    <h2 className="text-base font-semibold text-foreground">Bli med i ett til</h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Har du fått en kode fra et annet studio? Skriv den inn her.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <JoinWithCodeForm
                      ownerAdminOrganizationIds={ownerAdminOrganizationIds}
                      organizations={organizations}
                      defaultOrgId={currentOrganization?.id}
                      onJoined={refetch}
                    />
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}
      </motion.div>

      <CreateSpaceDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        ownerAdminOrganizationIds={ownerAdminOrganizationIds}
        organizations={organizations}
        defaultOrgId={currentOrganization?.id}
        onCreated={() => {
          setCreateOpen(false);
          void refetch();
        }}
      />
    </main>
  );
};

export default SpacesPage;
