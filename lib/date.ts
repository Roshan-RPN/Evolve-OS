export function todayISO(): string {
  const tz = process.env.APP_TIMEZONE || "UTC";
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date());
}

export function tzNow(): Date {
  const tz = process.env.APP_TIMEZONE || "UTC";
  return new Date(new Date().toLocaleString("en-US", { timeZone: tz }));
}

export function greeting(): string {
  const h = tzNow().getHours();
  if (h < 5) return "Still up";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 22) return "Good evening";
  return "Winding down";
}

export function prettyToday(): string {
  const tz = process.env.APP_TIMEZONE || "UTC";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

// ---- Goal-planning period keys (tz-aware) ----

function isoWeekOf(d: Date): { year: number; week: number } {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7; // Mon=0..Sun=6
  date.setUTCDate(date.getUTCDate() - dayNum + 3); // nearest Thursday
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week =
    1 +
    Math.round(
      ((date.getTime() - firstThursday.getTime()) / 86_400_000 -
        3 +
        ((firstThursday.getUTCDay() + 6) % 7)) /
        7
    );
  return { year: date.getUTCFullYear(), week };
}

/** '2029' — the horizon three years out (target for the 3-year vision). */
export function periodThreeYear(): string {
  return String(tzNow().getFullYear() + 3);
}

/** '2026' — current calendar year. */
export function periodYear(): string {
  return String(tzNow().getFullYear());
}

/** '2026-07' — current month. */
export function periodMonth(): string {
  const d = tzNow();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** '2026-W27' — current ISO week. */
export function periodWeek(): string {
  const { year, week } = isoWeekOf(tzNow());
  return `${year}-W${String(week).padStart(2, "0")}`;
}

/** Human label for a month period key like '2026-07' → 'July 2026'. */
export function prettyMonth(period: string): string {
  const [y, m] = period.split("-").map(Number);
  if (!y || !m) return period;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Shift an ISO date (YYYY-MM-DD) by a number of days. */
export function shiftISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/** Human label for any ISO date, e.g. 'Wednesday, July 1'. */
export function prettyISO(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

// ---- Period navigation (UTC math, no tz/env) ----

/** Monday (UTC) of a given ISO week. */
function mondayOfISOWeek(year: number, week: number): Date {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Dow = (jan4.getUTCDay() + 6) % 7; // Mon=0
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - jan4Dow + (week - 1) * 7);
  return monday;
}

/** ISO week key ('2026-W27') for a UTC date. */
function isoWeekKeyUTC(d: Date): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3); // nearest Thursday
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week =
    1 +
    Math.round(
      ((date.getTime() - firstThursday.getTime()) / 86_400_000 -
        3 +
        ((firstThursday.getUTCDay() + 6) % 7)) /
        7
    );
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** ISO week key ('2026-W27') for an ISO date string. */
export function weekKeyOf(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return isoWeekKeyUTC(new Date(Date.UTC(y, m - 1, d)));
}

/** All ISO dates of a month period key ('2026-07' → ['2026-07-01' … '2026-07-31']). */
export function monthDates(period: string): string[] {
  const [y, m] = period.split("-").map(Number);
  if (!y || !m) return [];
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Array.from({ length: last }, (_, i) => `${period}-${String(i + 1).padStart(2, "0")}`);
}

/** Shift a month period key ('2026-07') by n months. */
export function shiftMonthPeriod(period: string, n: number): string {
  const [y, mo] = period.split("-").map(Number);
  if (!y || !mo) return period;
  const d = new Date(Date.UTC(y, mo - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Shift an ISO week period key ('2026-W27') by n weeks (year boundaries safe). */
export function shiftWeekPeriod(period: string, n: number): string {
  const m = period.match(/^(\d{4})-W(\d{2})$/);
  if (!m) return period;
  const monday = mondayOfISOWeek(Number(m[1]), Number(m[2]));
  monday.setUTCDate(monday.getUTCDate() + n * 7);
  return isoWeekKeyUTC(monday);
}

/** Range label for a week period, e.g. 'Jul 1 – Jul 7'. */
export function prettyWeek(period: string): string {
  const m = period.match(/^(\d{4})-W(\d{2})$/);
  if (!m) return period;
  const monday = mondayOfISOWeek(Number(m[1]), Number(m[2]));
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const fmt = (dt: Date) =>
    dt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  return `${fmt(monday)} – ${fmt(sunday)}`;
}

/** The 7 dates (Mon..Sun) of a week period key, with short weekday labels. */
export function weekDates(
  period: string
): { dayIndex: number; date: string; weekday: string }[] {
  const m = period.match(/^(\d{4})-W(\d{2})$/);
  const monday = m
    ? mondayOfISOWeek(Number(m[1]), Number(m[2]))
    : mondayOfISOWeek(tzNow().getFullYear(), 1);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    return {
      dayIndex: i,
      date: d.toISOString().slice(0, 10),
      weekday: d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }),
    };
  });
}

/** 12 month period keys for a calendar year: ['2026-01' … '2026-12']. */
export function monthPeriodsForYear(year: string): string[] {
  return Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
}

/** Short month label from a month period key, e.g. '2026-03' → 'Mar'. */
export function shortMonth(period: string): string {
  const [y, m] = period.split("-").map(Number);
  if (!y || !m) return period;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", {
    month: "short",
    timeZone: "UTC",
  });
}

export function isCurrentMonth(period: string): boolean {
  return period === periodMonth();
}
export function isCurrentWeek(period: string): boolean {
  return period === periodWeek();
}
export function isPastMonth(period: string): boolean {
  return period < periodMonth();
}
export function isPastWeek(period: string): boolean {
  return period < periodWeek();
}

/** 'Today' / 'Yesterday' / else full weekday date. */
export function relativeDayLabel(iso: string, today: string): string {
  if (iso === today) return "Today";
  if (iso === shiftISO(today, -1)) return "Yesterday";
  return prettyISO(iso);
}

export function daysAgoISO(days: number): string {
  const tz = process.env.APP_TIMEZONE || "UTC";
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(d);
}
