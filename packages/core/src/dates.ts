/**
 * Day-first date display — one shared formatter for web and mobile.
 *
 * Owner rule (07/11/26): dates show day-first (dd/mm/yy) everywhere, whatever
 * the phone's or browser's locale. `toLocaleDateString()` without an explicit
 * locale follows the device, so an Android phone set to en-US showed
 * 11/07/2026 for 7 November. These helpers never depend on the device locale:
 * they build the string from numeric parts themselves.
 *
 * - Date-only values ("2026-11-07", the shape meetings store) are calendar
 *   dates: formatted as-is, never shifted by a time zone.
 * - Timestamps (Date, or ISO strings with a time) are shown on the country's
 *   own clock — Africa/Nairobi unless a zone is given.
 */

export const DEFAULT_TIME_ZONE = 'Africa/Nairobi';

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_ONLY = /^(\d{4})-(\d{2})$/;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export interface DateParts {
  year: number;
  month: number; // 1–12
  day: number;
  hour: number;
  minute: number;
}

export interface DateFormatOptions {
  /** 'yy' → 07/11/26 (default), 'yyyy' → 07/11/2026. */
  year?: 'yy' | 'yyyy';
  /** IANA zone for timestamps. Ignored for date-only strings. */
  timeZone?: string;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Fixed offsets for the zones we serve, used only if the runtime lacks Intl time-zone data. */
const FALLBACK_OFFSET_MIN: Record<string, number> = {
  'Africa/Nairobi': 180,
  'Africa/Kampala': 180,
  'Africa/Dar_es_Salaam': 180,
  'Africa/Addis_Ababa': 180,
  'Africa/Kigali': 120,
  'Africa/Lagos': 60,
  'Africa/Accra': 0,
  UTC: 0,
};

function zonedParts(d: Date, timeZone: string): DateParts {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(d);
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
    const out = { year: get('year'), month: get('month'), day: get('day'), hour: get('hour') % 24, minute: get('minute') };
    if (Object.values(out).every((n) => Number.isFinite(n))) return out;
  } catch {
    /* fall through to the fixed offset */
  }
  const shifted = new Date(d.getTime() + (FALLBACK_OFFSET_MIN[timeZone] ?? 0) * 60_000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}

/**
 * Numeric parts of a date-only string, ISO timestamp or Date, or null when it
 * cannot be read. Date-only strings are not time-zone shifted.
 */
export function dateParts(value: string | Date | null | undefined, timeZone: string = DEFAULT_TIME_ZONE): DateParts | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'string') {
    const m = DATE_ONLY.exec(value.trim());
    if (m) {
      const year = Number(m[1]), month = Number(m[2]), day = Number(m[3]);
      const check = new Date(Date.UTC(year, month - 1, day));
      if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;
      return { year, month, day, hour: 0, minute: 0 };
    }
  }
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return null;
  return zonedParts(d, timeZone);
}

/** dd/mm/yy (or dd/mm/yyyy). Unreadable input returns `fallback` (default ''). */
export function formatDate(value: string | Date | null | undefined, opts: DateFormatOptions = {}, fallback = ''): string {
  const p = dateParts(value, opts.timeZone);
  if (!p) return fallback;
  const y = opts.year === 'yyyy' ? String(p.year) : pad(p.year % 100);
  return `${pad(p.day)}/${pad(p.month)}/${y}`;
}

/** dd/mm/yy HH:mm on the country's clock (24-hour). */
export function formatDateTime(value: string | Date | null | undefined, opts: DateFormatOptions = {}, fallback = ''): string {
  const p = dateParts(value, opts.timeZone);
  if (!p) return fallback;
  return `${formatDate(value, opts)} ${pad(p.hour)}:${pad(p.minute)}`;
}

/** English weekday of a date-only string ("2026-11-07" → "Saturday"), or ''. */
export function weekdayOf(isoDate: string): string {
  const p = dateParts(isoDate);
  if (!p || !DATE_ONLY.test(isoDate.trim())) return '';
  return WEEKDAYS[new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay()]!;
}

/** "2026-06" → "June 2026" (month-name labels are unambiguous in any locale). */
export function monthLabel(yearMonth: string): string {
  const m = MONTH_ONLY.exec(yearMonth.trim());
  if (!m) return '';
  const month = Number(m[2]);
  if (month < 1 || month > 12) return '';
  return `${MONTHS[month - 1]} ${m[1]}`;
}

/** Today's calendar date (yyyy-mm-dd) on the country's clock. */
export function todayIso(now: Date = new Date(), timeZone: string = DEFAULT_TIME_ZONE): string {
  const p = zonedParts(now, timeZone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}
