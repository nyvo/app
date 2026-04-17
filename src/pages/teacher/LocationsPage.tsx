import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Check, Heart, Home, MapPin, MapPinPlus, DoorOpen, Plus, Trash2, X } from '@/lib/icons';
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
import { createLocation, updateLocation, deleteLocation, setFavoriteLocation } from '@/services/locations';
import { cn } from '@/lib/utils';
import type { TeacherLocation } from '@/types/database';

const DEFAULT_NEW_NAME = 'Nytt sted';

/* Shared easing — strong ease-out for UI interactions (Emil Kowalski) */
const ease = [0.23, 1, 0.32, 1] as const;

/* Crossfade for inline edit swap — prevents jarring snap */
const editSwap = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.12, ease },
};

const LocationsPage = () => {
  const { currentOrganization } = useAuth();
  const { locations, refetch } = useLocations(currentOrganization?.id);
  const { setBreadcrumbs } = useTeacherShell();
  const [focusLocationId, setFocusLocationId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    setBreadcrumbs([
      { label: 'Hjem', to: '/teacher' },
      { label: 'Steder' },
    ]);
    return () => setBreadcrumbs(null);
  }, [setBreadcrumbs]);

  const handleCreate = async () => {
    if (!currentOrganization?.id || creating) return;
    setCreating(true);
    const { data, error } = await createLocation({
      organization_id: currentOrganization.id,
      name: DEFAULT_NEW_NAME,
      address: null,
      rooms: [],
    });
    setCreating(false);
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
              hasFavorite={locations.some((l) => l.is_favorite)}
              organizationId={currentOrganization?.id}
              onChanged={refetch}
            />
          ))}
          <NewLocationCard onClick={handleCreate} loading={creating} />
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
  hasFavorite,
  organizationId,
  onChanged,
}: {
  location: TeacherLocation;
  autoFocus: boolean;
  hasFavorite: boolean;
  organizationId: string | undefined;
  onChanged: () => void;
}) {
  const [editingField, setEditingField] = useState<EditField>(autoFocus ? 'name' : null);
  const [name, setName] = useState(location.name);
  const [address, setAddress] = useState(location.address ?? '');
  const [rooms, setRooms] = useState<string[]>(location.rooms);
  const [newRoom, setNewRoom] = useState('');
  const [addingRoom, setAddingRoom] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isFavorite = location.is_favorite;
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
    if (error) {
      toast.error('Kunne ikke lagre endringen');
      return;
    }
    onChanged();
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
    onChanged();
  };

  return (
    <Card className="gap-0 py-0 flex flex-col">
      <CardContent className="flex flex-1 flex-col gap-5 p-6">
        {/* Header: icon + name + favorite */}
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-chart-2/10 text-chart-2">
            <Home className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <AnimatePresence mode="wait" initial={false}>
              {editingField === 'name' ? (
                <motion.div key="name-edit" {...editSwap} className="flex items-center gap-1.5">
                  <Input
                    ref={nameRef}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); commitName(); }
                      else if (e.key === 'Escape') cancelName();
                    }}
                    placeholder="Navn på stedet"
                    className="h-7 max-w-56 px-2 text-sm font-medium leading-tight shadow-none"
                  />
                  <Button type="button" variant="ghost" size="icon-xs" onClick={commitName} aria-label="Lagre" className="active:scale-[0.95]">
                    <Check className="size-3.5" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon-xs" onClick={cancelName} aria-label="Avbryt" className="active:scale-[0.95]">
                    <X className="size-3.5" />
                  </Button>
                </motion.div>
              ) : (
                <motion.button
                  key="name-display"
                  {...editSwap}
                  type="button"
                  onClick={() => setEditingField('name')}
                  aria-label="Rediger navn"
                  className="-mx-2 flex items-center gap-1.5 rounded px-2 text-left transition-[background-color] duration-150 ease-out hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none active:scale-[0.98]"
                >
                  <h2 className="truncate text-base font-medium leading-tight text-foreground">{name}</h2>
                  <span className="shrink-0 text-xs text-muted-foreground">Rediger</span>
                </motion.button>
              )}
            </AnimatePresence>
          </div>
          <Button
            type="button"
            variant="outline-soft"
            size="compact"
            disabled={!isFavorite && hasFavorite}
            onClick={async () => {
              if (!organizationId) return;
              const { error } = await setFavoriteLocation(
                organizationId,
                isFavorite ? null : location.id
              );
              if (error) {
                toast.error('Kunne ikke oppdatere favoritt');
                return;
              }
              onChanged();
            }}
            aria-pressed={isFavorite}
            className={cn(
              'h-6 shrink-0 gap-1.5 px-2 text-xs active:scale-[0.95] transition-[background-color,border-color,color] duration-200 ease-out',
              isFavorite && 'border-chart-2/30 bg-chart-2/10 text-chart-2 hover:bg-chart-2/15 hover:text-chart-2'
            )}
          >
            <motion.span
              key={isFavorite ? 'fav' : 'unfav'}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 15, mass: 0.5 }}
              className="flex items-center"
            >
              <Heart className={cn('size-3', isFavorite && 'fill-current')} />
            </motion.span>
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
            <AnimatePresence mode="wait" initial={false}>
              {editingField === 'address' ? (
                <motion.div key="addr-edit" {...editSwap} className="flex items-center gap-1.5">
                  <Input
                    ref={addressRef}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); commitAddress(); }
                      else if (e.key === 'Escape') cancelAddress();
                    }}
                    placeholder="Skriv inn adresse"
                    className="h-7 max-w-64 px-2 text-sm leading-tight shadow-none"
                  />
                  <Button type="button" variant="ghost" size="icon-xs" onClick={commitAddress} aria-label="Lagre" className="active:scale-[0.95]">
                    <Check className="size-3.5" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon-xs" onClick={cancelAddress} aria-label="Avbryt" className="active:scale-[0.95]">
                    <X className="size-3.5" />
                  </Button>
                </motion.div>
              ) : (
                <motion.button
                  key="addr-display"
                  {...editSwap}
                  type="button"
                  onClick={() => setEditingField('address')}
                  aria-label="Rediger adresse"
                  className={cn(
                    "-mx-2 flex items-center gap-1.5 rounded px-2 py-0.5 text-left text-sm transition-[background-color] duration-150 ease-out hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none active:scale-[0.98]",
                    address ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {!address && <Plus className="size-3 shrink-0" />}
                  <span className="truncate">
                    {address || 'Legg til adresse'}
                  </span>
                  {address && <span className="shrink-0 text-xs text-muted-foreground">Rediger</span>}
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Rooms */}
          <div>
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <DoorOpen className="size-3.5" />
              Rom
            </span>
            {rooms.length > 0 && (
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                <AnimatePresence initial={false}>
                  {rooms.map((room) => (
                    <motion.span
                      key={room}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.15, ease }}
                      className="inline-flex h-7 items-center gap-1 rounded-md bg-muted pl-2 pr-1 text-xs font-medium text-foreground"
                    >
                      {room}
                      <button
                        type="button"
                        onClick={() => removeRoom(room)}
                        className="flex size-5 items-center justify-center rounded text-muted-foreground transition-[color] duration-150 ease-out hover:bg-background hover:text-foreground active:scale-[0.9]"
                        aria-label={`Fjern ${room}`}
                      >
                        <X className="size-3" />
                      </button>
                    </motion.span>
                  ))}
                </AnimatePresence>
              </div>
            )}
            <AnimatePresence mode="wait" initial={false}>
              {addingRoom ? (
                <motion.div key="room-edit" {...editSwap} className="flex items-center gap-1.5">
                  <Input
                    ref={newRoomRef}
                    value={newRoom}
                    onChange={(e) => setNewRoom(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); commitNewRoom(); }
                      else if (e.key === 'Escape') { setNewRoom(''); setAddingRoom(false); }
                    }}
                    placeholder="Navn på rom"
                    className="h-7 w-32 px-2 text-xs"
                  />
                  <Button type="button" variant="ghost" size="icon-xs" onClick={commitNewRoom} aria-label="Lagre" className="active:scale-[0.95]">
                    <Check className="size-3.5" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon-xs" onClick={() => { setNewRoom(''); setAddingRoom(false); }} aria-label="Avbryt" className="active:scale-[0.95]">
                    <X className="size-3.5" />
                  </Button>
                </motion.div>
              ) : (
                <motion.button
                  key="room-add"
                  {...editSwap}
                  type="button"
                  onClick={startAddRoom}
                  className="-mx-2 flex items-center gap-1.5 rounded px-2 py-0.5 text-sm text-muted-foreground transition-[background-color] duration-150 ease-out hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none active:scale-[0.98]"
                >
                  <Plus className="size-3" />
                  Legg til rom
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Delete */}
        <div className="mt-auto border-t border-border pt-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="destructive-outline"
                size="compact"
                className="active:scale-[0.97]"
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

      </CardContent>
    </Card>
  );
}

function NewLocationCard({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="group flex min-h-40 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-border bg-transparent p-6 text-center outline-none transition-[background-color,border-color] duration-150 ease-out hover:border-foreground/30 hover:bg-muted/30 focus-visible:border-foreground/30 focus-visible:bg-muted/30 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
    >
      <div className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-muted-foreground transition-[color] duration-150 ease-out group-hover:text-foreground">
        <MapPinPlus className={cn('size-3.5', loading && 'animate-pulse')} />
        {loading ? 'Oppretter …' : 'Legg til sted'}
      </div>
    </button>
  );
}
