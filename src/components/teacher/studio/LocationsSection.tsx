import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, X } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { Badge, badgeVariants } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmDialog, ConfirmScopeItem } from '@/components/ui/confirm-dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import { useLocations } from '@/hooks/use-locations';
import {
  createLocation,
  updateLocation,
  deleteLocation,
  setFavoriteLocation,
} from '@/services/locations';
import { cn } from '@/lib/utils';
import type { TeacherLocation } from '@/types/database';

// ---------------------------------------------------------------------------
// Locations as a small, optional sub-section of the Studio page. Row list;
// Rediger / Legg til sted both open the same drawer for create + edit.
// ---------------------------------------------------------------------------

export function LocationsSection() {
  const { currentSeller } = useAuth();
  const { locations, refetch } = useLocations(currentSeller?.id);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<TeacherLocation | null>(null);

  if (!currentSeller?.id) return null;

  const openCreate = () => {
    setEditing(null);
    setDrawerOpen(true);
  };

  const openEdit = (loc: TeacherLocation) => {
    setEditing(loc);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="adresser-heading" className="text-base font-semibold text-foreground">
            Adresser
          </h2>
          <p className="mt-1 text-sm text-foreground-muted">
            Steder du bruker ofte, så du kan velge dem raskt når du oppretter kurs.
          </p>
        </div>
        <Button
          variant="secondary"
          size="icon-sm"
          onClick={openCreate}
          aria-label="Legg til sted"
          className="shrink-0"
        >
          <Plus />
        </Button>
      </div>

      {locations.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-8 text-center">
          <p className="text-sm font-medium text-foreground mb-4">Du har ikke lagt til noen steder enda</p>
          <Button
            variant="outline-soft"
            size="icon-sm"
            onClick={openCreate}
            aria-label="Legg til sted"
            className="mx-auto"
          >
            <Plus />
          </Button>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {locations.map((loc) => (
            <LocationRow key={loc.id} location={loc} onEdit={() => openEdit(loc)} />
          ))}
        </ul>
      )}

      <LocationDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        sellerId={currentSeller.id}
        location={editing}
        onSaved={refetch}
      />
    </div>
  );
}

function LocationRow({
  location,
  onEdit,
}: {
  location: TeacherLocation;
  onEdit: () => void;
}) {
  return (
    <li className="py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground truncate">{location.name}</span>
            {location.is_favorite && (
              <Badge variant="neutral" size="sm">Standard</Badge>
            )}
          </div>
          {location.address && (
            <p className="mt-0.5 text-sm text-foreground-muted truncate">{location.address}</p>
          )}
        </div>
        <Button variant="outline-soft" size="sm" className="shrink-0" onClick={onEdit}>
          Rediger
        </Button>
      </div>
    </li>
  );
}

