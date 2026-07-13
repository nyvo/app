import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  createInstructor, deleteInstructor, fetchInstructors, renameInstructor,
} from '@/services/instructors';
import type { Instructor } from '@/types/database';
import { toast } from 'sonner';

export interface InstructorRef { id: string; name: string }

interface InstructorFieldProps {
  sellerId: string;
  value: InstructorRef | null;
  onChange: (v: InstructorRef | null) => void;
  id?: string;
}

// Sentinel Select values — intercepted in onValueChange, never committed.
// The Select is controlled, so ignoring them keeps the display unchanged.
const NONE = '__none__';
const ADD = '__add__';
const MANAGE = '__manage__';

export function InstructorField({ sellerId, value, onChange, id }: InstructorFieldProps) {
  const [instructors, setInstructors] = useState<Instructor[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await fetchInstructors(sellerId);
    // A failed fetch must not read as "no instructors yet" — null the list
    // and show the error line instead (AffiliationsSection convention).
    if (error) { setInstructors(null); setLoadError(true); return; }
    setInstructors(data); setLoadError(false);
  }, [sellerId]);

  useEffect(() => { void load(); }, [load]);

  const handleSelect = (v: string) => {
    if (v === ADD) { setNewName(''); setAddOpen(true); return; }
    if (v === MANAGE) { setManageOpen(true); return; }
    if (v === NONE) { onChange(null); return; }
    const picked = instructors?.find((i) => i.id === v);
    if (picked) onChange({ id: picked.id, name: picked.name });
  };

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    const { data, error } = await createInstructor(sellerId, name);
    setSaving(false);
    if (error || !data) { toast.error('Kunne ikke lagre instruktøren'); return; }
    setAddOpen(false);
    await load();
    onChange({ id: data.id, name: data.name });
  };

  if (loadError) {
    return (
      <p className="text-sm text-foreground-muted">
        Kunne ikke laste instruktører.{' '}
        <button type="button" className="text-foreground underline" onClick={() => void load()}>Prøv igjen</button>
      </p>
    );
  }

  return (
    <>
      <Select value={value?.id ?? NONE} onValueChange={handleSelect} disabled={instructors === null}>
        <SelectTrigger id={id}>
          <SelectValue placeholder="Velg instruktør" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>Ingen</SelectItem>
          {(instructors ?? []).map((i) => (
            <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
          ))}
          <SelectSeparator />
          <SelectItem value={ADD}>Legg til ny</SelectItem>
          {(instructors ?? []).length > 0 && <SelectItem value={MANAGE}>Administrer</SelectItem>}
        </SelectContent>
      </Select>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ny instruktør</DialogTitle>
            <DialogDescription>Navnet vises på kurssiden og i timeplanen.</DialogDescription>
          </DialogHeader>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Navn"
            maxLength={100}
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') void handleAdd(); }}
          />
          <DialogFooter>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>Avbryt</Button>
            <Button onClick={() => void handleAdd()} loading={saving} disabled={!newName.trim()}>
              Lagre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ManageInstructorsDialog
        open={manageOpen}
        onOpenChange={setManageOpen}
        instructors={instructors ?? []}
        selectedId={value?.id ?? null}
        onChanged={load}
        onRenamedSelected={(name) => value && onChange({ ...value, name })}
        onDeletedSelected={() => onChange(null)}
      />
    </>
  );
}

function ManageInstructorsDialog({
  open, onOpenChange, instructors, selectedId, onChanged, onRenamedSelected, onDeletedSelected,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  instructors: Instructor[];
  selectedId: string | null;
  onChanged: () => Promise<void>;
  onRenamedSelected: (name: string) => void;
  onDeletedSelected: () => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  // Busy state is keyed per id — a single shared value would let one row's
  // action reset another's mid-request, re-enabling its button (double-submit).
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const setBusy = (id: string, busy: boolean) =>
    setBusyIds((prev) => {
      const next = new Set(prev);
      if (busy) next.add(id); else next.delete(id);
      return next;
    });

  const handleRename = async (id: string) => {
    const name = editName.trim();
    if (!name) return;
    setBusy(id, true);
    const { error } = await renameInstructor(id, name);
    setBusy(id, false);
    if (error) { toast.error('Kunne ikke endre navnet'); return; }
    setEditingId(null);
    await onChanged();
    if (id === selectedId) onRenamedSelected(name);
  };

  const handleDelete = async (id: string) => {
    setBusy(id, true);
    const { error } = await deleteInstructor(id);
    setBusy(id, false);
    if (error) { toast.error('Kunne ikke slette instruktøren'); return; }
    await onChanged();
    if (id === selectedId) onDeletedSelected();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Administrer instruktører</DialogTitle>
          <DialogDescription>Navnene vises på kurssiden og i timeplanen.</DialogDescription>
        </DialogHeader>
        <div className="divide-y divide-border-subtle">
          {instructors.map((i) => (
            <div key={i.id} className="flex items-center gap-2 py-2">
              {editingId === i.id ? (
                <>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    maxLength={100}
                    autoFocus
                    className="h-8"
                    onKeyDown={(e) => { if (e.key === 'Enter') void handleRename(i.id); }}
                  />
                  <Button size="sm" loading={busyIds.has(i.id)} disabled={!editName.trim()}
                    onClick={() => void handleRename(i.id)}>
                    Lagre
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Avbryt</Button>
                </>
              ) : (
                <>
                  <span className="flex-1 truncate text-sm">{i.name}</span>
                  <Button size="sm" variant="ghost"
                    onClick={() => { setEditingId(i.id); setEditName(i.name); }}>
                    Endre navn
                  </Button>
                  <Button size="sm" variant="ghost" className="text-danger"
                    loading={busyIds.has(i.id)} onClick={() => void handleDelete(i.id)}>
                    Slett
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-foreground-muted">
          Sletting fjerner ikke navnet fra eksisterende kurs.
        </p>
      </DialogContent>
    </Dialog>
  );
}
