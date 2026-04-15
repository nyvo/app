import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Heart, Home, MapPin, MapPinPlus, DoorOpen, Pencil, Plus, Trash2, X } from '@/lib/icons';
import { pageVariants, pageTransition } from '@/lib/motion';
import { MobileTeacherHeader } from '@/components/teacher/MobileTeacherHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useLocations } from '@/hooks/use-locations';
import { useTeacherShell } from '@/components/teacher/TeacherShellContext';
import { createLocation, updateLocation, deleteLocation } from '@/services/locations';
import { cn } from '@/lib/utils';
import type { TeacherLocation } from '@/types/database';

const DEFAULT_NEW_NAME = 'Nytt sted';

const LocationsPage = () => {
  const { currentOrganization } = useAuth();
  const { locations, refetch } = useLocations(currentOrganization?.id);
  const { setBreadcrumbs } = useTeacherShell();
  const [focusLocationId, setFocusLocationId] = useState<string | null>(null);

  useEffect(() => {
    setBreadcrumbs([
      { label: 'Hjem', to: '/teacher' },
      { label: 'Steder' },
    ]);
    return () => setBreadcrumbs(null);
  }, [setBreadcrumbs]);

  const handleCreate = async () => {
    if (!currentOrganization?.id) return;
    const { data, error } = await createLocation({
      organization_id: currentOrganization.id,
      name: DEFAULT_NEW_NAME,
      address: null,
      rooms: [],
    });
    if (error || !data) {
      toast.error('Kunne ikke opprette stedet');
      return;
    }
    setFocusLocationId(data.id);
    refetch();
  };

  return (
    <main className="flex-1 min-h-full overflow-y-auto bg-background">
      <MobileTeacherHeader title="Steder" />

      <motion.div
        variants={pageVariants}
        initial="initial"
        animate="animate"
        transition={pageTransition}
        className="px-6 pb-24 md:pb-8 lg:px-8"
      >
        <div className="mb-8 pt-6 lg:pt-8">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Steder</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Lagre steder du bruker ofte, så kan du velge dem raskt når du oppretter kurs.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {locations.map((loc) => (
            <LocationCard
              key={loc.id}
              location={loc}
              autoFocus={focusLocationId === loc.id}
              onDeleted={refetch}
            />
          ))}
          <NewLocationCard onClick={handleCreate} />
        </div>
      </motion.div>
    </main>
  );
};

export default LocationsPage;

type EditField = 'name' | 'address' | null;