function LocationDrawer({
  open,
  onOpenChange,
  sellerId,
  location,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sellerId: string;
  location: TeacherLocation | null;
  onSaved: () => void;
}) {
  const isEdit = location !== null;
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [rooms, setRooms] = useState<string[]>([]);
  const [newRoom, setNewRoom] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [nameError, setNameError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (open) {
      setName(location?.name ?? '');
      setAddress(location?.address ?? '');
      setRooms(location?.rooms ?? []);
      setNewRoom('');
      setIsFavorite(location?.is_favorite ?? false);
      setNameError(undefined);
    }
  }, [open, location]);

  const addRoom = () => {
    const trimmed = newRoom.trim();
    if (!trimmed || rooms.includes(trimmed)) {
      setNewRoom('');
      return;
    }
    setRooms((prev) => [...prev, trimmed]);
    setNewRoom('');
  };

  const removeRoom = (room: string) => {
    setRooms((prev) => prev.filter((r) => r !== room));
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError('Skriv inn et navn');
      return;
    }

    setSaving(true);
    const payload = {
      name: trimmedName,
      address: address.trim() || null,
      rooms,
    };

    if (isEdit && location) {
      const { error } = await updateLocation(location.id, payload);
      if (error) {
        toast.error('Kunne ikke lagre stedet');
        setSaving(false);
        return;
      }
      if (isFavorite !== location.is_favorite) {
        await setFavoriteLocation(sellerId, isFavorite ? location.id : null);
      }
    } else {
      const { data, error } = await createLocation({
        seller_id: sellerId,
        ...payload,
      });
      if (error || !data) {
        toast.error('Kunne ikke opprette stedet');
        setSaving(false);
        return;
      }
      if (isFavorite) {
        await setFavoriteLocation(sellerId, data.id);
      }
    }

    setSaving(false);
    onSaved();
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!location) return;
    setDeleting(true);
    const { error } = await deleteLocation(location.id);
    setDeleting(false);
    setConfirmDelete(false);
    if (error) {
      toast.error('Kunne ikke slette stedet');
      return;
    }
    toast.success('Stedet er slettet');
    onSaved();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Rediger sted' : 'Legg til sted'}</SheetTitle>
          <SheetDescription>
            Lagre adresser og rom du bruker ofte.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="grid gap-2">
            <label
              htmlFor="loc-drawer-name"
              data-error={!!nameError || undefined}
              className="text-sm font-medium text-foreground data-[error=true]:text-danger"
            >
              Navn
            </label>
            <Input
              id="loc-drawer-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) setNameError(undefined);
              }}
              placeholder="Hovedstudio"
              aria-invalid={!!nameError || undefined}
              aria-describedby={nameError ? 'loc-drawer-name-error' : undefined}
              autoFocus
            />
            {nameError && (
              <p id="loc-drawer-name-error" role="alert" className="text-sm text-danger">{nameError}</p>
            )}
          </div>

          <div className="grid gap-2">
            <label htmlFor="loc-drawer-addr" className="text-sm font-medium text-foreground">
              Adresse
            </label>
            <Input
              id="loc-drawer-addr"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Storgata 1, 0123 Oslo"
            />
          </div>

          <div className="grid gap-2">
            <span className="text-sm font-medium text-foreground">Rom</span>
            {rooms.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {rooms.map((room) => (
                  <span
                    key={room}
                    className={cn(
                      badgeVariants({ variant: 'secondary', shape: 'rect', size: 'md' }),
                      'h-7 pl-2 pr-1 gap-1',
                    )}
                  >
                    {room}
                    <button
                      type="button"
                      onClick={() => removeRoom(room)}
                      className="flex size-5 items-center justify-center rounded text-foreground-muted transition-colors hover:bg-background hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                      aria-label={`Fjern ${room}`}
                    >
                      <X className="size-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Input
                value={newRoom}
                onChange={(e) => setNewRoom(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addRoom();
                  }
                }}
                placeholder="Sal 1"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline-soft"
                size="sm"
                onClick={addRoom}
                disabled={!newRoom.trim()}
              >
                Legg til
              </Button>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={isFavorite}
              onCheckedChange={(c) => setIsFavorite(!!c)}
            />
            <span className="text-sm text-foreground">Bruk som standard når jeg oppretter kurs</span>
          </label>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border px-6 py-4">
          {isEdit ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-danger hover:text-danger hover:bg-danger-subtle"
              onClick={() => setConfirmDelete(true)}
            >
              Slett sted
            </Button>
          ) : (
            <span />
          )}
          <Button size="sm" onClick={handleSave} loading={saving} loadingText="Lagrer">
            {isEdit ? 'Lagre' : 'Lagre sted'}
          </Button>
        </div>

        {isEdit && location && (
          <ConfirmDialog
            open={confirmDelete}
            onOpenChange={setConfirmDelete}
            ariaLabel="Slett sted"
            headline="Stedet slettes. Det kan ikke angres."
            scope={
              <ConfirmScopeItem
                name={location.name}
                meta={location.address || (location.rooms.length > 0 ? `${location.rooms.length} rom` : 'Ingen adresse')}
              />
            }
            actionLabel="Slett sted"
            onConfirm={handleDelete}
            loading={deleting}
            loadingText="Sletter"
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
