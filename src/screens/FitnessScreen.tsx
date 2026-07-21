import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Pressable,
  Share,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors as themeColors } from "../theme/colors";

/* ============================================================
   PALETTE — falls back to the MyBase dark theme if a key is
   missing from theme/colors.ts, so this screen never breaks.
   ============================================================ */
const c: any = themeColors as any;
const palette = {
  bg: c.bg ?? "#10121a",
  surface: c.surface ?? "#1a1d29",
  surface2: c.surface2 ?? "#21253373",
  border: c.border ?? "#2a2e3d",
  text: c.text ?? "#eae8f0",
  textDim: c.textDim ?? "#8b8ea3",
  fit: c.fit ?? "#ff7a45",
  fitDim: c.fitDim ?? "rgba(255,122,69,0.15)",
  green: c.green ?? "#3ddc8c",
  greenDim: "rgba(61,220,140,0.14)",
  danger: c.danger ?? "#ff5c72",
  dangerDim: "rgba(255,92,114,0.12)",
};

/* ============================================================
   TYPES
   ============================================================ */
type PlanItem = { name: string; target: string };
type SetEntry = { weight: number; reps: number };
type LogEntry = {
  date: string;
  day: string;
  exercise: string;
  sets: SetEntry[];
};
type SkipEntry = { date: string; day: string; exercise: string };
type FitnessData = {
  plan: Record<string, PlanItem[]>;
  logs: LogEntry[];
  skips: SkipEntry[];
};

/* ============================================================
   CONSTANTS — mirrors the HTML prototype exactly
   ============================================================ */
const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const MUSCLE_DAYS = DAYS.filter((d) => d !== "Sunday");

const DAY_MUSCLES: Record<string, string> = {
  Monday: "Chest + Triceps",
  Tuesday: "Back + Biceps",
  Wednesday: "Shoulders + Forearms",
  Thursday: "Back + Chest (Hypertrophy)",
  Friday: "Legs",
  Saturday: "Cardio + Core",
  Sunday: "Rest",
};

const DEFAULT_PLAN: Record<string, PlanItem[]> = {
  Monday: [
    { name: "Multi Press", target: "3 Sets" },
    { name: "Vertical Chest Press", target: "3 Sets" },
    { name: "Dual Axis Decline Bench", target: "3 Sets" },
    { name: "Dual Adjustable Pulley (Cable Fly)", target: "3 Sets" },
    { name: "Seated Tricep Dip", target: "3 Sets" },
    { name: "Dual Adjustable Pulley (Tricep Pushdown)", target: "3 Sets" },
    { name: "Abdominal Machine", target: "3 Sets" },
    { name: "Wrist Curl Machine", target: "3 Sets" },
  ],
  Tuesday: [
    { name: "Lat Pull Down", target: "3 Sets" },
    { name: "Linear Row", target: "3 Sets" },
    { name: "Long Pull Row", target: "3 Sets" },
    { name: "Assisted Dip Chin", target: "3 Sets" },
    { name: "Bicep Curl Machine", target: "3 Sets" },
    { name: "Dual Adjustable Pulley (Cable Curl)", target: "3 Sets" },
    { name: "Abdominal Machine", target: "3 Sets" },
    { name: "Wrist Curl Machine", target: "3 Sets" },
  ],
  Wednesday: [
    { name: "Overhead Press", target: "3 Sets" },
    { name: "Lateral Raise Machine", target: "3 Sets" },
    { name: "Standing Multi Flight", target: "3 Sets" },
    { name: "Pec Fly / Rear Delt (Rear Delt)", target: "3 Sets" },
    { name: "Wrist Curl Machine", target: "3 Sets" },
    { name: "Abdominal Machine", target: "3 Sets" },
  ],
  Thursday: [
    { name: "Smith Machine (Chest Press)", target: "3 Sets" },
    { name: "Vertical Chest Press", target: "3 Sets" },
    { name: "Lat Pull Down", target: "3 Sets" },
    { name: "Long Pull Row", target: "3 Sets" },
    { name: "Pec Fly", target: "3 Sets" },
    { name: "Back Extension", target: "3 Sets" },
    { name: "Abdominal Machine", target: "3 Sets" },
    { name: "Wrist Curl Machine", target: "3 Sets" },
  ],
  Friday: [
    { name: "Hack Squat", target: "3 Sets" },
    { name: "Leg Press", target: "3 Sets" },
    { name: "Leg Extension", target: "3 Sets" },
    { name: "Leg Curl", target: "3 Sets" },
    { name: "Abdominal Machine", target: "3 Sets" },
    { name: "Wrist Curl Machine", target: "3 Sets" },
  ],
  Saturday: [
    { name: "Treadmill (5–10 min Warm-up)", target: "3 Sets" },
    { name: "Functional Trainer (Core Exercises)", target: "3 Sets" },
    { name: "Abdominal Machine", target: "3 Sets" },
    { name: "Wrist Curl Machine", target: "3 Sets" },
    { name: "Treadmill / Cycle (20–30 min Cardio)", target: "3 Sets" },
  ],
  Sunday: [],
};

