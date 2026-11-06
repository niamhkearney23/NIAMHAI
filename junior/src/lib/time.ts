// Time zone helpers. Everything is stored in UTC and shown in the lawyer's
// zone (Kuala Lumpur or Singapore, both UTC+8, no daylight saving), with a
// fixed locale so server and browser render the same text.

const LOCALE = "en-GB";

function partsIn(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute"), second: get("second") };
}

/** Offset of a zone from UTC at a given instant, in minutes. */
function offsetMinutes(date: Date, timeZone: string): number {
  const p = partsIn(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - date.getTime()) / 60000);
}

/** "2026-11-10T09:30" in a zone, as a UTC Date. */
export function zonedInputToUtc(value: string, timeZone: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m.map(Number);
  const guess = new Date(Date.UTC(y, mo - 1, d, h, mi));
  return new Date(guess.getTime() - offsetMinutes(guess, timeZone) * 60000);
}

/** A UTC instant as a datetime-local value in a zone. */
export function utcToZonedInput(iso: string | Date, timeZone: string): string {
  const p = partsIn(new Date(iso), timeZone);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/** Calendar date (YYYY-MM-DD) of an instant in a zone. */
export function zonedDateKey(iso: string | Date, timeZone: string): string {
  return utcToZonedInput(iso, timeZone).slice(0, 10);
}

export function formatDateTime(iso: string | Date, timeZone: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

/** "5 Nov, 9:00 am": for tight spaces. */
export function formatShort(iso: string | Date, timeZone: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone,
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

export function formatTime(iso: string | Date, timeZone: string): string {
  return new Intl.DateTimeFormat(LOCALE, { timeZone, hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(iso));
}

export function formatDate(iso: string | Date, timeZone: string): string {
  return new Intl.DateTimeFormat(LOCALE, { timeZone, day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
}

function addDaysToKey(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

/** Monday of the week containing a date key. */
export function mondayOf(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
  return addDaysToKey(key, -((weekday + 6) % 7));
}

export interface WeekDay {
  key: string;
  label: string;
  short: string;
  start: Date;
  end: Date;
}

/** The seven days of a week (Monday first) in a zone, with UTC bounds. */
export function weekDays(mondayKey: string, timeZone: string): WeekDay[] {
  return Array.from({ length: 7 }, (_, i) => {
    const key = addDaysToKey(mondayKey, i);
    const start = zonedInputToUtc(`${key}T00:00`, timeZone)!;
    const end = zonedInputToUtc(`${addDaysToKey(key, 1)}T00:00`, timeZone)!;
    const label = new Intl.DateTimeFormat(LOCALE, { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" }).format(
      new Date(`${key}T12:00:00Z`),
    );
    const short = new Intl.DateTimeFormat(LOCALE, { timeZone: "UTC", weekday: "short" }).format(new Date(`${key}T12:00:00Z`));
    return { key, label, short, start, end };
  });
}

export function shiftWeek(mondayKey: string, weeks: number): string {
  return addDaysToKey(mondayKey, weeks * 7);
}

export function isDateKey(value: string | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)));
}

/** Start of a window of `days` ending now, and of the window before it. */
export function rangeBounds(days: number | null): { since: Date | null; prevSince: Date | null } {
  if (!days) return { since: null, prevSince: null };
  const now = Date.now();
  return { since: new Date(now - days * 86400_000), prevSince: new Date(now - 2 * days * 86400_000) };
}
