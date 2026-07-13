# Course Instructor Attribution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Studio accounts save a list of instructor names and pick one per course; students see the name on the already-wired public surfaces.

**Architecture:** One migration adds a seller-scoped `instructors` table, repoints the dead `courses.instructor_id` FK (profiles → instructors), and teaches the `save_course_schedule` RPC the two instructor columns. A new `InstructorField` component (select + inline add + manage dialog) renders in `CreateCourseDrawer` and `CourseSettingsTab`, gated to `operating_model === 'studio'`. `courses.instructor_name` stays the denormalized display copy; public pages need zero changes.

**Tech Stack:** React + TypeScript, Supabase (Postgres/RLS), shadcn/ui primitives, vitest.

**Spec:** `docs/superpowers/specs/2026-07-14-course-instructor-attribution-design.md`

## Global Constraints

- Migration is DONE only when its `.sql` file is committed and on `origin/main` (CLAUDE.md). Timestamp must be strictly greater than the latest in `supabase/migrations/` — check with `ls supabase/migrations | sort | tail -3` before creating.
- `.env.local` points at the DEV project (openspot-dev, `pwwqrrbhusjmstdyqddj`); prod gets migrations only via `main`/CI. If `supabase db push` errors on auth or linking, STOP and ask the user — do NOT run `supabase migration repair`.
- UI copy is Bokmål; errors/toasts are one terse neutral sentence. Never "vennligst", no Title Case.
- Consume semantic design tokens only (`bg-muted`, `text-foreground-muted`, …), never primitives. Pill buttons for actions; status colours only as subtle treatments.
- Before building Task 4 (the only new visual surface), the executor MUST invoke the `ux-ui-pro` and `emil-design-eng` skills (CLAUDE.md mandate) and preview the result live via `npm run dev`.
- Testing reality: this repo unit-tests pure functions only (see `CoursePage.test.ts`); there is no supabase-client mock harness. New code here is thin DB/UI glue, so tasks verify via `tsc`, the existing vitest suite, and a scripted manual click-through in Task 7. Do not invent a mocking framework.
- The repo runs `tsc` as part of `npm run build`. `npx tsc --noEmit` is the fast typecheck.

---

### Task 1: Migration — instructors table, FK repoint, RPC extension

**Files:**
- Create: `supabase/migrations/20260714100000_course_instructors.sql` (re-timestamp if `ls supabase/migrations | sort | tail -3` shows anything ≥ this)

**Interfaces:**
- Produces: table `public.instructors(id uuid, seller_id uuid, name text, created_at timestamptz)`; `courses.instructor_id` now references `instructors(id) ON DELETE SET NULL`; `save_course_schedule` accepts `instructor_id` / `instructor_name` keys in `p_course`.

- [ ] **Step 1: Check the latest migration timestamp**

Run: `ls supabase/migrations | sort | tail -3`
Expected: last line is `20260711131000_deletion_blocks_active_subscription.sql` (or later — pick a strictly greater timestamp for the new file if so).

- [ ] **Step 2: Write the migration**

Create `supabase/migrations/20260714100000_course_instructors.sql`:

```sql
-- Course instructor attribution (spec: docs/superpowers/specs/
-- 2026-07-14-course-instructor-attribution-design.md).
--
-- 1. instructors: a studio's saved instructor names. No logins, no anon access
--    — public pages read the denormalized courses.instructor_name instead.
-- 2. courses.instructor_id was an all-NULL FK to profiles, referenced nowhere
--    in app code. Repoint it at instructors so the saved entry is the
--    identity and renames can propagate. ON DELETE SET NULL keeps
--    instructor_name on the course when an instructor is removed — past
--    attribution stays truthful.
-- 3. save_course_schedule learns the two columns (key-presence guarded like
--    every other field) so the CoursePage settings save can write them.
--
-- Known accepted limitation: nothing stops a seller writing another seller's
-- instructor_id (FK checks existence, not tenancy). Harmless — display comes
-- from instructor_name, and instructors are not readable cross-tenant — so no
-- trigger; revisit only if instructors ever gain public data.

CREATE TABLE public.instructors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 100),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_instructors_seller ON public.instructors(seller_id);

ALTER TABLE public.instructors ENABLE ROW LEVEL SECURITY;

-- Same member-scoped idiom as the courses policies (roles are owner-only
-- since 20260606140000, so member == owner).
CREATE POLICY "instructors_all_member" ON public.instructors
  TO authenticated
  USING (public.is_seller_member(seller_id, (SELECT auth.uid())))
  WITH CHECK (public.is_seller_member(seller_id, (SELECT auth.uid())));

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.instructors TO authenticated;
GRANT ALL ON TABLE public.instructors TO service_role;

-- Repoint the legacy FK. Column is NULL on every row (verified 2026-07-14),
-- so this cannot fail validation.
ALTER TABLE public.courses DROP CONSTRAINT courses_instructor_id_fkey;
ALTER TABLE public.courses
  ADD CONSTRAINT courses_instructor_id_fkey
  FOREIGN KEY (instructor_id) REFERENCES public.instructors(id) ON DELETE SET NULL;
```