const STORAGE_KEY = "fitness-data";

// Approx width of one day-chip (minWidth 46 + marginRight 6 + a little breathing room)
const DAY_CHIP_STRIDE = 58;

/* ============================================================
   HELPERS
   ============================================================ */
function fmtDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function startOfToday() {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
}
function dayNameFor(date: Date) {
  const dow = date.getDay();
  return DAYS[dow === 0 ? 6 : dow - 1];
}
function isCardioExercise(name: string) {
  const n = (name || "").toLowerCase();
  return n.includes("treadmill") || n.includes("cycl");
}
function getWeekRange(offsetWeeks: number) {
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
function inWeekRange(dateStr: string, range: { start: Date; end: Date }) {
  const d = new Date(dateStr);
  return d >= range.start && d <= range.end;
}
function fmtSet(s: SetEntry, cardio: boolean) {
  return cardio ?
      `${s.weight}kcal × ${s.reps}min`
    : `${s.weight}kg × ${s.reps}`;
}

type SetDraft = { weight: string; reps: string };

export default function FitnessScreen() {
  const insets = useSafeAreaInsets();
  const [view, setView] = useState<"plan" | "analysis">("plan");
  const [loaded, setLoaded] = useState(false);
  const [data, setData] = useState<FitnessData>({
    plan: JSON.parse(JSON.stringify(DEFAULT_PLAN)),
    logs: [],
    skips: [],
  });

  const [selectedDate, setSelectedDate] = useState<Date>(startOfToday());
  const [selectedDay, setSelectedDay] = useState<string>(
    dayNameFor(startOfToday()),
  );
  const [newExerciseName, setNewExerciseName] = useState("");
  const [drafts, setDrafts] = useState<Record<string, SetDraft[]>>({});

  // Analysis view state
  const [muscleDay, setMuscleDay] = useState<string>(MUSCLE_DAYS[0]);
  const [exerciseSel, setExerciseSel] = useState<string>("");
  const [reportType, setReportType] = useState<"range" | "muscle">("range");
  const [reportRange, setReportRange] = useState<string>("30");
  const [reportMuscle, setReportMuscle] = useState<string>(MUSCLE_DAYS[0]);

  const dayPickerRef = useRef<ScrollView>(null);

  /* ---------- load / persist ---------- */
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          setData({
            plan: parsed.plan ?? JSON.parse(JSON.stringify(DEFAULT_PLAN)),
            logs: parsed.logs ?? [],
            skips: parsed.skips ?? [],
          });
        }
      } catch (e) {
        // ignore — fall back to defaults
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const persist = (next: FitnessData) => {
    setData(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  };

  const isSelectedToday = fmtDate(selectedDate) === fmtDate(startOfToday());

  /* ---------- day picker (current month) ---------- */
  const monthDays = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const arr: Date[] = [];
    for (let d = 1; d <= daysInMonth; d++) arr.push(new Date(year, month, d));
    return arr;
  }, [selectedDate.getFullYear(), selectedDate.getMonth()]);

  // Scrolls the day picker so the given date's chip is actually in view.
  const scrollDayPickerTo = (date: Date, animated: boolean) => {
    const idx = date.getDate() - 1;
    const x = Math.max(0, idx * DAY_CHIP_STRIDE - DAY_CHIP_STRIDE * 2);
    requestAnimationFrame(() => {
      dayPickerRef.current?.scrollTo({ x, animated });
    });
  };

  // On first load, make sure today's chip is scrolled into view and selected.
  useEffect(() => {
    if (loaded) {
      scrollDayPickerTo(startOfToday(), false);
    }
  }, [loaded]);

  const goToDate = (date: Date) => {
    setSelectedDate(date);
    setSelectedDay(dayNameFor(date));
  };

  const goToToday = () => {
    const t = startOfToday();
    setSelectedDate(t);
    setSelectedDay(dayNameFor(t));
    setView("plan");
    scrollDayPickerTo(t, true);
  };

  /* ---------- exercise list logic ---------- */
  const viewingDateStr = fmtDate(selectedDate);
  const todaysList = data.plan[selectedDay] || [];

  const logFor = (exerciseName: string) =>
    data.logs.find(
      (l) => l.exercise === exerciseName && l.date === viewingDateStr,
    );
  const skipFor = (exerciseName: string) =>
    data.skips.find(
      (s) => s.exercise === exerciseName && s.date === viewingDateStr,
    );
  const priorLogFor = (exerciseName: string) =>
    [...data.logs]
      .reverse()
      .find((l) => l.exercise === exerciseName && l.date !== viewingDateStr);

  const setCountFor = (exerciseName: string) =>
    isCardioExercise(exerciseName) ? 1 : 3;

  const getDraft = (exerciseName: string): SetDraft[] => {
    const existing = drafts[exerciseName];
    const count = setCountFor(exerciseName);
    if (existing && existing.length === count) return existing;
    return Array.from({ length: count }, () => ({ weight: "", reps: "" }));
  };

  const updateDraft = (
    exerciseName: string,
    idx: number,
    field: "weight" | "reps",
    value: string,
  ) => {
    setDrafts((prev) => {
      const cur = getDraft(exerciseName).slice();
      cur[idx] = { ...cur[idx], [field]: value };
      return { ...prev, [exerciseName]: cur };
    });
  };

  const handleLogSet = (exerciseName: string) => {
    if (!isSelectedToday) return;
    const draft = getDraft(exerciseName);
    const sets: SetEntry[] = draft
      .filter((d) => d.weight && d.reps)
      .map((d) => ({
        weight: parseFloat(d.weight),
        reps: parseInt(d.reps, 10),
      }));
    if (sets.length === 0) return;
    const entry: LogEntry = {
      date: viewingDateStr,
      day: selectedDay,
      exercise: exerciseName,
      sets,
    };
    persist({ ...data, logs: [...data.logs, entry] });
    setDrafts((prev) => ({ ...prev, [exerciseName]: undefined as any }));
  };

  const handleSkip = (exerciseName: string) => {
    if (!isSelectedToday) return;
    const entry: SkipEntry = {
      date: viewingDateStr,
      day: selectedDay,
      exercise: exerciseName,
    };
    persist({ ...data, skips: [...data.skips, entry] });
  };

  const handleAddExercise = () => {
    if (!isSelectedToday) return;
    const name = newExerciseName.trim();
    if (!name) return;
    const list = data.plan[selectedDay] ? [...data.plan[selectedDay]] : [];
    list.push({ name, target: "3 Sets" });
    persist({ ...data, plan: { ...data.plan, [selectedDay]: list } });
    setNewExerciseName("");
  };

  /* ---------- analysis: month stats ---------- */
  const monthStats = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = startOfToday();
    let attended = 0,
      absent = 0,
      missed = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      if (date > today) missed++;
      else {
        const hasLog = data.logs.some((l) => l.date === fmtDate(date));
        if (hasLog) attended++;
        else absent++;
      }
    }
    return { total: daysInMonth, attended, absent, missed };
  }, [data.logs]);

  /* ---------- analysis: weight progression ---------- */
  const loggedExerciseNames = useMemo(() => {
    const loggedNames = new Set(data.logs.map((l) => l.exercise));
    return [...new Set((data.plan[muscleDay] || []).map((ex) => ex.name))]
      .filter((n) => loggedNames.has(n))
      .sort((a, b) => a.localeCompare(b));
  }, [data.logs, data.plan, muscleDay]);

  useEffect(() => {
    if (!loggedExerciseNames.includes(exerciseSel)) {
      setExerciseSel(loggedExerciseNames[0] || "");
    }
  }, [loggedExerciseNames]);

  const weightSeries = useMemo(() => {
    return data.logs
      .filter((l) => l.exercise === exerciseSel)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [data.logs, exerciseSel]);

  const maxWeight = useMemo(() => {
    let max = 0;
    weightSeries.forEach((l) =>
      l.sets.forEach((s) => (max = Math.max(max, s.weight))),
    );
    return max || 1;
  }, [weightSeries]);

  /* ---------- analysis: week compare ---------- */
  const weekCompare = useMemo(() => {
    const logs = data.logs.filter((l) => l.exercise === exerciseSel);
    const thisWeekRange = getWeekRange(0);
    const prevWeekRange = getWeekRange(-1);
    const thisWeekLogs = logs
      .filter((l) => inWeekRange(l.date, thisWeekRange))
      .sort((a, b) => a.date.localeCompare(b.date));
    const prevWeekLogs = logs
      .filter((l) => inWeekRange(l.date, prevWeekRange))
      .sort((a, b) => a.date.localeCompare(b.date));
    return {
      thisWeek: thisWeekLogs[thisWeekLogs.length - 1],
      prevWeek: prevWeekLogs[prevWeekLogs.length - 1],
    };
  }, [data.logs, exerciseSel]);

  /* ---------- report generator ---------- */
  const generateReport = async () => {
    const cardio = isCardioExercise(exerciseSel);
    let lines: string[] = [];
    lines.push(`MyBase Fitness Report`);
    lines.push(`Generated: ${fmtDate(new Date())}`);
    lines.push("");

    if (reportType === "range") {
      const days = parseInt(reportRange, 10);
      const today = startOfToday();
      const dateStrs: string[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        dateStrs.push(fmtDate(d));
      }
      lines.push(`Range: Last ${days} days`);
      lines.push("");
      dateStrs.forEach((ds) => {
        const dayLogs = data.logs.filter((l) => l.date === ds);
        const daySkips = data.skips.filter((s) => s.date === ds);
        if (dayLogs.length === 0 && daySkips.length === 0) return;
        lines.push(`— ${ds} —`);
        dayLogs.forEach((l) => {
          const c = isCardioExercise(l.exercise);
          lines.push(
            `  ${l.exercise}: ${l.sets.map((s) => fmtSet(s, c)).join(", ")}`,
          );
        });
        daySkips.forEach((s) => lines.push(`  ${s.exercise}: Skipped`));
        lines.push("");
      });
    } else {
      lines.push(`Muscle group: ${DAY_MUSCLES[reportMuscle]}`);
      lines.push("");
      const names = new Set(
        (data.plan[reportMuscle] || []).map((ex) => ex.name),
      );
      const relevantLogs = data.logs
        .filter((l) => names.has(l.exercise))
        .sort((a, b) => a.date.localeCompare(b.date));
      if (relevantLogs.length === 0)
        lines.push("No logs yet for this muscle group.");
      relevantLogs.forEach((l) => {
        const c = isCardioExercise(l.exercise);
        lines.push(
          `${l.date} — ${l.exercise}: ${l.sets.map((s) => fmtSet(s, c)).join(", ")}`,
        );
      });
    }

    const report = lines.join("\n");
    try {
      await Share.share({ message: report, title: "Fitness Report" });
    } catch (e) {
      // user cancelled or share unavailable — no-op
    }
  };

  /* ============================================================
     RENDER
     ============================================================ */
  if (!loaded) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header — padded below the status bar / notch, tap to jump to today */}
      <Pressable
        style={[styles.header, { paddingTop: insets.top + 12 }]}
        onPress={goToToday}
      >
        <Text style={styles.eyebrow}>FITNESS</Text>
        <Text style={styles.headerTitle}>
          {view === "plan" ? `${selectedDay}'s Plan` : "Today's Plan"}
        </Text>
      </Pressable>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Subnav */}
        <View style={styles.subnavRow}>
          <TouchableOpacity
            style={[
              styles.subnavBtn,
              view === "plan" ? styles.subnavBtnActive : styles.subnavBtnGhost,
            ]}
            onPress={() => setView("plan")}
          >
            <Text
              style={[
                styles.subnavBtnText,
                view === "plan" && styles.subnavBtnTextActive,
              ]}
            >
              Plan & Log
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.subnavBtn,
              view === "analysis" ?
                styles.subnavBtnActive
              : styles.subnavBtnGhost,
            ]}
            onPress={() => setView("analysis")}
          >
            <Text
              style={[
                styles.subnavBtnText,
                view === "analysis" && styles.subnavBtnTextActive,
              ]}
            >
              Analysis
            </Text>
          </TouchableOpacity>
        </View>

        {view === "plan" ?
          <>
            {/* Day picker */}
            <ScrollView
              ref={dayPickerRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.dayPicker}
              contentContainerStyle={{ paddingRight: 8 }}
            >
              {monthDays.map((date) => {
                const dStr = fmtDate(date);
                const isActive = dStr === viewingDateStr;
                const isFuture = date > startOfToday();
                const attended = data.logs.some((l) => l.date === dStr);
                let chipStyle = styles.dayChip;
                let textStyle = styles.dayChipText;
                if (isFuture) {
                  chipStyle = { ...styles.dayChip, ...styles.dayChipFuture };
                } else if (attended) {
                  chipStyle = { ...styles.dayChip, ...styles.dayChipAttended };
                  textStyle = { ...styles.dayChipText, color: palette.green };
                } else {
                  chipStyle = { ...styles.dayChip, ...styles.dayChipAbsent };
                  textStyle = { ...styles.dayChipText, color: palette.danger };
                }
                if (isActive)
                  chipStyle = { ...chipStyle, ...styles.dayChipActive };
                return (
                  <TouchableOpacity
                    key={dStr}
                    style={chipStyle}
                    onPress={() => goToDate(date)}
                  >
                    <Text style={textStyle}>
                      {dayNameFor(date).slice(0, 3)}
                    </Text>
                    <Text style={styles.dayChipNum}>{date.getDate()}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Plan card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                {selectedDay}'s Plan — {DAY_MUSCLES[selectedDay]}
              </Text>
              <Text style={styles.cardSubDate}>
                {selectedDate.toLocaleDateString("en-US", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </Text>

              {!isSelectedToday && (
                <Text style={styles.readonlyNote}>
                  You can only log or edit today's workout — this is a read-only
                  preview of the plan.
                </Text>
              )}

              {todaysList.length === 0 ?
                <Text style={styles.emptyText}>Rest day.</Text>
              : todaysList.map((ex, i) => {
                  const log = logFor(ex.name);
                  const skip = skipFor(ex.name);
                  const isDone = !!log || !!skip;
                  const cardio = isCardioExercise(ex.name);
                  const prior = priorLogFor(ex.name);

                  let statusText: string;
                  if (log)
                    statusText = `Logged: ${log.sets.map((s) => fmtSet(s, cardio)).join(", ")}`;
                  else if (skip) statusText = "Skipped";
                  else if (prior)
                    statusText = `Last: ${prior.sets.map((s) => fmtSet(s, cardio)).join(", ")}`;
                  else statusText = "Not logged yet";

                  const draft = getDraft(ex.name);

                  return (
                    <View
                      key={`${ex.name}-${i}`}
                      style={[
                        styles.exerciseRow,
                        isDone && styles.exerciseRowDone,
                      ]}
                    >
                      <View style={styles.exerciseHeaderRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.exerciseName}>{ex.name}</Text>
                          <Text style={styles.exerciseStatus}>
                            {statusText}
                          </Text>
                        </View>
                      </View>

                      {isSelectedToday && !isDone && (
                        <>
                          {draft.map((d, si) => (
                            <View style={styles.setRow} key={si}>
                              <Text style={styles.setLabel}>Set {si + 1}</Text>
                              <TextInput
                                style={styles.setInput}
                                placeholder={cardio ? "kcal" : "kg"}
                                placeholderTextColor={palette.textDim}
                                keyboardType="numeric"
                                value={d.weight}
                                onChangeText={(v) =>
                                  updateDraft(ex.name, si, "weight", v)
                                }
                              />
                              <TextInput
                                style={styles.setInput}
                                placeholder={cardio ? "min" : "reps"}
                                placeholderTextColor={palette.textDim}
                                keyboardType="numeric"
                                value={d.reps}
                                onChangeText={(v) =>
                                  updateDraft(ex.name, si, "reps", v)
                                }
                              />
                            </View>
                          ))}
                          <View style={styles.actionRow}>
                            <TouchableOpacity
                              style={[styles.btn, styles.btnFit, { flex: 2 }]}
                              onPress={() => handleLogSet(ex.name)}
                            >
                              <Text style={styles.btnFitText}>
                                {cardio ? "Log Cardio" : "Log 3 Sets"}
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.btn, styles.btnGhost, { flex: 1 }]}
                              onPress={() => handleSkip(ex.name)}
                            >
                              <Text style={styles.btnGhostText}>Skip</Text>
                            </TouchableOpacity>
                          </View>
                        </>
                      )}
                    </View>
                  );
                })
              }

              {isSelectedToday && (
                <View style={styles.addRow}>
                  <TextInput
                    style={styles.addInput}
                    placeholder="Add exercise (e.g. Bench Press)"
                    placeholderTextColor={palette.textDim}
                    value={newExerciseName}
                    onChangeText={setNewExerciseName}
                    onSubmitEditing={handleAddExercise}
                    returnKeyType="done"
                  />
                  <TouchableOpacity
                    style={styles.addBtn}
                    onPress={handleAddExercise}
                    hitSlop={8}
                  >
                    <Text style={styles.addBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </>
        : <>
            {/* This Month */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>This Month</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statVal}>{monthStats.total}</Text>
                  <Text style={styles.statLbl}>Days in Month</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={[styles.statVal, { color: palette.green }]}>
                    {monthStats.attended}
                  </Text>
                  <Text style={styles.statLbl}>Attended</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={[styles.statVal, { color: palette.danger }]}>
                    {monthStats.absent}
                  </Text>
                  <Text style={styles.statLbl}>Absent</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={[styles.statVal, { color: palette.textDim }]}>
                    {monthStats.missed}
                  </Text>
                  <Text style={styles.statLbl}>Missed</Text>
                </View>
              </View>
            </View>

            {/* Weight Progression */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Weight Progression</Text>
              <Text style={styles.fieldLabel}>Select Muscle</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chipRow}
              >
                {MUSCLE_DAYS.map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[
                      styles.selectChip,
                      muscleDay === d && styles.selectChipActive,
                    ]}
                    onPress={() => setMuscleDay(d)}
                  >
                    <Text
                      style={[
                        styles.selectChipText,
                        muscleDay === d && styles.selectChipTextActive,
                      ]}
                    >
                      {DAY_MUSCLES[d]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.fieldLabel}>Select Machine</Text>
              {loggedExerciseNames.length === 0 ?
                <Text style={styles.emptyText}>
                  No logs yet for this muscle.
                </Text>
              : <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.chipRow}
                >
                  {loggedExerciseNames.map((n) => (
                    <TouchableOpacity
                      key={n}
                      style={[
                        styles.selectChip,
                        exerciseSel === n && styles.selectChipActive,
                      ]}
                      onPress={() => setExerciseSel(n)}
                    >
                      <Text
                        style={[
                          styles.selectChipText,
                          exerciseSel === n && styles.selectChipTextActive,
                        ]}
                      >
                        {n}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              }

              {weightSeries.length === 0 ?
                <Text style={styles.emptyText}>
                  No logs yet for this exercise.
                </Text>
              : <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.chartScroll}
                >
                  <View style={styles.chartRow}>
                    {weightSeries.map((l, idx) => {
                      const cardio = isCardioExercise(l.exercise);
                      const setColors = [palette.fit, "#7c6cf6", palette.green];
                      return (
                        <View key={idx} style={styles.chartCol}>
                          <View style={styles.chartBars}>
                            {l.sets.map((s, si) => (
                              <View
                                key={si}
                                style={[
                                  styles.chartBar,
                                  {
                                    height: Math.max(
                                      6,
                                      (s.weight / maxWeight) * 100,
                                    ),
                                    backgroundColor:
                                      setColors[si % setColors.length],
                                  },
                                ]}
                              />
                            ))}
                          </View>
                          <Text style={styles.chartDateLabel}>
                            {l.date.slice(5)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </ScrollView>
              }
            </View>

            {/* Week compare */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>This Week vs Previous Week</Text>
              {!weekCompare.thisWeek && !weekCompare.prevWeek ?
                <Text style={styles.emptyText}>
                  No logs yet for this exercise.
                </Text>
              : <View style={styles.table}>
                  <View style={[styles.tableRow, styles.tableHeaderRow]}>
                    <Text
                      style={[
                        styles.tableCell,
                        styles.tableHeaderText,
                        { flex: 0.8 },
                      ]}
                    >
                      Set
                    </Text>
                    <Text style={[styles.tableCell, styles.tableHeaderText]}>
                      This Week
                    </Text>
                    <Text style={[styles.tableCell, styles.tableHeaderText]}>
                      Previous Week
                    </Text>
                  </View>
                  {[0, 1, 2].map((s) => {
                    const cardio = isCardioExercise(exerciseSel);
                    const tw =
                      weekCompare.thisWeek?.sets[s] ?
                        fmtSet(weekCompare.thisWeek.sets[s], cardio)
                      : "–";
                    const pw =
                      weekCompare.prevWeek?.sets[s] ?
                        fmtSet(weekCompare.prevWeek.sets[s], cardio)
                      : "–";
                    return (
                      <View style={styles.tableRow} key={s}>
                        <Text style={[styles.tableCell, { flex: 0.8 }]}>
                          Set {s + 1}
                        </Text>
                        <Text style={styles.tableCell}>{tw}</Text>
                        <Text style={styles.tableCell}>{pw}</Text>
                      </View>
                    );
                  })}
                </View>
              }
            </View>

            {/* Report generator */}
            <View style={[styles.card, { marginBottom: 24 }]}>
              <Text style={styles.cardTitle}>Report Generator</Text>
              <Text style={styles.subText}>
                Share a day-wise report of your performed exercises and weights.
              </Text>

              <Text style={styles.fieldLabel}>Report Type</Text>
              <View style={styles.rowChips}>
                <TouchableOpacity
                  style={[
                    styles.selectChip,
                    reportType === "range" && styles.selectChipActive,
                  ]}
                  onPress={() => setReportType("range")}
                >
                  <Text
                    style={[
                      styles.selectChipText,
                      reportType === "range" && styles.selectChipTextActive,
                    ]}
                  >
                    By Range
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.selectChip,
                    reportType === "muscle" && styles.selectChipActive,
                  ]}
                  onPress={() => setReportType("muscle")}
                >
                  <Text
                    style={[
                      styles.selectChipText,
                      reportType === "muscle" && styles.selectChipTextActive,
                    ]}
                  >
                    By Muscle
                  </Text>
                </TouchableOpacity>
              </View>

              {reportType === "range" ?
                <>
                  <Text style={styles.fieldLabel}>Report Range</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.chipRow}
                  >
                    {["7", "15", "30", "60", "90"].map((r) => (
                      <TouchableOpacity
                        key={r}
                        style={[
                          styles.selectChip,
                          reportRange === r && styles.selectChipActive,
                        ]}
                        onPress={() => setReportRange(r)}
                      >
                        <Text
                          style={[
                            styles.selectChipText,
                            reportRange === r && styles.selectChipTextActive,
                          ]}
                        >
                          Last {r} Days
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              : <>
                  <Text style={styles.fieldLabel}>Select Muscle</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.chipRow}
                  >
                    {MUSCLE_DAYS.map((d) => (
                      <TouchableOpacity
                        key={d}
                        style={[
                          styles.selectChip,
                          reportMuscle === d && styles.selectChipActive,
                        ]}
                        onPress={() => setReportMuscle(d)}
                      >
                        <Text
                          style={[
                            styles.selectChipText,
                            reportMuscle === d && styles.selectChipTextActive,
                          ]}
                        >
                          {DAY_MUSCLES[d]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              }

              <TouchableOpacity
                style={[styles.btn, styles.btnFit, { marginTop: 12 }]}
                onPress={generateReport}
              >
                <Text style={styles.btnFitText}>Share Report</Text>
              </TouchableOpacity>
            </View>
          </>
        }
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ============================================================
   STYLES
   ============================================================ */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg },
  loadingText: { color: palette.text, textAlign: "center", marginTop: 40 },
  scrollContent: { padding: 16, paddingBottom: 40 },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    backgroundColor: palette.bg,
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: palette.textDim,
    fontWeight: "600",
    marginBottom: 2,
  },
  headerTitle: { fontSize: 22, fontWeight: "700", color: palette.text },

  subnavRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  subnavBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  subnavBtnActive: { backgroundColor: palette.fit, borderColor: palette.fit },
  subnavBtnGhost: {
    backgroundColor: "transparent",
    borderColor: palette.border,
  },
  subnavBtnText: { color: palette.textDim, fontWeight: "600", fontSize: 13.5 },
  subnavBtnTextActive: { color: "#10121a" },

  dayPicker: { marginBottom: 16 },
  dayChip: {
    flexShrink: 0,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 6,
    alignItems: "center",
    minWidth: 46,
  },
  dayChipActive: { borderWidth: 2, borderColor: palette.fit },
  dayChipAttended: {
    backgroundColor: palette.greenDim,
    borderColor: palette.green,
  },
  dayChipAbsent: {
    backgroundColor: palette.dangerDim,
    borderColor: palette.danger,
  },
  dayChipFuture: { opacity: 0.45 },
  dayChipText: { color: palette.textDim, fontWeight: "600", fontSize: 12 },
  dayChipNum: {
    color: palette.textDim,
    fontSize: 10,
    opacity: 0.8,
    marginTop: 1,
  },

  card: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: palette.text,
    marginBottom: 4,
  },
  cardSubDate: { fontSize: 12, color: palette.textDim, marginBottom: 10 },
  subText: {
    color: palette.textDim,
    fontSize: 12.5,
    marginBottom: 10,
    lineHeight: 18,
  },
  readonlyNote: {
    color: palette.textDim,
    fontSize: 12.5,
    marginBottom: 10,
    lineHeight: 18,
    fontStyle: "italic",
  },
  emptyText: { color: palette.textDim, fontSize: 13, paddingVertical: 8 },

  exerciseRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  exerciseRowDone: { opacity: 0.65 },
  exerciseHeaderRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  exerciseName: { fontWeight: "600", fontSize: 13.5, color: palette.text },
  exerciseStatus: { fontSize: 11.5, color: palette.textDim, marginTop: 2 },

  setRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  setLabel: { color: palette.textDim, fontSize: 11.5, width: 42 },
  setInput: {
    flex: 1,
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: palette.text,
    fontSize: 13,
  },

  actionRow: { flexDirection: "row", gap: 6, marginTop: 10 },
  btn: {
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  btnFit: { backgroundColor: palette.fit },
  btnFitText: { color: "#10121a", fontWeight: "700", fontSize: 13 },
  btnGhost: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: palette.border,
  },
  btnGhostText: { color: palette.textDim, fontWeight: "600", fontSize: 13 },

  addRow: { flexDirection: "row", gap: 6, marginTop: 12 },
  addInput: {
    flex: 1,
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: palette.text,
    fontSize: 13,
  },
  addBtn: {
    backgroundColor: palette.fit,
    borderRadius: 10,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnText: { color: "#10121a", fontWeight: "800", fontSize: 18 },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: {
    flexBasis: "47%",
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  statVal: { fontSize: 20, fontWeight: "800", color: palette.text },
  statLbl: { fontSize: 11, color: palette.textDim, marginTop: 4 },

  fieldLabel: {
    color: palette.textDim,
    fontSize: 11.5,
    fontWeight: "600",
    marginTop: 10,
    marginBottom: 6,
  },
  chipRow: { marginBottom: 4 },
  rowChips: { flexDirection: "row", gap: 8, marginBottom: 4 },
  selectChip: {
    flexShrink: 0,
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.border,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginRight: 8,
  },
  selectChipActive: {
    backgroundColor: palette.fitDim,
    borderColor: palette.fit,
  },
  selectChipText: { color: palette.textDim, fontSize: 12, fontWeight: "600" },
  selectChipTextActive: { color: palette.fit },

  chartScroll: { marginTop: 12 },
  chartRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 140,
    gap: 14,
    paddingHorizontal: 4,
  },
  chartCol: {
    alignItems: "center",
    justifyContent: "flex-end",
    height: "100%",
  },
  chartBars: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 3,
    height: 110,
  },
  chartBar: { width: 8, borderRadius: 3 },
  chartDateLabel: { color: palette.textDim, fontSize: 9.5, marginTop: 6 },

  table: {
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: palette.border,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  tableHeaderRow: { backgroundColor: palette.bg },
  tableHeaderText: { color: palette.textDim, fontWeight: "700", fontSize: 11 },
  tableCell: { flex: 1, padding: 10, color: palette.text, fontSize: 12 },
});
