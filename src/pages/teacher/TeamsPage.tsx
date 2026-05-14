import { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { pageVariants, pageTransition } from '@/lib/motion';
import { Button } from '@/components/ui/button';
import { ExternalLink } from '@/lib/icons';
import { ImageUpload } from '@/components/ui/image-upload';
import { MobileTeacherHeader } from '@/components/teacher/MobileTeacherHeader';
import { LocationsSection } from '@/components/teacher/studio/LocationsSection';
import { AffiliationsSection } from '@/components/teacher/studio/AffiliationsSection';
import { useAuth } from '@/contexts/AuthContext';
import { updateTeam } from '@/services/teams';
import { supabase } from '@/lib/supabase';
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_SIZE } from '@/services/storage';
import type { Team } from '@/types/database';

// ---------------------------------------------------------------------------
// "Min studio" — the seller's public storefront page (their team) plus the
// supporting concerns: affiliations (other instructors syndicated here) and
// locations (where they teach). Each seller has exactly ONE team auto-created
// on signup. All editing is inline — no modals.
// ---------------------------------------------------------------------------

const TeamsPage = () => {
  const { currentTeam, currentSeller, refreshSellers } = useAuth();
  const isBusiness = currentSeller?.seller_type === 'business';

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
        className="mx-auto w-full max-w-3xl px-6 pb-24 md:pb-8 lg:px-8"
      >
        <div className="mb-8 pt-6 lg:pt-12 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Studio</h1>
          {publicUrl && (
            <Button asChild size="sm" className="shrink-0">
              <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink data-icon="inline-start" />
                Vis min side
              </a>
            </Button>
          )}
        </div>

        {currentTeam ? (
          <div>
            {/* Studiosiden — inline-editable storefront. */}
            <section
              aria-labelledby="studiosiden-heading"
              className="space-y-6"
            >
              <div>
                <h2 id="studiosiden-heading" className="text-base font-semibold text-foreground">
                  Studiosiden
                </h2>
                <p className="mt-1 text-sm text-foreground-muted">
                  Slik ser kundene siden din.
                </p>
              </div>

              <div>
                <StudioSidenForm team={currentTeam} onSaved={refreshSellers} />
              </div>
            </section>

            {/* Adresser — physical addresses, still customer-relevant. */}
            <section
              aria-labelledby="adresser-heading"
              className="mt-10 pt-10 border-t border-border"
            >
              <LocationsSection />
            </section>

            {/* Team — members of the studio (business) or studio you belong to (individual). */}
            <section
              aria-labelledby="team-heading"
              className="space-y-6 mt-10 pt-10 border-t border-border"
            >
              <div>
                <h2 id="team-heading" className="text-base font-semibold text-foreground">
                  Team
                </h2>
                <p className="mt-1 text-sm text-foreground-muted">
                  {isBusiness
                    ? 'Inviter andre instruktører til å la kursene sine vises på studio-siden din.'
                    : 'Studioet du er medlem av. Alle kursene dine vises automatisk.'}
                </p>
              </div>
              <div>
                <AffiliationsSection />
              </div>
            </section>
          </div>
        ) : (
          <p className="text-sm text-foreground-muted">
            Ingen studio funnet. Logg ut og inn igjen, eller kontakt
            support hvis problemet vedvarer.
          </p>
        )}
      </motion.div>
    </main>
  );
};

const COURSE_IMAGES_BUCKET = 'course-images';

function StudioSidenForm({ team, onSaved }: { team: Team; onSaved: () => Promise<void> | void }) {
  const [savingCover, setSavingCover] = useState(false);

  const uploadCover = async (file: File): Promise<string> => {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      throw new Error('Ugyldig filtype. Bruk JPG, PNG eller WebP.');
    }
    if (file.size > MAX_IMAGE_SIZE) {
      throw new Error('Bildet er for stort. Maks 5 MB');
    }
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `teams/${team.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from(COURSE_IMAGES_BUCKET)
      .upload(path, file, { cacheControl: '3600', upsert: false });
    if (error) throw new Error(error.message);
    const { data } = supabase.storage.from(COURSE_IMAGES_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  };

  const handleCoverChange = async (file: File | null) => {
    if (!file) return;
    setSavingCover(true);
    try {
      const url = await uploadCover(file);
      const { error } = await updateTeam(team.id, { cover_image_url: url });
      if (error) throw error;
      await onSaved();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Kunne ikke laste opp bildet';
      toast.error(msg);
    } finally {
      setSavingCover(false);
    }
  };

  const handleCoverRemove = async () => {
    setSavingCover(true);
    const { error } = await updateTeam(team.id, { cover_image_url: null });
    setSavingCover(false);
    if (error) {
      toast.error('Kunne ikke fjerne bildet');
      return;
    }
    await onSaved();
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        <label className="text-sm font-medium text-foreground">Forsidebilde</label>
        <ImageUpload
          value={team.cover_image_url}
          onChange={handleCoverChange}
          onRemove={handleCoverRemove}
          disabled={savingCover}
        />
      </div>

      <div className="grid gap-2">
        <span className="text-sm font-medium text-foreground">URL</span>
        <div className="flex h-9 items-center rounded-md border border-border bg-surface text-sm">
          <span className="pl-3 text-foreground-muted">framio.no</span>
          <span className="px-1 text-foreground-muted">/</span>
          <span className="flex-1 min-w-0 truncate pr-3 text-foreground">{team.slug}</span>
        </div>
      </div>
    </div>
  );
}

export default TeamsPage;
