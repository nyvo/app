import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  createLocation,
  updateLocation,
  deleteLocation,
} from '@/services/locations';
import type { TeacherLocation } from '@/types/database';

interface LocationsManagerProps {
  organizationId: string;
  locations: TeacherLocation[];
  onChanged: () => void;
}

export function LocationsManager({ organizationId, locations, onChanged }: LocationsManagerProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingRoomFor, setEditingRoomFor] = useState<string | null>(null);
  const [newRoom, setNewRoom] = useState('');
  const [saving, setSaving] = useState(false);

  // Address editing for existing locations
  const [editingAddressFor, setEditingAddressFor] = useState<string | null>(null);
  const [editAddress, setEditAddress] = useState('');

  const resetAddForm = () => {
    setNewName('');
    setNewAddress('');
    setIsAdding(false);
  };

  const handleAddLocation = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    if (locations.some((l) => l.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error('Stedet finnes allerede');
      return;
    }

    setSaving(true);
    const { error } = await createLocation({
      organization_id: organizationId,
      name: trimmed,
      address: newAddress.trim() || null,
    });
    setSaving(false);

    if (error) {
      toast.error('Kunne ikke lagre stedet');
      return;
    }

    resetAddForm();
    onChanged();
  };

  const handleDeleteLocation = async (id: string) => {
    const { error } = await deleteLocation(id);
    if (error) {
      toast.error('Kunne ikke slette stedet');
      return;
    }
    if (expandedId === id) setExpandedId(null);
    onChanged();
  };

  const handleAddRoom = async (location: TeacherLocation) => {
    const trimmed = newRoom.trim();
    if (!trimmed) return;

    if (location.rooms.some((r) => r.toLowerCase() === trimmed.toLowerCase())) {
      toast.error('Rommet finnes allerede');
      return;
    }

    setSaving(true);
    const { error } = await updateLocation(location.id, {
      rooms: [...location.rooms, trimmed],
    });
    setSaving(false);

    if (error) {
      toast.error('Kunne ikke legge til rom');
      return;
    }

    setNewRoom('');
    setEditingRoomFor(null);
    onChanged();
  };

  const handleRemoveRoom = async (location: TeacherLocation, roomIndex: number) => {
    const updatedRooms = location.rooms.filter((_, i) => i !== roomIndex);
    const { error } = await updateLocation(location.id, { rooms: updatedRooms });
    if (error) {
      toast.error('Kunne ikke fjerne rommet');
      return;
    }
    onChanged();
  };

  const handleSaveAddress = async (location: TeacherLocation) => {
    const trimmed = editAddress.trim();
    const { error } = await updateLocation(location.id, {
      address: trimmed || null,
    });
    if (error) {
      toast.error('Kunne ikke lagre adressen');
      return;
    }
    setEditingAddressFor(null);
    setEditAddress('');
    onChanged();
  };

  return (
    <Card className="p-0">
      {locations.length === 0 && !isAdding ? (
        <div className="px-6 py-5">
          <p className="text-sm font-medium text-foreground">Ingen steder lagt til</p>
          <p className="text-sm mt-1 text-muted-foreground">
            Legg til steder du bruker ofte for raskere kursoppretting.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border/50">
          {locations.map((loc) => {
            const isExpanded = expandedId === loc.id;
            return (
              <div key={loc.id}>
                <div className="flex items-center gap-3 px-6 py-4">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : loc.id)}
                    className="flex flex-1 items-center gap-2 text-left min-w-0"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <div className="min-w-0">
                      <span className="text-sm font-medium block truncate text-foreground">{loc.name}</span>
                      {loc.address && (
                        <span className="text-xs font-medium tracking-wide block truncate text-muted-foreground">{loc.address}</span>
                      )}
                    </div>
                    {loc.rooms.length > 0 && (
                      <span className="text-xs font-medium tracking-wide shrink-0 text-muted-foreground">
                        {loc.rooms.length} rom
                      </span>
                    )}
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleDeleteLocation(loc.id)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label={`Slett ${loc.name}`}
                  >
                    <Trash2 />
                  </Button>
                </div>

                {isExpanded && (
                  <div className="border-t border-border/30 bg-muted/30 px-6 py-4 space-y-4">
                    {/* Address */}
                    <div>
                      <p className="text-xs font-medium tracking-wide mb-1.5 text-muted-foreground">Adresse</p>
                      {editingAddressFor === loc.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editAddress}
                            onChange={(e) => setEditAddress(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSaveAddress(loc);
                              }
                              if (e.key === 'Escape') {
                                setEditingAddressFor(null);
                                setEditAddress('');
                              }
                            }}
                            placeholder="F.eks. Markveien 12, 0554 Oslo"
                            className="h-8"
                            autoFocus
                            disabled={saving}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleSaveAddress(loc)}
                            disabled={saving}
                          >
                            Lagre
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingAddressFor(null);
                              setEditAddress('');
                            }}
                          >
                            Avbryt
                          </Button>
                        </div>
                      ) : loc.address ? (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAddressFor(loc.id);
                            setEditAddress(loc.address || '');
                          }}
                          className="text-sm text-foreground hover:text-primary smooth-transition"
                        >
                          {loc.address}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAddressFor(loc.id);
                            setEditAddress('');
                          }}
                          className="text-xs font-medium flex items-center gap-1 text-muted-foreground smooth-transition hover:text-foreground"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Legg til adresse
                        </button>
                      )}
                    </div>

                    {/* Rooms */}
                    <div>
                      <p className="text-xs font-medium tracking-wide mb-1.5 text-muted-foreground">Rom</p>
                      {loc.rooms.length > 0 && (
                        <div className="mb-3 flex flex-wrap gap-2">
                          {loc.rooms.map((room, i) => (
                            <span
                              key={room}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground"
                            >
                              {room}
                              <button
                                type="button"
                                onClick={() => handleRemoveRoom(loc, i)}
                                className="text-muted-foreground hover:text-destructive"
                                aria-label={`Fjern ${room}`}
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}

                      {editingRoomFor === loc.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={newRoom}
                            onChange={(e) => setNewRoom(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddRoom(loc);
                              }
                              if (e.key === 'Escape') {
                                setNewRoom('');
                                setEditingRoomFor(null);
                              }
                            }}
                            placeholder="Romnavn"
                            className="h-8 max-w-48"
                            autoFocus
                            disabled={saving}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddRoom(loc)}
                            disabled={saving || !newRoom.trim()}
                          >
                            Legg til
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setNewRoom('');
                              setEditingRoomFor(null);
                            }}
                          >
                            Avbryt
                          </Button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRoomFor(loc.id);
                            setNewRoom('');
                          }}
                          className="text-xs font-medium flex items-center gap-1 text-muted-foreground smooth-transition hover:text-foreground"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Legg til rom
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className={cn("px-6 py-4", locations.length > 0 && "border-t border-border/50")}>
        {isAdding ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium tracking-wide mb-1 block text-muted-foreground">Navn</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') resetAddForm();
                }}
                placeholder="F.eks. Inspire Yogastudio"
                className="h-8"
                autoFocus
                disabled={saving}
              />
            </div>
            <div>
              <label className="text-xs font-medium tracking-wide mb-1 block text-muted-foreground">Adresse</label>
              <Input
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') resetAddForm();
                }}
                placeholder="F.eks. Markveien 12, 0554 Oslo"
                className="h-8"
                disabled={saving}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddLocation}
                disabled={saving || !newName.trim()}
              >
                Lagre
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetAddForm}
              >
                Avbryt
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground smooth-transition hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
            Legg til sted
          </button>
        )}
      </div>
    </Card>
  );
}
