/**
 * Calculate end time from start time and duration in minutes.
 */
export function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, mins] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + mins + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMins = totalMinutes % 60;
  return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
}

/**
 * Format time to HH:MM (strip seconds if present).
 */
export function formatTime(time: string): string {
  const parts = time.split(':');
  return `${parts[0]}:${parts[1]}`;
}

/**
 * Calculate CSS top/height/left/width for an event within the time grid.
 * Grid shows 06:00-22:00 at 100px per hour. Overlapping events are laid
 * out side-by-side by sharing the column width.
 */
export const PX_PER_HOUR = 60;
const OUTER_PX = 6;
const GAP_PX = 4;

export function getEventStyle(
  startTime: string,
  endTime: string,
  columnIndex = 0,
  columnCount = 1,
): { top: string; height: string; left: string; width: string } {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  const clampedStartHour = Math.max(startHour, 6);
  const clampedStartMin = startHour < 6 ? 0 : startMin;
  const clampedEndHour = Math.min(endHour, 23);
  const clampedEndMin = endHour >= 23 ? 0 : endMin;

  const startOffset = (clampedStartHour - 6) * PX_PER_HOUR + (clampedStartMin / 60) * PX_PER_HOUR;
  const endOffset = (clampedEndHour - 6) * PX_PER_HOUR + (clampedEndMin / 60) * PX_PER_HOUR;
  const duration = Math.max(endOffset - startOffset, 20);

  const extraPx = OUTER_PX * 2 + GAP_PX * (columnCount - 1);
  const columnWidth = `((100% - ${extraPx}px) / ${columnCount})`;
  const width = `calc(${columnWidth})`;
  const left =
    columnCount === 1
      ? `${OUTER_PX}px`
      : `calc(${OUTER_PX}px + ${columnIndex} * (${columnWidth} + ${GAP_PX}px))`;

  return {
    top: `${Math.max(startOffset, 0)}px`,
    height: `${duration}px`,
    left,
    width,
  };
}

/**
 * Assign each event a column index and the total number of columns needed
 * for its overlap cluster, using the standard day-view packing algorithm.
 */
export function layoutOverlappingEvents<E extends { id: string; startTime: string; endTime: string }>(
  events: E[],
): Map<string, { columnIndex: number; columnCount: number }> {
  const layout = new Map<string, { columnIndex: number; columnCount: number }>();
  if (events.length === 0) return layout;

  const sorted = [...events].sort((a, b) => {
    if (a.startTime !== b.startTime) return a.startTime.localeCompare(b.startTime);
    return b.endTime.localeCompare(a.endTime);
  });

  let cluster: E[] = [];
  let columns: E[][] = [];
  let clusterEnd = '';

  const flush = () => {
    const count = Math.max(columns.length, 1);
    for (const event of cluster) {
      const entry = layout.get(event.id);
      if (entry) entry.columnCount = count;
    }
    cluster = [];
    columns = [];
    clusterEnd = '';
  };

  for (const event of sorted) {
    if (cluster.length > 0 && event.startTime >= clusterEnd) {
      flush();
    }

    let placed = false;
    for (let i = 0; i < columns.length; i++) {
      const col = columns[i];
      const last = col[col.length - 1];
      if (last.endTime <= event.startTime) {
        col.push(event);
        layout.set(event.id, { columnIndex: i, columnCount: 0 });
        placed = true;
        break;
      }
    }
    if (!placed) {
      columns.push([event]);
      layout.set(event.id, { columnIndex: columns.length - 1, columnCount: 0 });
    }

    cluster.push(event);
    if (event.endTime > clusterEnd) clusterEnd = event.endTime;
  }

  flush();
  return layout;
}
