export type SetEntry = {
  weight: number;
  reps: number;
};

export type LogEntry = {
  date: string; // yyyy-mm-dd
  day: string;
  exercise: string;
  sets: SetEntry[];
};

export type SkipEntry = {
  date: string; // yyyy-mm-dd
  day: string;
  exercise: string;
};

export type FitnessData = {
  logs: LogEntry[];
  skips: SkipEntry[];
};