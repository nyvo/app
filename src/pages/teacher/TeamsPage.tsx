import { useState } from 'react';
import { motion } from 'framer-motion';
import { Pencil, MapPin, ExternalLink } from '@/lib/icons';
import { pageVariants, pageTransition } from '@/lib/motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MobileTeacherHeader } from '@/components/teacher/MobileTeacherHeader';
import { EditTeamDialog } from '@/components/teacher/teams/EditTeamDialog';
import { LocationsSection } from '@/components/teacher/studio/LocationsSection';
import { AffiliationsSection } from '@/components/teacher/studio/AffiliationsSection';
import { useAuth } from '@/contexts/AuthContext';

// ---------------------------------------------------------------------------
// "Min studio" — the seller's public storefront page (their team) plus the
// supporting concerns: affiliations (other instructors syndicated here) and
// locations (where they teach). Each seller has exactly ONE team owned by
// them, auto-created on signup. Editing it = editing the public-facing
// storefront (name, description, cover, slug, city).
//
// The previous shared-studio admin/tenant flow (invite codes,
// AdminTeamCard / TenantTeamCard / JoinWithCodeForm / CreateTeamDialog) is
// retired in favour of the team_affiliations model — see AffiliationsSection.
// ---------------------------------------------------------------------------

const TeamsPage = () => {
  const { currentTeam, refreshSellers } = useAuth();
  const [editOpen, setEditOpen] = useState(false);

  const publicUrl = currentTeam?.slug
    ? `${window.location.origin}/${currentTeam.slug}`
    : null;

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
          <p className="mt-1 text-sm text-foreground-muted">
            Slik vises siden din til kursdeltakere. Her samler du også samarbeid
            og adresser.
          </p>
        </div>

        {currentTeam ? (
          <div className="max-w-3xl space-y-12">
            {/* Studio info card */}
            <section aria-labelledby="studio-info-heading" className="space-y-3">
              <h2 id="studio-info-heading" className="text-xl font-semibold text-foreground">
                Min studio
              </h2>

              <Card className="gap-0 p-0">
                {currentTeam.cover_image_url && (
                  <div className="aspect-[3/1] w-full overflow-hidden rounded-t-lg bg-muted">
                    <img
                      src={currentTeam.cover_image_url}
                      alt=""
                      className="size-full object-cover"
                    />
                  </div>
                )}
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-xl font-semibold text-foreground truncate">
                        {currentTeam.name}
                      </h3>
                      <p className="mt-0.5 text-xs text-foreground-muted tabular-nums truncate">
                        framio.no/{currentTeam.slug}
                      </p>
                      {currentTeam.city && (
                        <p className="mt-1 inline-flex items-center gap-1 text-xs text-foreground-muted">
                          <MapPin className="size-3" />
                          {currentTeam.city}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="outline-soft"
                      size="sm"
                      onClick={() => setEditOpen(true)}
                    >
                      <Pencil className="size-3.5" />
                      Rediger
                    </Button>
                  </div>

                  {currentTeam.description && (
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                      {currentTeam.description}
                    </p>
                  )}

                  {publicUrl && (
                    <div className="border-t border-border pt-3">
                      <a
                        href={publicUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-foreground-muted hover:text-foreground transition-colors"
                      >
                        <ExternalLink className="size-3" />
                        Vis offentlig side
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>

            {/* Affiliations */}
            <div className="border-t border-border pt-8">
              <AffiliationsSection />
            </div>

            {/* Locations */}
            <div className="border-t border-border pt-8">
              <LocationsSection />
            </div>
          </div>
        ) : (
          <Card>
            <CardContent>
              <p className="text-sm text-foreground-muted">
                Ingen studio funnet. Logg ut og inn igjen, eller kontakt
                support hvis problemet vedvarer.
              </p>
            </CardContent>
          </Card>
        )}
      </motion.div>

      <EditTeamDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        team={currentTeam}
        onSaved={() => {
          setEditOpen(false);
          // Refresh sellers/teams in AuthContext so the card reflects the
          // new values without a manual page reload.
          void refreshSellers();
        }}
      />
    </main>
  );
};

export default TeamsPage;
