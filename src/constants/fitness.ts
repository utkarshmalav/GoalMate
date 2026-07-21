export type ExercisePlanItem = {
  name: string;
  target: string;
};

export type FitnessPlan = Record<string, ExercisePlanItem[]>;

export const DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export const DAY_MUSCLES: Record<string, string> = {
  Monday: 'Chest + Triceps',
  Tuesday: 'Back + Biceps',
  Wednesday: 'Shoulders + Forearms',
  Thursday: 'Back + Chest (Hypertrophy)',
  Friday: 'Legs',
  Saturday: 'Cardio + Core',
  Sunday: 'Rest',
};

export const MUSCLE_DAYS = DAYS.filter((d) => d !== 'Sunday');

export const DEFAULT_PLAN: FitnessPlan = {
  Monday: [
    { name: 'Multi Press', target: '3 Sets' },
    { name: 'Vertical Chest Press', target: '3 Sets' },
    { name: 'Dual Axis Decline Bench', target: '3 Sets' },
    { name: 'Dual Adjustable Pulley (Cable Fly)', target: '3 Sets' },
    { name: 'Seated Tricep Dip', target: '3 Sets' },
    { name: 'Dual Adjustable Pulley (Tricep Pushdown)', target: '3 Sets' },
    { name: 'Abdominal Machine', target: '3 Sets' },
    { name: 'Wrist Curl Machine', target: '3 Sets' },
  ],
  Tuesday: [
    { name: 'Lat Pull Down', target: '3 Sets' },
    { name: 'Linear Row', target: '3 Sets' },
    { name: 'Long Pull Row', target: '3 Sets' },
    { name: 'Assisted Dip Chin', target: '3 Sets' },
    { name: 'Bicep Curl Machine', target: '3 Sets' },
    { name: 'Dual Adjustable Pulley (Cable Curl)', target: '3 Sets' },
    { name: 'Abdominal Machine', target: '3 Sets' },
    { name: 'Wrist Curl Machine', target: '3 Sets' },
  ],
  Wednesday: [
    { name: 'Overhead Press', target: '3 Sets' },
    { name: 'Lateral Raise Machine', target: '3 Sets' },
    { name: 'Standing Multi Flight', target: '3 Sets' },
    { name: 'Pec Fly / Rear Delt (Rear Delt)', target: '3 Sets' },
    { name: 'Wrist Curl Machine', target: '3 Sets' },
    { name: 'Abdominal Machine', target: '3 Sets' },
  ],
  Thursday: [
    { name: 'Smith Machine (Chest Press)', target: '3 Sets' },
    { name: 'Vertical Chest Press', target: '3 Sets' },
    { name: 'Lat Pull Down', target: '3 Sets' },
    { name: 'Long Pull Row', target: '3 Sets' },
    { name: 'Pec Fly', target: '3 Sets' },
    { name: 'Back Extension', target: '3 Sets' },
    { name: 'Abdominal Machine', target: '3 Sets' },
    { name: 'Wrist Curl Machine', target: '3 Sets' },
  ],
  Friday: [
    { name: 'Hack Squat', target: '3 Sets' },
    { name: 'Leg Press', target: '3 Sets' },
    { name: 'Leg Extension', target: '3 Sets' },
    { name: 'Leg Curl', target: '3 Sets' },
    { name: 'Abdominal Machine', target: '3 Sets' },
    { name: 'Wrist Curl Machine', target: '3 Sets' },
  ],
  Saturday: [
    { name: 'Treadmill (5–10 min Warm-up)', target: '3 Sets' },
    { name: 'Functional Trainer (Core Exercises)', target: '3 Sets' },
    { name: 'Abdominal Machine', target: '3 Sets' },
    { name: 'Wrist Curl Machine', target: '3 Sets' },
    { name: 'Treadmill / Cycle (20–30 min Cardio)', target: '3 Sets' },
  ],
  Sunday: [],
};

export function isCardioExercise(name: string): boolean {
  const n = (name || '').toLowerCase();
  return n.includes('treadmill') || n.includes('cycl');
}