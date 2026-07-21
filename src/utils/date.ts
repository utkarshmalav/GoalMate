export const DAYS_ORDER = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export function fmtDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export function getTodayName(): string {
  const dow = new Date().getDay();
  return DAYS_ORDER[dow === 0 ? 6 : dow - 1];
}

export function dayNameFromDate(d: Date): string {
  const dow = d.getDay();
  return DAYS_ORDER[dow === 0 ? 6 : dow - 1];
}

export function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}
