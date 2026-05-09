import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ImageUpload } from '@/components/ui/image-upload';
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_SIZE } from '@/services/storage';
import { supabase } from '@/lib/supabase';
import { updateTeam } from '@/services/teams';
import type { Team } from '@/types/database';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: Team | null;
  /** Called after a successful save so the parent can refetch. */
  onSaved: () => void;
}

const COURSE_IMAGES_BUCKET = 'course-images';
const MAX_NAME = 120;
const MAX_DESCRIPTION = 500;

export function EditTeamDialog({ open, onOpenChange, team, onSaved }: Props) {
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [pendingCoverFile, setPendingCoverFile] = useState<File | null>(null);
  const [coverRemoved, setCoverRemoved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Reset form whenever the dialog opens with a (possibly new) team.
  useEffect(() => {
    if (open && team) {
      setName(team.name);
      setCity(team.city ?? '');
      setDescription(team.description ?? '');
      setCoverUrl(team.cover_image_url);
      setPendingCoverFile(null);
      setCoverRemoved(false);
      setSaving(false);
      setErrorMsg(null);
    }
  }, [open, team]);

  const isDirty = useMemo(() => {
    if (!team) return false;
    return (
      name !== team.name ||
      city !== (team.city ?? '') ||
      description !== (team.description ?? '') ||
      pendingCoverFile !== null ||
      coverRemoved
    );
  }, [team, name, city, description, pendingCoverFile, coverRemoved]);

  const canSave = isDirty && name.trim().length > 0 && !saving;

  /** Upload pending file to course-images/teams/<teamId>/<ts>.<ext>. */
  const uploadPendingCover = async (teamId: string): Promise<string> => {
    if (!pendingCoverFile) throw new Error('Ingen fil å laste opp');
    if (!ACCEPTED_IMAGE_TYPES.includes(pendingCoverFile.type)) {
      throw new Error('Ugyldig filtype. Bruk JPG, PNG eller WebP.');
    }
    if (pendingCoverFile.size > MAX_IMAGE_SIZE) {
      throw new Error('Bildet er for stort. Maks 5 MB');
    }
    const ext = pendingCoverFile.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `teams/${teamId}/${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from(COURSE_IMAGES_BUCKET)
      .upload(path, pendingCoverFile, { cacheControl: '3600', upsert: false });
    if (uploadErr) throw new Error(uploadErr.message);
    const { data } = supabase.storage.from(COURSE_IMAGES_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSave = async () => {
    if (!team || !canSave) return;
    setSaving(true);
    setErrorMsg(null);

    let nextCoverUrl: string | null = coverUrl;
    if (pendingCoverFile) {
      try {
        nextCoverUrl = await uploadPendingCover(team.id);
      } catch (err) {
        setSaving(false);
        const msg = err instanceof Error ? err.message : 'Kunne ikke laste opp bildet';
        setErrorMsg(msg);
        return;
      }
    } else if (coverRemoved) {
      nextCoverUrl = null;
    }

    const { error } = await updateTeam(team.id, {
      name: name.trim(),
      city: city.trim() || null,
      description: description.trim() || null,
      cover_image_url: nextCoverUrl,
    });
    setSaving(false);

    if (error) {
      setErrorMsg('Kunne ikke lagre endringene');
      return;
    }
    toast.success('Endringer lagret');
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rediger studio</DialogTitle>
          <DialogDescription>
            Endre navn, by, beskrivelse eller forsidebilde. URL-en er fast og kan ikke endres.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSave();
          }}
          className="flex flex-col gap-4 py-2"
        >
          {/* Cover image */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground">Forsidebilde</label>
            <ImageUpload
              value={coverRemoved ? null : coverUrl}
              onChange={(file) => {
                setPendingCoverFile(file);
                setCoverRemoved(false);
              }}
              onRemove={() => {
                setPendingCoverFile(null);
                setCoverUrl(null);
                setCoverRemoved(true);
              }}
            />
          </div>

          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="es-name" className="text-xs font-medium text-foreground">
              Navn
            </label>
            <Input
              id="es-name"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, MAX_NAME))}
              required
            />
          </div>

          {/* Slug — read only */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="es-slug" className="text-xs font-medium text-foreground">URL</label>
            <div className="flex min-w-0 items-center gap-1 text-sm">
              <span className="shrink-0 text-foreground-muted">framio.no/</span>
              <Input id="es-slug" value={team?.slug ?? ''} className="min-w-0" disabled readOnly />
            </div>
          </div>

          {/* City */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="es-city" className="text-xs font-medium text-foreground">
              By
            </label>
            <Input
              id="es-city"
              value={city}
              onChange={(e) => setCity(e.target.value.slice(0, 120))}
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="es-description" className="text-xs font-medium text-foreground">
              Beskrivelse
            </label>
            <Textarea
              id="es-description"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESCRIPTION))}
              rows={3}
            />
            <p className="text-xs text-foreground-muted">
              {MAX_DESCRIPTION - description.length} tegn igjen
            </p>
          </div>

          {errorMsg && <p role="alert" className="text-xs text-danger font-medium">{errorMsg}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline-soft"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Avbryt
            </Button>
            <Button type="submit" disabled={!canSave}>
              {saving ? 'Lagrer …' : 'Lagre endringer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
