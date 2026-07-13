/**
 * Canonical Norwegian (Bokmål) calendar labels — single source of truth.
 *
 * All arrays are **Sunday-first** to match JavaScript's `Date.getDay()`
 * (0 = søndag) and `getMonth()` (0 = januar), so index them directly:
 *   WEEKDAYS_LONG[date.getDay()]   // "mandag"
 *   MONTHS_LONG[date.getMonth()]   // "januar"
 *
 * NOTE: short weekday abbreviations are intentionally NOT centralized here —
 * the codebase uses three incompatible conventions (with/without a trailing
 * period, and one Monday-first ISO ordering in dateUtils), so a shared array
 * would silently misalign. Only the forms that are byte-identical everywhere
 * live here.
 */

export const WEEKDAYS_LONG = [
  'søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag',
] as const;

/** Recurring form ("på mandager"), Sunday-first. */
export const WEEKDAYS_PLURAL = [
  'søndager', 'mandager', 'tirsdager', 'onsdager', 'torsdager', 'fredager', 'lørdager',
] as const;

export const MONTHS_LONG = [
  'januar', 'februar', 'mars', 'april', 'mai', 'juni',
  'juli', 'august', 'september', 'oktober', 'november', 'desember',
] as const;

/** Three-letter, no trailing period ("jan", "des"). */
export const MONTHS_SHORT = [
  'jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des',
] as const;
