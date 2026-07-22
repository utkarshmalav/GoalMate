import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import {
  DAYS,
  DAY_MUSCLES,
  DEFAULT_PLAN,
  isCardioExercise,
} from "../constants/fitness";
import { fmtDate, dayNameFromDate } from "./date";
import { FitnessData } from "../types/fitness";

const EXERCISE_TIPS = [
  "Focus on controlled form over heavy weight.",
  "Keep your core braced throughout the movement.",
  "Breathe out on exertion, in on release.",
  "Warm up the muscle group before adding load.",
  "Increase weight gradually — aim for small jumps.",
  "Rest 60-90 seconds between sets for strength gains.",
  "Full range of motion beats partial reps.",
  "Keep shoulders back and chest up.",
  "Avoid locking out joints aggressively at the top.",
  "Stay hydrated and stretch after the session.",
];

function getExerciseTip(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = (hash + name.charCodeAt(i)) % EXERCISE_TIPS.length;
  return EXERCISE_TIPS[hash];
}

function getReportDateRange(days: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - (days - 1));
  return { start, end: today };
}

function getAllTimeRange(data: FitnessData) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const allDates = [
    ...data.logs.map((l) => l.date),
    ...data.skips.map((s) => s.date),
  ].sort();
  const start = allDates.length ? new Date(allDates[0]) : new Date(today);
  start.setHours(0, 0, 0, 0);
  return { start, end: today };
}

export type ReportOptions =
  | { type: "range"; days: number }
  | { type: "muscle"; day: string };

export async function generateFitnessReport(
  data: FitnessData,
  options: ReportOptions,
) {
  let start: Date, end: Date, rangeLabel: string, targetDays: string[];

  if (options.type === "muscle") {
    ({ start, end } = getAllTimeRange(data));
    rangeLabel = `${options.day} – ${DAY_MUSCLES[options.day]}`;
    targetDays = [options.day];
  } else {
    ({ start, end } = getReportDateRange(options.days));
    rangeLabel = `Last ${options.days} Days`;
    targetDays = DAYS;
  }

  let tablesHtml = "";

  targetDays.forEach((day) => {
    const exercises = DEFAULT_PLAN[day] || [];
    if (exercises.length === 0) return;

    const dayDates: string[] = [];
    const d = new Date(start);
    while (d <= end) {
      if (dayNameFromDate(d) === day) dayDates.push(fmtDate(d));
      d.setDate(d.getDate() + 1);
    }
    if (dayDates.length === 0) return;

    const headerCells = dayDates
      .map((ds) => `<th>${ds.slice(5)}</th>`)
      .join("");
    const rows = exercises
      .map((ex) => {
        const cardio = isCardioExercise(ex.name);
        const cells = dayDates
          .map((ds) => {
            const logEntry = data.logs.find(
              (l) => l.exercise === ex.name && l.date === ds,
            );
            const skipEntry = data.skips.find(
              (s) => s.exercise === ex.name && s.date === ds,
            );
            if (logEntry) {
              const txt = logEntry.sets
                .map((s) =>
                  cardio ?
                    `${s.weight}kcal×${s.reps}min`
                  : `${s.weight}kg×${s.reps}`,
                )
                .join("<br/>");
              return `<td>${txt}</td>`;
            }
            if (skipEntry) return `<td class="skip">Skipped</td>`;
            return `<td>–</td>`;
          })
          .join("");
        return `<tr><td class="exname">${ex.name}</td>${cells}<td class="tip">${getExerciseTip(
          ex.name,
        )}</td></tr>`;
      })
      .join("");

    tablesHtml += `
      <h3>${day} — ${DAY_MUSCLES[day]}</h3>
      <table>
        <thead><tr><th>Exercise</th>${headerCells}<th>Tip</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  });

  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, Helvetica, Arial, sans-serif; padding: 24px; color: #10121a; }
          h1 { font-size: 20px; margin-bottom: 4px; }
          .sub { color: #555; font-size: 11px; margin-bottom: 16px; }
          h3 { font-size: 13px; margin-top: 20px; margin-bottom: 6px; }
          table { border-collapse: collapse; width: 100%; margin-bottom: 10px; }
          th, td { border: 1px solid #ccc; padding: 5px 7px; font-size: 9.5px; text-align: left; }
          th { background: #f2f2f2; }
          .exname { font-weight: 600; }
          .tip { color: #666; font-style: italic; max-width: 160px; }
          .skip { color: #b33; }
        </style>
      </head>
      <body>
        <h1>Fitness Report</h1>
        <div class="sub">Range: ${rangeLabel} (${fmtDate(start)} to ${fmtDate(end)})</div>
        ${tablesHtml || "<p>No data available for this range.</p>"}
      </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: "Fitness Report",
    });
  }
  return uri;
}
