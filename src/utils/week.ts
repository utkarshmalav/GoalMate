export type WeekRange = { start: Date; end: Date };

export function getWeekRange(offsetWeeks: number): WeekRange {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday + offsetWeeks * 7);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { start: monday, end: sunday };
}

export function inWeekRange(dateStr: string, range: WeekRange): boolean {
  const d = new Date(dateStr);
  return d >= range.start && d <= range.end;
}
