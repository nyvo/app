import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Building, Copy, ExternalLink, MapPin, MoreHorizontal, Pencil, Trash2, UserMinus } from '@/lib/icons';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  deleteSpace,
  fetchSpaceMembers,
  removeSpaceMember,
  type MySpace,
  type SpaceMemberRow,
} from '@/services/spaces';
import { logger } from '@/lib/logger';
import { EditSpaceDialog } from './EditSpaceDialog';

interface Props {
  space: MySpace;
  onChanged: () => Promise<void>;
}

const SOFT_REMOVAL_BODY =
  'Studioets kurs vil ikke lenger vises på fellessiden, men er fortsatt tilgjengelige via studioets egen side. Du kan invitere studioet tilbake senere ved å dele koden på nytt.';

export function AdminSpaceCard({ space, onChanged }: Props) {
  const [members, setMembers] = useState<SpaceMemberRow[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [pendingRemove, setPendingRemove] = useState<SpaceMemberRow | null>(null);
  const [removing, setRemoving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const reload = async () => {
    const { data, error } = await fetchSpaceMembers(space.id);
    if (error) {
      logger.error('Error fetching space members:', error);
      return;
    }
    setMembers(data);
  };

  useEffect(() => {
    let cancelled = false;
    setLoadingMembers(true);
    void fetchSpaceMembers(space.id).then(({ data, error }) => {
      if (cancelled) return;
      if (error) logger.error('Error fetching space members:', error);
      else setMembers(data);
      setLoadingMembers(false);
    });
    return () => {
      cancelled = true;
    };
  }, [space.id]);

  const handleCopyCode = async () => {
    if (!space.invite_code) return;
    try {
      await navigator.clipboard.writeText(space.invite_code);
      toast.success('Kode kopiert');
    } catch {
      toast.error('Kunne ikke kopiere');
    }
  };

  const handleRemove = async () => {
    if (!pendingRemove) return;
    setRemoving(true);
    const { error } = await removeSpaceMember(space.id, pendingRemove.organization_id);
    setRemoving(false);
    if (error) {
      toast.error('Kunne ikke fjerne studioet');
      return;
    }
    toast.success(`${pendingRemove.organization.name} er fjernet`);
    setPendingRemove(null);
    void reload();
    void onChanged();
  };

  const handleDeleteSpace = async () => {
    setDeleting(true);
    const { error } = await deleteSpace(space.id);
    setDeleting(false);
    if (error) {
      toast.error('Kunne ikke slette studioet');
      return;
    }
    toast.success(`${space.name} er slettet`);
    setConfirmDelete(false);
    void onChanged();
  };

  const tenants = members.filter((m) => m.role === 'tenant');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-chart-2/10 text-chart-2">
            <Building className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="truncate text-base font-semibold text-foreground">{space.name}</h2>
              <Badge variant="accent" shape="rect" size="sm" className="shrink-0">
                Administrator
              </Badge>
            </div>
            <Link
              to={`/space/${space.slug}`}
              className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              framio.no/space/{space.slug}
              <ExternalLink className="size-3" />
            </Link>
            {space.city && (
              <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="size-3.5" />
                {space.city}
              </p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Studio-handlinger">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditOpen(true)}>
                <Pencil className="size-4" />
                Rediger studio
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="size-4" />
                Slett studio
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        {/* Invite code */}
        {space.invite_code && (
          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-xs font-medium tracking-wide uppercase text-muted-foreground">
              Invitasjonskode
            </p>
            <div className="mt-1 flex items-center gap-3">
              <code className="text-lg font-semibold text-foreground tracking-wider">
                {space.invite_code}
              </code>
              <Button variant="outline-soft" size="sm" onClick={handleCopyCode} className="gap-1.5">
                <Copy className="size-3.5" />
                Kopier
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Del koden med instruktørene du vil ha med i studioet. De skriver den inn under
              «Studio» i sin egen Framio-konto for å bli med.
            </p>
          </div>
        )}

        {/* Members */}
        <div>
          <h3 className="text-base font-semibold text-foreground">
            Medlemmer ({members.length})
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Kursene fra disse studiene vises på fellessiden.
          </p>

          {loadingMembers ? (
            <div className="flex items-center justify-center py-6" role="status" aria-label="Laster">
              <Spinner size="sm" />
            </div>
          ) : members.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Ingen medlemmer ennå.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border-subtle">
              {members.map((m) => (
                <li
                  key={m.organization_id}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/studio/${m.organization.slug}`}
                      className="text-sm font-medium text-foreground hover:underline"
                    >
                      {m.organization.name}
                    </Link>
                    {m.organization.city && (
                      <p className="text-xs text-muted-foreground">{m.organization.city}</p>
                    )}
                  </div>
                  {m.role === 'admin' ? (
                    <Badge variant="accent" shape="rect" size="sm">
                      Admin
                    </Badge>
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label={`Handlinger for ${m.organization.name}`}>
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setPendingRemove(m)}>
                          <UserMinus className="size-4" />
                          Fjern fra studio
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </li>
              ))}
            </ul>
          )}
          {!loadingMembers && tenants.length === 0 && members.length > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              Del koden over for å invitere flere instruktører.
            </p>
          )}
        </div>
      </CardContent>

      <AlertDialog
        open={pendingRemove !== null}
        onOpenChange={(o) => !o && setPendingRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Fjern {pendingRemove?.organization.name} fra studioet?
            </AlertDialogTitle>
            <AlertDialogDescription>{SOFT_REMOVAL_BODY}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              variant="outline"
              disabled={removing}
              onClick={(e) => {
                e.preventDefault();
                void handleRemove();
              }}
            >
              {removing ? 'Fjerner …' : 'Fjern'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditSpaceDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        space={space}
        onSaved={() => void onChanged()}
      />

      <AlertDialog open={confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Slett {space.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Studioet og alle medlemskap fjernes permanent. Den offentlige
              siden blir utilgjengelig. Kursene til hvert medlem ligger fortsatt
              på deres egne studiosider — de slettes ikke.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                void handleDeleteSpace();
              }}
            >
              {deleting ? 'Sletter …' : 'Slett studio'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
