import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { MapPin, Plus, Trash2, X } from '@/lib/icons';
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

function LocationCard({
  location,
  autoFocus,
  onDeleted,
}: {
  location: TeacherLocation;
  autoFocus: boolean;
  onDeleted: () => void;
}) {
  const [name, setName] = useState(location.name);
  const [address, setAddress] = useState(location.address ?? '');
  const [rooms, setRooms] = useState<string[]>(location.rooms);
  const [newRoom, setNewRoom] = useState('');
  const [deleting, setDeleting] = useState(false);
  const nameRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setName(location.name);
    setAddress(location.address ?? '');
    setRooms(location.rooms);
  }, [location.id, location.name, location.address, location.rooms]);

  useEffect(() => {
    if (autoFocus) {
      nameRef.current?.focus();
      nameRef.current?.select();
    }
  }, [autoFocus]);

  const saveField = async (updates: Partial<Pick<TeacherLocation, 'name' | 'address' | 'rooms'>>) => {
    const { error } = await updateLocation(location.id, updates);
    if (error) {
      toast.error('Kunne ikke lagre endringen');
    }
  };

  const commitName = () => {
    const trimmed = name.trim() || DEFAULT_NEW_NAME;
    if (trimmed !== name) setName(trimmed);
    if (trimmed !== location.name) saveField({ name: trimmed });
  };

  const commitAddress = () => {
    const trimmed = address.trim();
    const next = trimmed || null;
    if (trimmed !== address) setAddress(trimmed);
    if (next !== location.address) saveField({ address: next });
  };

  const addRoom = () => {
    const trimmed = newRoom.trim();
    if (!trimmed || rooms.includes(trimmed)) return;
    const next = [...rooms, trimmed];
    setRooms(next);
    setNewRoom('');
    saveField({ rooms: next });
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
    <Card className="group gap-0 py-0 transition-colors hover:bg-muted/20">
      <CardContent className="flex h-full flex-col gap-5 p-6">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-chart-2/10 text-chart-2">
            <MapPin className="size-5" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <Input
              ref={nameRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  nameRef.current?.blur();
                }
              }}
              placeholder="Navn på stedet"
              className="h-8 border-transparent bg-transparent px-2 text-base font-medium shadow-none hover:border-border focus:border-border -mx-2"
            />
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onBlur={commitAddress}
              onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
              placeholder="Adresse"
              className="h-7 border-transparent bg-transparent px-2 text-sm text-muted-foreground shadow-none hover:border-border focus:border-border -mx-2"
            />
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                aria-label={`Slett ${location.name}`}
              >
                <Trash2 className="size-4" />
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

        <div>
          <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Rom</span>
          <div className="flex flex-wrap gap-1.5">
            {rooms.map((room) => (
              <span
                key={room}
                className="inline-flex h-7 items-center gap-1 rounded-md bg-muted pl-2 pr-1 text-xs font-medium text-foreground"
              >
                {room}
                <button
                  type="button"
                  onClick={() => removeRoom(room)}
                  className="flex size-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                  aria-label={`Fjern ${room}`}
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
            <Input
              value={newRoom}
              onChange={(e) => setNewRoom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addRoom();
                }
              }}
              onBlur={addRoom}
              placeholder="Legg til rom"
              className="h-7 w-28 border-transparent bg-transparent px-2 text-xs shadow-none hover:border-border focus:border-border"
            />
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
        <div className="flex size-10 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors group-hover:bg-chart-2/10 group-hover:text-chart-2">
          <Plus className="size-5" />
        </div>
        <span className="text-sm font-medium text-foreground">Nytt sted</span>
      </div>
    </button>
  );
}
