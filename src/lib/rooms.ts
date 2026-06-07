// ---------------------------------------------------------------------------
// Rooms — a teacher_location's rooms are stored as jsonb: an array of
// { name, capacity }. Capacity is optional (null = unset) and, when set, is
// used to pre-fill a course's Plasser when the room is selected.
//
// The DB column is typed as `Json`, so reads go through parseRooms() which
// coerces defensively (and tolerates legacy bare-string rows just in case).
// ---------------------------------------------------------------------------

export type Room = { name: string; capacity: number | null }

// Joins a venue name and a room name into one location value ("Venue – Room").
// Shared between the location picker (write) and the public card (read) so the
// split/join stay in sync.
export const LOCATION_VALUE_SEPARATOR = ' – '

export function parseRooms(value: unknown): Room[] {
  if (!Array.isArray(value)) return []
  const rooms: Room[] = []
  for (const entry of value) {
    if (typeof entry === 'string') {
      rooms.push({ name: entry, capacity: null })
    } else if (entry && typeof entry === 'object') {
      const name = (entry as { name?: unknown }).name
      if (typeof name !== 'string') continue
      const capacity = (entry as { capacity?: unknown }).capacity
      rooms.push({
        name,
        capacity: typeof capacity === 'number' ? capacity : null,
      })
    }
  }
  return rooms
}

export function roomCapacity(rooms: Room[], name: string): number | null {
  return rooms.find((room) => room.name === name)?.capacity ?? null
}
