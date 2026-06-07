import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { X, Check, MapPin, ChevronRight } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { badgeVariants } from '@/components/ui/badge';
import { FieldError } from '@/components/ui/field-error';
import { Input } from '@/components/ui/input';
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
} from '@/services/locations';
import { runWithUndo } from '@/lib/undo';
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
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set());

  if (!currentSeller?.id) return null;

  const openCreate = () => {
    setEditing(null);
    setDrawerOpen(true);
  };

  const openEdit = (loc: TeacherLocation) => {
    setEditing(loc);
    setDrawerOpen(true);
  };

  const handleDelete = (loc: TeacherLocation) => {
    runWithUndo({
      message: 'Stedet er slettet',
      hide: () => setHiddenIds((prev) => new Set(prev).add(loc.id)),
      restore: () =>
        setHiddenIds((prev) => {
          const next = new Set(prev);
          next.delete(loc.id);
          return next;
        }),
      commit: async () => {
        const { error } = await deleteLocation(loc.id);
        if (!error) await refetch();
        return { error };
      },
      errorOf: (r) => r.error,
      errorMessage: 'Kunne ikke slette stedet',
    });
  };

  const visibleLocations = locations.filter((l) => !hiddenIds.has(l.id));

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Adresser</h2>
          <p className="mt-1 text-base text-foreground-muted">
            Steder du bruker ofte, så du kan velge dem raskt når du oppretter kurs.
          </p>
        </div>
        <div className="shrink-0">
          <Button
            variant="secondary"
            onClick={openCreate}
          >
            Legg til sted
          </Button>
        </div>
      </div>

      {visibleLocations.length > 0 && (
        <div className="overflow-hidden rounded-md border border-border bg-surface">
          <ul className="divide-y divide-border">
            {visibleLocations.map((loc) => (
              <LocationRow key={loc.id} location={loc} onEdit={() => openEdit(loc)} />
            ))}
          </ul>
        </div>
      )}

      <LocationDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        sellerId={currentSeller.id}
        location={editing}
        onSaved={refetch}
        onDelete={handleDelete}
      />
    </section>
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
    <li>
      <button
        type="button"
        onClick={onEdit}
        className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left outline-none transition-shadow ring-1 ring-transparent hover:ring-border focus-visible:ring-2 focus-visible:ring-ring/50"
        aria-label={`Rediger ${location.name}`}
      >
        <div className="min-w-0 flex-1">
          <span className="block truncate text-base font-medium text-foreground">{location.name}</span>
          {location.address && (
            <p className="mt-0.5 flex items-center gap-1.5 truncate text-base text-foreground-muted">
              <MapPin className="size-3.5 shrink-0" />
              <span className="truncate">{location.address}</span>
            </p>
          )}
        </div>
        <ChevronRight className="size-4 shrink-0 text-foreground-muted" />
      </button>
    </li>
  );
}

function LocationDrawer({
  open,
  onOpenChange,
  sellerId,
  location,
  onSaved,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sellerId: string;
  location: TeacherLocation | null;
  onSaved: () => void;
  onDelete: (loc: TeacherLocation) => void;
}) {
  const isEdit = location !== null;
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [rooms, setRooms] = useState<string[]>([]);
  const [newRoom, setNewRoom] = useState('');
  const [roomFocused, setRoomFocused] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (open) {
      setName(location?.name ?? '');
      setAddress(location?.address ?? '');
      setRooms(location?.rooms ?? []);
      setNewRoom('');
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
    } else {
      const { error } = await createLocation({
        seller_id: sellerId,
        ...payload,
      });
      if (error) {
        toast.error('Kunne ikke opprette stedet');
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    onSaved();
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (!location) return;
    onOpenChange(false);
    onDelete(location);
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
              aria-invalid={!!nameError || undefined}
              aria-describedby={nameError ? 'loc-drawer-name-error' : undefined}
              autoFocus
            />
            {nameError && (
              <FieldError id="loc-drawer-name-error" className="mt-0">{nameError}</FieldError>
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
            />
          </div>

          <div className="grid gap-2">
            <span className="text-base font-medium text-foreground">Rom</span>
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
            <div className="relative">
              <Input
                value={newRoom}
                onChange={(e) => setNewRoom(e.target.value)}
                onFocus={() => setRoomFocused(true)}
                onBlur={() => setRoomFocused(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addRoom();
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    setNewRoom('');
                  }
                }}
                className={cn((roomFocused || newRoom) && 'pr-16')}
              />
              {(roomFocused || newRoom) && (
                <div className="absolute inset-y-1 right-1 flex items-center gap-1">
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setNewRoom('')}
                    aria-label="Avbryt"
                    className="flex h-7 w-7 items-center justify-center rounded text-foreground-muted transition-colors hover:bg-muted hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    <X className="size-4" />
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={addRoom}
                    disabled={!newRoom.trim()}
                    aria-label="Legg til rom"
                    className="flex h-7 w-7 items-center justify-center rounded bg-foreground text-background transition-colors hover:bg-foreground/90 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-40 disabled:hover:bg-foreground"
                  >
                    <Check className="size-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border px-6 py-4">
          {isEdit ? (
            <Button
              variant="ghost"
              className="text-foreground-muted hover:text-foreground"
              onClick={handleDelete}
            >
              Slett sted
            </Button>
          ) : (
            <span />
          )}
          <Button onClick={handleSave} loading={saving} loadingText="Lagrer">
            {isEdit ? 'Lagre' : 'Lagre sted'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