function LocationCard({
  location,
  autoFocus,
  onDeleted,
}: {
  location: TeacherLocation;
  autoFocus: boolean;
  onDeleted: () => void;
}) {
  const [editingField, setEditingField] = useState<EditField>(autoFocus ? 'name' : null);
  const [name, setName] = useState(location.name);
  const [address, setAddress] = useState(location.address ?? '');
  const [rooms, setRooms] = useState<string[]>(location.rooms);
  const [newRoom, setNewRoom] = useState('');
  const [addingRoom, setAddingRoom] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const nameRef = useRef<HTMLInputElement | null>(null);
  const addressRef = useRef<HTMLInputElement | null>(null);
  const newRoomRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editingField !== 'name') setName(location.name);
    if (editingField !== 'address') setAddress(location.address ?? '');
    setRooms(location.rooms);
  }, [location.id, location.name, location.address, location.rooms, editingField]);

  useEffect(() => {
    if (editingField === 'name') {
      setTimeout(() => { nameRef.current?.focus(); nameRef.current?.select(); }, 0);
    } else if (editingField === 'address') {
      setTimeout(() => addressRef.current?.focus(), 0);
    }
  }, [editingField]);

  const saveField = async (updates: Partial<Pick<TeacherLocation, 'name' | 'address' | 'rooms'>>) => {
    const { error } = await updateLocation(location.id, updates);
    if (error) toast.error('Kunne ikke lagre endringen');
  };

  const commitName = () => {
    const trimmed = name.trim() || DEFAULT_NEW_NAME;
    setName(trimmed);
    setEditingField(null);
    if (trimmed !== location.name) saveField({ name: trimmed });
  };

  const cancelName = () => {
    setName(location.name);
    setEditingField(null);
  };

  const commitAddress = () => {
    const trimmed = address.trim();
    const next = trimmed || null;
    setAddress(trimmed);
    setEditingField(null);
    if (next !== location.address) saveField({ address: next });
  };

  const cancelAddress = () => {
    setAddress(location.address ?? '');
    setEditingField(null);
  };

  const commitNewRoom = () => {
    const trimmed = newRoom.trim();
    setNewRoom('');
    setAddingRoom(false);
    if (!trimmed || rooms.includes(trimmed)) return;
    const next = [...rooms, trimmed];
    setRooms(next);
    saveField({ rooms: next });
  };

  const startAddRoom = () => {
    setAddingRoom(true);
    setTimeout(() => newRoomRef.current?.focus(), 0);
  };

  const removeRoom = (room: string) => {
    const next = rooms.filter((r) => r !== room);
    setRooms(next);
    saveField({ rooms: next });
  };

  const handleDelete = async () => {
    setDeleting(true);
    const { error } = await deleteLocation(location.id);
    setDeleting(false);
    if (error) {
      toast.error('Kunne ikke slette stedet');
      return;
    }
    toast.success('Stedet er slettet');
    onDeleted();
  };

  return (
    <Card className="gap-0 py-0">
      <CardContent className="flex h-full flex-col gap-5 p-6">
        {/* Header: icon + name + favorite */}
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-chart-2/10 text-chart-2">
            <Home className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            {editingField === 'name' ? (
              <Input
                ref={nameRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={commitName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); commitName(); }
                  else if (e.key === 'Escape') cancelName();
                }}
                placeholder="Navn på stedet"
                className="-mx-2 h-7 px-2 text-base font-medium leading-tight shadow-none"
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingField('name')}
                aria-label="Rediger navn"
                className="group/name -mx-2 flex w-[calc(100%+1rem)] items-start gap-1.5 rounded px-2 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
              >
                <h2 className="truncate text-base font-medium leading-tight text-foreground">{location.name}</h2>
                <Pencil className="mt-0.5 size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/name:opacity-100" />
              </button>
            )}
          </div>
          <Button
            type="button"
            variant="outline-soft"
            size="compact"
            onClick={() => setIsFavorite((v) => !v)}
            aria-pressed={isFavorite}
            className={cn(
              'h-6 shrink-0 gap-1.5 px-2 text-xs',
              isFavorite && 'border-chart-2/30 bg-chart-2/10 text-chart-2 hover:bg-chart-2/15 hover:text-chart-2'
            )}
          >
            <Heart className={cn('size-3', isFavorite && 'fill-current')} />
            {isFavorite ? 'Favoritt' : 'Lagre som favoritt'}
          </Button>
        </div>

        {/* Metadata: address + rooms */}
        <div className="space-y-4">
          {/* Address */}
          <div>
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <MapPin className="size-3.5" />
              Adresse
            </span>
            {editingField === 'address' ? (
              <Input
                ref={addressRef}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                onBlur={commitAddress}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); commitAddress(); }
                  else if (e.key === 'Escape') cancelAddress();
                }}
                placeholder="Ingen adresse"
                className="h-7 px-2 text-sm leading-tight shadow-none"
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingField('address')}
                aria-label="Rediger adresse"
                className="group/addr -mx-2 flex w-[calc(100%+1rem)] items-center gap-1.5 rounded px-2 py-0.5 text-left text-sm text-foreground transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
              >
                <span className={cn('truncate', !location.address && 'text-muted-foreground')}>
                  {location.address || 'Ingen adresse'}
                </span>
                <Pencil className="size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/addr:opacity-100" />
              </button>
            )}
          </div>

          {/* Rooms */}
          <div>
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <DoorOpen className="size-3.5" />
              Rom
            </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {rooms.map((room) => (
              <span
                key={room}
                className="group/room inline-flex h-7 items-center gap-1 rounded-md bg-muted pl-2 pr-1 text-xs font-medium text-foreground"
              >
                {room}
                <button
                  type="button"
                  onClick={() => removeRoom(room)}
                  className="flex size-5 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-background hover:text-foreground group-hover/room:opacity-100 focus-visible:opacity-100"
                  aria-label={`Fjern ${room}`}
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
            {addingRoom ? (
              <Input
                ref={newRoomRef}
                value={newRoom}
                onChange={(e) => setNewRoom(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); commitNewRoom(); }
                  else if (e.key === 'Escape') { setNewRoom(''); setAddingRoom(false); }
                }}
                onBlur={commitNewRoom}
                placeholder="Navn på rom"
                className="h-7 w-32 px-2 text-xs"
              />
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={startAddRoom}
                className="h-7 gap-1 px-2 text-xs font-medium text-muted-foreground hover:bg-transparent hover:text-foreground"
              >
                <Plus className="size-3.5" />
                Legg til rom
              </Button>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="ml-auto h-7 gap-1 px-2 text-xs font-medium text-muted-foreground hover:bg-transparent hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                  Slett sted
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Slette {location.name}?</AlertDialogTitle>
                  <AlertDialogDescription>Dette kan ikke angres.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Avbryt</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} disabled={deleting}>
                    {deleting ? 'Sletter' : 'Slett'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            </div>
          </div>
        </div>

      </CardContent>
    </Card>
  );
}

function NewLocationCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-40 items-center justify-center rounded-xl border-2 border-dashed border-border bg-transparent p-6 text-center outline-none transition-colors hover:border-foreground/30 hover:bg-muted/30 focus-visible:border-foreground/30 focus-visible:bg-muted/30"
    >
      <div className="flex flex-col items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-md bg-chart-2/10 text-chart-2">
          <MapPinPlus className="size-5" />
        </div>
        <span className="text-sm font-medium text-foreground">Nytt sted</span>
      </div>
    </button>
  );
}
