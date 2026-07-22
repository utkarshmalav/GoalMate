import { HabitEntries, HabitStatus } from "../types/habits";
import { fmtDate, startOfDay } from "./date";

export const H_DOW = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

export function h_addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

// list of `n` days, today first, going backward
export function h_dayList(n: number): Date[] {
  const t = startOfDay(new Date());
  const out: Date[] = [];
  for (let i = 0; i < n; i++) out.push(h_addDays(t, -i));
  return out;
}

export function getHabitStatus(
  entries: HabitEntries,
  dateKey: string,
  taskId: string,
): HabitStatus {
  const day = entries[dateKey];
  if (!day) return "unknown";
  return day[taskId] || "unknown";
}

export function setHabitStatus(
  entries: HabitEntries,
  dateKey: string,
  taskId: string,
  val: HabitStatus,
): HabitEntries {
  const next: HabitEntries = {
    ...entries,
    [dateKey]: { ...(entries[dateKey] || {}) },
  };
  if (val === "unknown") {
    delete next[dateKey][taskId];
  } else {
    next[dateKey][taskId] = val;
  }
  return next;
}

export function computeHabitStreaks(
  entries: HabitEntries,
  taskId: string,
  lookbackDays: number,
): { current: number; best: number } {
  const days = h_dayList(lookbackDays);

  let current = 0;
  const offset =
    getHabitStatus(entries, fmtDate(days[0]), taskId) === "unknown" ? 1 : 0;
  for (let j = offset; j < days.length; j++) {
    const st = getHabitStatus(entries, fmtDate(days[j]), taskId);
    if (st === "done") current++;
    else break;
  }

  const chronological = [...days].reverse();
  let best = 0;
  let run = 0;
  for (const d of chronological) {
    const st = getHabitStatus(entries, fmtDate(d), taskId);
    if (st === "done") {
      run++;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
  }

  return { current, best };
}
