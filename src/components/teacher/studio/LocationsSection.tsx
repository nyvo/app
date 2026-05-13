import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { X } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { Badge, badgeVariants } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmDialog, ConfirmScopeItem } from '@/components/ui/confirm-dialog';
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
// Locations as a small, optional sub-section of the Studio page. Row list
// where each row inline-expands to reveal an edit form on Rediger. No modal,
// no card grid — sellers set this once and forget.
// ---------------------------------------------------------------------------

const DEFAULT_NEW_NAME = 'Nytt sted';

export function LocationsSection() {
  const { currentSeller } = useAuth();
  const { locations, refetch } = useLocations(currentSeller?.id);
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  if (!currentSeller?.id) return null;

  const handleAdd = async () => {
    if (creating) return;
    setCreating(true);
    const { data, error } = await createLocation({
      seller_id: currentSeller.id,
      name: DEFAULT_NEW_NAME,
      address: null,
      rooms: [],
    });
    setCreating(false);
    if (error || !data) {
      toast.error('Kunne ikke opprette stedet');
      return;
    }
    setOpenId(data.id);
    refetch();
  };

  return (
    <div>
      {locations.length === 0 ? (
        <p className="text-sm text-foreground-muted">
          Du har ikke lagt til noen steder ennå.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {locations.map((loc) => (
            <LocationRow
              key={loc.id}
              location={loc}
              isOpen={openId === loc.id}
              onToggle={() => setOpenId((id) => (id === loc.id ? null : loc.id))}
              onChanged={refetch}
              sellerId={currentSeller.id}
            />
          ))}
        </ul>
      )}

      <div className={locations.length > 0 ? 'pt-4' : 'pt-2'}>
        <Button
          variant="outline-soft"
          size="sm"
          onClick={handleAdd}
          loading={creating}
          loadingText="Oppretter"
        >
          Legg til sted
        </Button>
      </div>
    </div>
  );
}

function LocationRow({
  location,
  isOpen,
  onToggle,
  onChanged,
  sellerId,
}: {
  location: TeacherLocation;
  isOpen: boolean;
  onToggle: () => void;
  onChanged: () => void;
  sellerId: string;
}) {
  const [name, setName] = useState(location.name);
  const [address, setAddress] = useState(location.address ?? '');
  const [rooms, setRooms] = useState<string[]>(location.rooms);
  const [isFavorite, setIsFavorite] = useState(location.is_favorite);
  const [newRoom, setNewRoom] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const nameRef = useRef<HTMLInputElement | null>(null);

  // Re-sync when the underlying location changes or row opens/closes.
  useEffect(() => {
    setName(location.name);
    setAddress(location.address ?? '');
    setRooms(location.rooms);
    setIsFavorite(location.is_favorite);
    setNewRoom('');
  }, [location.id, location.name, location.address, location.rooms, location.is_favorite, isOpen]);

  useEffect(() => {
    if (isOpen && location.name === DEFAULT_NEW_NAME) {
      // Newly created — focus + select the name field.
      setTimeout(() => {
        nameRef.current?.focus();
        nameRef.current?.select();
      }, 50);
    }
  }, [isOpen, location.name]);

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
    const trimmedName = name.trim() || DEFAULT_NEW_NAME;
    setSaving(true);
    const { error } = await updateLocation(location.id, {
      name: trimmedName,
      address: address.trim() || null,
      rooms,
    });
    if (error) {
      toast.error('Kunne ikke lagre stedet');
      setSaving(false);
      return;
    }
    if (isFavorite !== location.is_favorite) {
      await setFavoriteLocation(sellerId, isFavorite ? location.id : null);
    }
    setSaving(false);
    onChanged();
    onToggle();
  };

  const handleDelete = async () => {
    setDeleting(true);
    const { error } = await deleteLocation(location.id);
    setDeleting(false);
    setConfirmDelete(false);
    if (error) {
      toast.error('Kunne ikke slette stedet');
      return;
    }
    toast.success('Stedet er slettet');
    onChanged();
  };

  return (
    <li className="py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground truncate">{location.name}</span>
            {location.is_favorite && (
              <Badge variant="neutral" size="xs" shape="rect">Standard</Badge>
            )}
          </div>
          {location.address && !isOpen && (
            <p className="mt-0.5 text-xs text-foreground-muted truncate">{location.address}</p>
          )}
        </div>
        <Button
          variant={isOpen ? 'ghost' : 'outline-soft'}
          size="sm"
          className="shrink-0"
          onClick={onToggle}
        >
          {isOpen ? 'Lukk' : 'Rediger'}
        </Button>
      </div>

      {isOpen && (
        <div className="mt-4 space-y-4 rounded-lg bg-muted p-4">
          <div className="grid gap-2">
            <label htmlFor={`loc-name-${location.id}`} className="text-sm font-medium text-foreground">
              Navn
            </label>
            <Input
              ref={nameRef}
              id={`loc-name-${location.id}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <label htmlFor={`loc-addr-${location.id}`} className="text-sm font-medium text-foreground">
              Adresse
            </label>
            <Input
              id={`loc-addr-${location.id}`}
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

          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-danger hover:text-danger hover:bg-danger-subtle"
              onClick={() => setConfirmDelete(true)}
            >
              Slett sted
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={onToggle}>
                Avbryt
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                loading={saving}
                loadingText="Lagrer"
              >
                Lagre
              </Button>
            </div>
          </div>
        </div>
      )}

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
    </li>
  );
}
