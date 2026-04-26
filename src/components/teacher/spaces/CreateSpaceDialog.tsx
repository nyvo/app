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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createSpace, type CreateSpaceResult } from '@/services/spaces';
import type { Organization } from '@/types/database';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Org IDs eligible to act as admin of the new space (caller's owner/admin orgs). */
  ownerAdminOrganizationIds: string[];
  organizations: Organization[];
  /** Pre-select this org if eligible. */
  defaultOrgId?: string;
  onCreated: (result: CreateSpaceResult) => void;
}

const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9]|-(?!-))*[a-z0-9]$/;
const MAX_NAME = 120;
const MAX_DESCRIPTION = 500;

function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ø/g, 'o')
    .replace(/[æå]/g, (c) => (c === 'æ' ? 'ae' : 'a'))
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export function CreateSpaceDialog({
  open,
  onOpenChange,
  ownerAdminOrganizationIds,
  organizations,
  defaultOrgId,
  onCreated,
}: Props) {
  const eligibleOrgs = useMemo(
    () => organizations.filter((o) => ownerAdminOrganizationIds.includes(o.id)),
    [organizations, ownerAdminOrganizationIds],
  );

  const initialOrgId =
    eligibleOrgs.find((o) => o.id === defaultOrgId)?.id ?? eligibleOrgs[0]?.id ?? '';

  const [orgId, setOrgId] = useState(initialOrgId);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Reset state when dialog opens.
  useEffect(() => {
    if (open) {
      setOrgId(initialOrgId);
      setName('');
      setCity('');
      setDescription('');
      setSubmitting(false);
      setErrorMsg(null);
    }
  }, [open, initialOrgId]);

  // Slug is auto-derived from name and never shown in the UI — non-technical
  // users don't need to think about URLs. Collisions surface as a 409 mapped
  // to a "name already taken" message that prompts them to pick a new name.
  const slug = nameToSlug(name);
  const slugValid = slug.length >= 3 && slug.length <= 60 && SLUG_REGEX.test(slug);
  const nameValid = name.trim().length > 0 && name.trim().length <= MAX_NAME;
  const canSubmit = nameValid && slugValid && orgId.length > 0 && !submitting;

  // When name is filled but produces an invalid slug (too short after stripping
  // non-alphanumerics, or all special chars), surface a hint under the Name field.
  const nameHint =
    nameValid && !slugValid
      ? 'Navnet må inneholde minst 3 bokstaver eller tall.'
      : null;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setErrorMsg(null);

    const { data, error, status } = await createSpace({
      organizationId: orgId,
      name: name.trim(),
      slug,
      city: city.trim() || null,
      description: description.trim() || null,
    });
    setSubmitting(false);

    if (error || !data) {
      let msg: string;
      switch (status) {
        case 409:
          msg = 'Et studio med dette navnet finnes allerede. Prøv et annet navn.';
          break;
        case 400:
          // 400 covers slug format, name length, missing fields. Pass through
          // the server message when it's specific; otherwise generic guidance.
          msg = error?.message || 'Sjekk at navnet er fylt ut riktig.';
          break;
        case 403:
          msg = 'Du må være eier eller administrator av studioet.';
          break;
        case 500:
        case 502:
        case 503:
          msg = 'Noe gikk galt. Prøv igjen om litt.';
          break;
        default:
          msg = error?.message || 'Kunne ikke opprette studio';
      }
      setErrorMsg(msg);
      return;
    }
    toast.success(`${data.space.name} er opprettet`);
    onCreated(data);
  };

  const showOrgPicker = eligibleOrgs.length > 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lag nytt studio</DialogTitle>
          <DialogDescription>
            Et studio samler kursene fra flere instruktører på én felles offentlig side. Du blir
            administrator og får en kode du kan dele med andre instruktører.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
          className="flex flex-col gap-4 py-2"
        >
          {showOrgPicker && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="cs-org" className="text-xs font-medium text-foreground">
                Studio som administrator
              </label>
              <Select value={orgId} onValueChange={setOrgId}>
                <SelectTrigger id="cs-org">
                  <SelectValue placeholder="Velg studio" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleOrgs.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="cs-name" className="text-xs font-medium text-foreground">
              Navn
            </label>
            <Input
              id="cs-name"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, MAX_NAME))}
              aria-invalid={Boolean(nameHint) || undefined}
              aria-describedby={nameHint ? 'cs-name-hint' : undefined}
              required
            />
            {nameHint && (
              <p id="cs-name-hint" role="alert" className="text-xs text-destructive font-medium">
                {nameHint}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="cs-city" className="text-xs font-medium text-foreground">
              By (valgfri)
            </label>
            <Input
              id="cs-city"
              value={city}
              onChange={(e) => setCity(e.target.value.slice(0, 120))}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="cs-description" className="text-xs font-medium text-foreground">
              Beskrivelse (valgfri)
            </label>
            <Textarea
              id="cs-description"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESCRIPTION))}
              rows={3}
            />
          </div>

          {errorMsg && (
            <p id="cs-form-error" role="alert" className="text-xs text-destructive font-medium">{errorMsg}</p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline-soft"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Avbryt
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {submitting ? 'Oppretter …' : 'Opprett studio'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