Then, in the same file, append a `CREATE OR REPLACE FUNCTION public.save_course_schedule(...)` that is a **verbatim copy** of the entire function from `supabase/migrations/20260705200000_save_course_schedule_rpc.sql` (lines 34–215, including the trailing `REVOKE`/`GRANT`), with exactly ONE change — the `UPDATE public.courses SET` block gains the two instructor lines. The full replacement block (swap it in for the existing one at the function's "Course fields" comment):

```sql
  -- ── Course fields (key-presence guarded so absent keys keep values) ─────
  UPDATE public.courses SET
    title             = CASE WHEN p_course ? 'title' THEN p_course->>'title' ELSE title END,
    description       = CASE WHEN p_course ? 'description' THEN p_course->>'description' ELSE description END,
    location          = CASE WHEN p_course ? 'location' THEN p_course->>'location' ELSE location END,
    location_address  = CASE WHEN p_course ? 'location_address' THEN p_course->>'location_address' ELSE location_address END,
    location_lat      = CASE WHEN p_course ? 'location_lat' THEN (p_course->>'location_lat')::double precision ELSE location_lat END,
    location_lon      = CASE WHEN p_course ? 'location_lon' THEN (p_course->>'location_lon')::double precision ELSE location_lon END,
    location_place_id = CASE WHEN p_course ? 'location_place_id' THEN p_course->>'location_place_id' ELSE location_place_id END,
    max_participants  = CASE WHEN p_course ? 'max_participants' THEN (p_course->>'max_participants')::integer ELSE max_participants END,
    price             = CASE WHEN p_course ? 'price' THEN (p_course->>'price')::numeric ELSE price END,
    time_schedule     = CASE WHEN p_course ? 'time_schedule' THEN p_course->>'time_schedule' ELSE time_schedule END,
    duration          = CASE WHEN p_course ? 'duration' THEN (p_course->>'duration')::integer ELSE duration END,
    instructor_id     = CASE WHEN p_course ? 'instructor_id' THEN (p_course->>'instructor_id')::uuid ELSE instructor_id END,
    instructor_name   = CASE WHEN p_course ? 'instructor_name' THEN p_course->>'instructor_name' ELSE instructor_name END,
    updated_at        = now()
  WHERE id = p_course_id;
```

- [ ] **Step 3: Apply to the dev database**

Run: `supabase db push`
Expected: lists `20260714100000_course_instructors.sql` as applied, exit 0.
If it fails with auth/link errors or "Remote migration versions not found": STOP, do not repair, ask the user (env split is documented in memory `dev-prod-environments`).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260714100000_course_instructors.sql
git commit -m "feat: instructors table + courses FK repoint + save RPC instructor fields"
```

---

### Task 2: Types — instructors table and courses.instructor_id

**Files:**
- Modify: `src/types/database.ts` (courses block is at ~lines 157–251)

**Interfaces:**
- Produces: `Database['public']['Tables']['instructors']`; `courses` Row/Insert/Update gain `instructor_id`. Convenience export `Instructor`.

- [ ] **Step 1: Add `instructor_id` to the courses types**

In the `courses` block, add to `Row` (alphabetical, after `image_url`):
```ts
          instructor_id: string | null
```
Add to `Insert` and `Update` (same position):
```ts
          instructor_id?: string | null
```
Append to the courses `Relationships` array:
```ts
          {
            foreignKeyName: "courses_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["id"]
          },
```

- [ ] **Step 2: Add the instructors table block**

Insert alphabetically among the `Tables` keys (after `courses`, before `notifications`):
```ts
      instructors: {
        Row: {
          created_at: string
          id: string
          name: string
          seller_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          seller_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "instructors_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
```

Find where the file exports row aliases (e.g. `export type Course = …`) and add beside them:
```ts
export type Instructor = Database['public']['Tables']['instructors']['Row']
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0, no errors.

- [ ] **Step 4: Commit**

```bash
git add src/types/database.ts
git commit -m "feat: instructors table types + courses.instructor_id"
```

---

### Task 3: Service — src/services/instructors.ts

**Files:**
- Create: `src/services/instructors.ts`

**Interfaces:**
- Consumes: `Instructor` type from Task 2.
- Produces (Task 4 relies on these exact signatures):
  - `fetchInstructors(sellerId: string): Promise<{ data: Instructor[]; error: Error | null }>`
  - `createInstructor(sellerId: string, name: string): Promise<{ data: Instructor | null; error: Error | null }>`
  - `renameInstructor(id: string, name: string): Promise<{ error: Error | null }>`
  - `deleteInstructor(id: string): Promise<{ error: Error | null }>`

- [ ] **Step 1: Write the service**

```ts
import { supabase } from '@/lib/supabase';
import type { Instructor } from '@/types/database';

// ---------------------------------------------------------------------------
// A studio's saved instructor names (no logins — see the 2026-07-14 spec).
// courses.instructor_name is the denormalized display copy the public pages
// read; renameInstructor keeps it in sync. Deleting an instructor nulls the
// FK (ON DELETE SET NULL) but leaves instructor_name on existing courses, so
// past attribution stays truthful.
// ---------------------------------------------------------------------------

export async function fetchInstructors(
  sellerId: string,
): Promise<{ data: Instructor[]; error: Error | null }> {
  const { data, error } = await supabase
    .from('instructors')
    .select('*')
    .eq('seller_id', sellerId)
    .order('name');
  if (error) return { data: [], error: error as Error };
  return { data: (data ?? []) as Instructor[], error: null };
}

export async function createInstructor(
  sellerId: string,
  name: string,
): Promise<{ data: Instructor | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('instructors')
    .insert({ seller_id: sellerId, name: name.trim() })
    .select()
    .single();
  if (error) return { data: null, error: error as Error };
  return { data: data as Instructor, error: null };
}

/** Renames the saved entry, then syncs the denormalized display name on that
 * instructor's courses. Two sequential statements (not atomic): a failure
 * between them leaves course rows one rename behind, which the next rename
 * repairs — accepted in the spec. */
export async function renameInstructor(
  id: string,
  name: string,
): Promise<{ error: Error | null }> {
  const trimmed = name.trim();
  const { error } = await supabase.from('instructors').update({ name: trimmed }).eq('id', id);
  if (error) return { error: error as Error };
  const { error: syncError } = await supabase
    .from('courses')
    .update({ instructor_name: trimmed })
    .eq('instructor_id', id);
  if (syncError) return { error: syncError as Error };
  return { error: null };
}

export async function deleteInstructor(id: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('instructors').delete().eq('id', id);
  return { error: (error as Error) ?? null };
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/services/instructors.ts
git commit -m "feat: instructors service (fetch/create/rename/delete with name sync)"
```

---

### Task 4: InstructorField component (picker + add + manage dialog)

**Files:**
- Create: `src/components/teacher/InstructorField.tsx`

**Interfaces:**
- Consumes: all four service functions from Task 3 (exact signatures above); shadcn `Select`, `Dialog`, `Input`, `Button` from `@/components/ui/*`.
- Produces (Tasks 5–6 rely on this): `InstructorField` with props `{ sellerId: string; value: InstructorRef | null; onChange: (v: InstructorRef | null) => void; id?: string }` and `export interface InstructorRef { id: string; name: string }`.

**MANDATORY before writing markup:** invoke the `ux-ui-pro` and `emil-design-eng` skills; follow the approved mockup (dropdown lists saved names, then «Legg til ny» / «Administrer» actions; manage dialog has rename + delete per row and the footer hint «Sletting fjerner ikke navnet fra eksisterende kurs.»). The code below is the reference behavior — polish per the skills, don't restructure.

- [ ] **Step 1: Write the component**

```tsx
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
        <button type="button" className="underline" onClick={() => void load()}>Prøv igjen</button>
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
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleRename = async (id: string) => {
    const name = editName.trim();
    if (!name) return;
    setBusyId(id);
    const { error } = await renameInstructor(id, name);
    setBusyId(null);
    if (error) { toast.error('Kunne ikke endre navnet'); return; }
    setEditingId(null);
    await onChanged();
    if (id === selectedId) onRenamedSelected(name);
  };

  const handleDelete = async (id: string) => {
    setBusyId(id);
    const { error } = await deleteInstructor(id);
    setBusyId(null);
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
                  <Button size="sm" loading={busyId === i.id} disabled={!editName.trim()}
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
                    loading={busyId === i.id} onClick={() => void handleDelete(i.id)}>
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
```

Adjust imports to the actual exports of the local `select.tsx` / `dialog.tsx` / `button.tsx` (e.g. `SelectSeparator` exists in the shadcn select; if `Button` has no `loading` prop in this repo, check `button.tsx` — it does, `CreateCourseDrawer` uses `loading`/`loadingText`).

- [ ] **Step 2: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: exit 0 for both.

- [ ] **Step 3: Commit**

```bash
git add src/components/teacher/InstructorField.tsx
git commit -m "feat: InstructorField picker with inline add + manage dialog"
```

---

### Task 5: CreateCourseDrawer wiring

**Files:**
- Modify: `src/pages/teacher/CreateCourseDrawer.tsx` (state near line 121; payload at lines 319–341; form markup — insert after the Beskrivelse `Field`, ~line 486)

**Interfaces:**
- Consumes: `InstructorField`, `InstructorRef` from Task 4; `currentSeller.operating_model` from `useAuth()` (already imported at line 121).

- [ ] **Step 1: Add state and the gate**

Next to the other `useState` declarations:
```tsx
const [instructor, setInstructor] = useState<InstructorRef | null>(null);
const isStudio = currentSeller?.operating_model === 'studio';
```
Imports:
```tsx
import { InstructorField, type InstructorRef } from '@/components/teacher/InstructorField';
```

- [ ] **Step 2: Render the field**

Directly after the closing of the Beskrivelse `Field` (inside the same `<section className="space-y-5 py-6">`, after line ~486):
```tsx
{isStudio && currentSeller && (
  <Field label="Instruktør (valgfritt)" htmlFor="cb-instructor">
    {() => (
      <InstructorField
        id="cb-instructor"
        sellerId={currentSeller.id}
        value={instructor}
        onChange={setInstructor}
      />
    )}
  </Field>
)}
```
(Match the local `Field` component's render-prop signature exactly — it passes `{ errorId, labelId }`; this field has no error state so the args go unused.)

- [ ] **Step 3: Send it in the create payload**

In `createDraft`, replace the hardcoded line 324 `instructor_name: null,` with:
```tsx
instructor_id: instructor?.id ?? null,
instructor_name: instructor?.name ?? null,
```

- [ ] **Step 4: Include it in the dirty check**

Add `instructor != null ||` to the `isDirty` memo's expression (lines 260–266) and `instructor` to its dependency array.

- [ ] **Step 5: Typecheck, then verify in the browser**

Run: `npx tsc --noEmit`
Expected: exit 0.
Run `npm run dev`, log in as a studio seller (`operating_model === 'studio'`; toggle on StudioPage if needed), open «Nytt kurs»: the field renders after Beskrivelse, «Legg til ny» creates and selects a name, and a solo seller does NOT see the field.

- [ ] **Step 6: Commit**

```bash
git add src/pages/teacher/CreateCourseDrawer.tsx
git commit -m "feat: instructor picker in course creation (studio accounts)"
```

---

### Task 6: CoursePage + CourseSettingsTab wiring

**Files:**
- Modify: `src/hooks/use-course-detail.ts` (mapper, lines 30–60)
- Modify: `src/pages/teacher/CoursePage.tsx` (state ~235–265; hydrate effect ~277–296; dirty memo ~309–349; `handleSave` updateData ~458–470 and cache mirror ~537–556; CourseSettingsTab props ~1013)
- Modify: `src/components/teacher/CourseSettingsTab.tsx` (props interface line 30; render in the general-info section after the description field)

**Interfaces:**
- Consumes: `InstructorField`/`InstructorRef` (Task 4); `save_course_schedule` instructor keys (Task 1).
- Produces: `MappedCourse` gains `instructorId: string | null` and `instructorName: string | null`; `CourseSettingsTabProps` gains `instructor: InstructorRef | null`, `onInstructorChange: (v: InstructorRef | null) => void`, `instructorSellerId: string | null` (null ⇒ hide the field — the solo/studio gate).

- [ ] **Step 1: Extend the course mapper**

In `mapCourseToComponentFormat` (use-course-detail.ts), add to the returned object:
```ts
instructorId: courseData.instructor_id ?? null,
instructorName: courseData.instructor_name ?? null,
```
(`instructor_id` exists on the `Course` row type after Task 2. `fetchCourseById` uses `select('*')` — verified `src/services/courses.ts:94` — so both columns arrive with no service change.)

- [ ] **Step 2: CoursePage state + hydration**

State (near line 253):
```tsx
const [settingsInstructor, setSettingsInstructor] = useState<InstructorRef | null>(null);
```
Import:
```tsx
import type { InstructorRef } from '@/components/teacher/InstructorField';
```
In the hydrate effect (after line 294 `setSettingsPrice(...)`):
```tsx
setSettingsInstructor(
  courseData.instructorId && courseData.instructorName
    ? { id: courseData.instructorId, name: courseData.instructorName }
    : null,
);
```
CoursePage already has the seller via `useAuth()` — if not, add `const { currentSeller } = useAuth();` (check existing imports first; it may already destructure it).

- [ ] **Step 3: Dirty check**

In `isSettingsDirty` (before the format branch):
```tsx
if ((settingsInstructor?.id ?? null) !== (courseData.instructorId ?? null)) return true;
```
Add `settingsInstructor` to the memo dependency array.

- [ ] **Step 4: Save path**

In `handleSave`'s `updateData` object (lines 458–470), add:
```tsx
instructor_id: settingsInstructor?.id ?? null,
instructor_name: settingsInstructor?.name ?? null,
```
(The RPC key-presence guard from Task 1 makes these authoritative on every save — always sending them is correct and clears the field when «Ingen» is picked.)
In the `setCourseData` mirror (lines 537–556), add:
```tsx
instructorId: settingsInstructor?.id ?? null,
instructorName: settingsInstructor?.name ?? null,
```

- [ ] **Step 5: CourseSettingsTab**

Add to `CourseSettingsTabProps`:
```tsx
/** Saved-instructor picker (studios only) — null sellerId hides the field. */
instructor: InstructorRef | null;
onInstructorChange: (v: InstructorRef | null) => void;
instructorSellerId: string | null;
```
Import `InstructorField, type InstructorRef` from `@/components/teacher/InstructorField`. In the general-info section, after the description field (match the surrounding Label/field markup):
```tsx
{instructorSellerId && (
  <div className="space-y-2">
    <Label htmlFor="settings-instructor">Instruktør (valgfritt)</Label>
    <InstructorField
      id="settings-instructor"
      sellerId={instructorSellerId}
      value={instructor}
      onChange={onInstructorChange}
    />
  </div>
)}
```
In CoursePage where `<CourseSettingsTab` is rendered (~line 1013), pass:
```tsx
instructor={settingsInstructor}
onInstructorChange={setSettingsInstructor}
instructorSellerId={currentSeller?.operating_model === 'studio' ? currentSeller.id : null}
```

- [ ] **Step 6: Typecheck + full test suite**

Run: `npx tsc --noEmit && npm run test:run`
Expected: exit 0; all existing vitest tests pass (none cover these files' UI, but `CoursePage.test.ts` imports from CoursePage — a broken export there fails the suite).

- [ ] **Step 7: Commit**

```bash
git add src/hooks/use-course-detail.ts src/pages/teacher/CoursePage.tsx src/components/teacher/CourseSettingsTab.tsx
git commit -m "feat: instructor picker in course settings with save + dirty tracking"
```

---

### Task 7: End-to-end verification

**Files:** none (verification only).

- [ ] **Step 1: Build**

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 2: Manual click-through against dev DB** (invoke the `verify` skill)

With `npm run dev`, as a studio seller:
1. «Nytt kurs» → add instructor «Testlærer» via «Legg til ny» → publish the course. The public course page shows the row «Instruktør — Testlærer»; the embed calendar line shows the name.
2. Course settings → change to «Ingen» → Lagre → public page row disappears.
3. Re-pick, then in «Administrer»: rename «Testlærer» → «Testlærer 2» → the course's public page shows the new name (rename propagation).
4. Delete the instructor in «Administrer» → existing course still shows «Testlærer 2» (name persists), picker selection cleared.
5. As a solo seller: no instructor field in either form.

- [ ] **Step 3: Report status**

Per CLAUDE.md the final report MUST state: migration `20260714100000_course_instructors.sql` is applied to dev and committed, but is NOT done until the branch merges and the file reaches `origin/main`; prod gets it via CI on merge.
