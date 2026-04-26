import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { joinSpaceWithCode } from '@/services/spaces';
import type { Organization } from '@/types/database';

interface Props {
  ownerAdminOrganizationIds: string[];
  organizations: Organization[];
  defaultOrgId?: string;
  /** Called after a successful join (or no-op if already member). */
  onJoined: () => void;
}

export function JoinWithCodeForm({
  ownerAdminOrganizationIds,
  organizations,
  defaultOrgId,
  onJoined,
}: Props) {
  const eligibleOrgs = useMemo(
    () => organizations.filter((o) => ownerAdminOrganizationIds.includes(o.id)),
    [organizations, ownerAdminOrganizationIds],
  );

  const initialOrgId =
    eligibleOrgs.find((o) => o.id === defaultOrgId)?.id ?? eligibleOrgs[0]?.id ?? '';

  const [orgId, setOrgId] = useState(initialOrgId);
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const showOrgPicker = eligibleOrgs.length > 1;
  const trimmedCode = code.trim().toUpperCase();
  const codeValid = trimmedCode.length >= 4 && trimmedCode.length <= 16;
  const canSubmit = codeValid && orgId.length > 0 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setErrorMsg(null);

    const { data, error, status } = await joinSpaceWithCode({
      organizationId: orgId,
      code: trimmedCode,
    });
    setSubmitting(false);

    if (error || !data) {
      // Map edge-function statuses to user-friendly Norwegian. Status 0 = network /
      // unknown error; surface the raw message as fallback.
      let msg: string;
      switch (status) {
        case 404:
          msg = 'Fant ikke noe studio med denne koden. Sjekk at koden er riktig.';
          break;
        case 400:
          msg = 'Koden er ugyldig. Sjekk at du har skrevet den riktig.';
          break;
        case 403:
          msg = 'Du må være eier eller administrator av et studio for å bli med.';
          break;
        case 500:
        case 502:
        case 503:
          msg = 'Noe gikk galt. Prøv igjen om litt.';
          break;
        default:
          msg = error?.message || 'Kunne ikke bli med';
      }
      setErrorMsg(msg);
      return;
    }

    if (data.already_member) {
      toast.info(`Du er allerede medlem av ${data.space.name}`);
    } else {
      toast.success(`Du er nå medlem av ${data.space.name}`);
    }
    setCode('');
    onJoined();
  };

  if (eligibleOrgs.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Du må være eier eller administrator av et studio for å bli med.
      </p>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit();
      }}
      className="flex flex-col gap-3"
    >
      {showOrgPicker && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="jc-org" className="text-xs font-medium text-foreground">
            Studio som blir medlem
          </label>
          <Select value={orgId} onValueChange={setOrgId}>
            <SelectTrigger id="jc-org">
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
        <label htmlFor="jc-code" className="text-xs font-medium text-foreground">
          Invitasjonskode
        </label>
        <div className="flex gap-2">
          <Input
            id="jc-code"
            value={code}
            onChange={(e) => setCode(e.target.value.slice(0, 16))}
            placeholder="X4P-7K9"
            className="uppercase"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={errorMsg ? true : undefined}
            aria-describedby={errorMsg ? 'jc-code-error' : undefined}
          />
          <Button type="submit" disabled={!canSubmit}>
            {submitting ? 'Sjekker …' : 'Bli med'}
          </Button>
        </div>
        {errorMsg && (
          <p id="jc-code-error" role="alert" className="text-xs text-destructive font-medium">{errorMsg}</p>
        )}
      </div>
    </form>
  );
}
