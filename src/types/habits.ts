export type HabitStatus = 'unknown' | 'x' | 'done';

export type HabitTask = {
  id: string;
  name: string;
  color: string;
};

// entries[dateKey][taskId] = status
export type HabitEntries = Record<string, Record<string, HabitStatus>>;