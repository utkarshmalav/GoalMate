export const HABITS_COLORS = [
  { n: "green", v: "#3ddc8c" },
  { n: "yellow", v: "#f6c945" },
  { n: "blue", v: "#5aa6f7" },
  { n: "purple", v: "#b48bfa" },
  { n: "pink", v: "#f2769a" },
  { n: "orange", v: "#f7955a" },
];

export const MAX_DAYS_VIEW = 15;
export const ANALYSIS_DAYS = 90;

export function h_uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
