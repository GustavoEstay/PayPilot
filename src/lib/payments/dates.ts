import type { DateRange } from "./types";

const DAY_MS = 86_400_000;

/** Last day covered by the simulated dataset. Fixed so data, tests and demos are deterministic. */
export const DATA_END_DATE = "2026-10-29";
export const DATA_DAYS = 60;

export function parseDay(day: string): number {
  return Date.parse(`${day}T00:00:00.000Z`);
}

export function formatDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(day: string, delta: number): string {
  return formatDay(parseDay(day) + delta * DAY_MS);
}

export function dayOf(isoTimestamp: string): string {
  return isoTimestamp.slice(0, 10);
}

export const DATA_START_DATE = addDays(DATA_END_DATE, -(DATA_DAYS - 1));

/** The last `days` days of the dataset, ending on `end` (inclusive). */
export function lastNDays(days: number, end: string = DATA_END_DATE): DateRange {
  return { from: addDays(end, -(days - 1)), to: end };
}

export function isDay(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parseDay(value));
}

export function daysBetween(range: DateRange): string[] {
  const out: string[] = [];
  for (let t = parseDay(range.from); t <= parseDay(range.to); t += DAY_MS) out.push(formatDay(t));
  return out;
}

export function inRange(day: string, range: DateRange): boolean {
  return day >= range.from && day <= range.to;
}

export function formatDayShort(day: string): string {
  return new Date(parseDay(day)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
