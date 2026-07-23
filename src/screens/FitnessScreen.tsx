import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Alert,
} from "react-native";
import { colors } from "../theme/colors";
import { loadData, saveData } from "../storage/storage";
import {
  DAYS,
  DAY_MUSCLES,
  DEFAULT_PLAN,
  MUSCLE_DAYS,
  isCardioExercise,
} from "../constants/fitness";
import {
  fmtDate,
  getTodayName,
  dayNameFromDate,
  startOfDay,
} from "../utils/date";
import { getWeekRange, inWeekRange } from "../utils/week";
import { generateFitnessReport } from "../utils/fitnessReport";
import { FitnessData, SetEntry } from "../types/fitness";
import MultiLineChart from "../components/MultiLineChart";

const EMPTY_DATA: FitnessData = { logs: [], skips: [] };

const DAY_BTN_WIDTH = 54;
const DAY_BTN_MARGIN = 6;
const SCREEN_WIDTH = Dimensions.get("window").width;

const SET_COLORS = [colors.study, colors.fit, colors.money];

type FitnessView = "plan" | "analysis";

export default function FitnessScreen() {
  const insets = useSafeAreaInsets();
  const [view, setView] = useState<FitnessView>("plan");
  const [data, setData] = useState<FitnessData>(EMPTY_DATA);
  const [loaded, setLoaded] = useState(false);

  const [selectedDate, setSelectedDate] = useState<Date>(
    startOfDay(new Date()),
  );
  const [currentDay, setCurrentDay] = useState<string>(getTodayName());

  const [setInputs, setSetInputs] = useState<
    Record<string, { weight: string; reps: string }>
  >({});

  const dayScrollRef = useRef<ScrollView>(null);

  // ---- Analysis view state ----
  const [muscleDay, setMuscleDay] = useState<string>(MUSCLE_DAYS[0]);
  const [exerciseName, setExerciseName] = useState<string>("");
  const [reportType, setReportType] = useState<"range" | "muscle">("range");
  const [reportRangeDays, setReportRangeDays] = useState<number>(7);
  const [reportMuscleDay, setReportMuscleDay] = useState<string>(
    MUSCLE_DAYS[0],
  );
  const [generatingReport, setGeneratingReport] = useState(false);

  useEffect(() => {
    (async () => {
      const stored = await loadData<FitnessData>("fitness-data", EMPTY_DATA);
      if (!stored.logs) stored.logs = [];
      if (!stored.skips) stored.skips = [];
      setData(stored);
      setLoaded(true);
    })();
  }, []);

  const persist = useCallback((next: FitnessData) => {
    setData(next);
    saveData("fitness-data", next);
  }, []);

  const isSelectedToday = useMemo(() => {
    // ==================== TESTING MODE ====================
    // Original production behavior (restricts logging/skipping to
    // today's date only). Commented out for testing purposes so any
    // day can be logged. To revert after testing: delete the
    // "return true" line below and uncomment the line above it.
    // return fmtDate(selectedDate) === fmtDate(startOfDay(new Date()));
    return true; // TESTING ONLY: allows logging/skipping on any selected day
    // ========================================================
  }, [selectedDate]);

  const centerOnToday = useCallback(() => {
    const today = startOfDay(new Date());
    const todayIndex = today.getDate() - 1;
    const buttonSlot = DAY_BTN_WIDTH + DAY_BTN_MARGIN;
    const offset = Math.max(
      0,
      todayIndex * buttonSlot - SCREEN_WIDTH / 2 + buttonSlot / 2,
    );
    setTimeout(() => {
      dayScrollRef.current?.scrollTo({ x: offset, animated: true });
    }, 50);
  }, []);

  function goToTodaysPlan() {
    setView("plan");
    const today = startOfDay(new Date());
    setSelectedDate(today);
    setCurrentDay(getTodayName());
    setSetInputs({});
    centerOnToday();
  }

  const monthDays = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = startOfDay(new Date());
    const list: {
      date: Date;
      dayName: string;
      status: "attended" | "absent" | "future";
    }[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const dayName = dayNameFromDate(date);
      let status: "attended" | "absent" | "future";
      if (date > today) {
        status = "future";
      } else {
        const dStr = fmtDate(date);
        const attended = data.logs.some((l) => l.date === dStr);
        status = attended ? "attended" : "absent";
      }
      list.push({ date, dayName, status });
    }
    return list;
  }, [selectedDate, data.logs]);

  const monthKey = `${selectedDate.getFullYear()}-${selectedDate.getMonth()}`;
  useEffect(() => {
    if (!loaded) return;
    centerOnToday();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, monthKey]);

  function selectDate(date: Date) {
    setSelectedDate(date);
    setCurrentDay(dayNameFromDate(date));
    setSetInputs({});
  }

  const exercises = DEFAULT_PLAN[currentDay] || [];
  const viewingDateStr = fmtDate(selectedDate);
  const todayStr = fmtDate(startOfDay(new Date()));

  function getInput(key: string) {
    return setInputs[key] || { weight: "", reps: "" };
  }

  function updateInput(key: string, field: "weight" | "reps", value: string) {
    setSetInputs((prev) => ({
      ...prev,
      [key]: { ...getInput(key), [field]: value },
    }));
  }

  function logSet(exIndex: number, name: string) {
    if (!isSelectedToday) return;
    const cardio = isCardioExercise(name);
    const setCount = cardio ? 1 : 3;
    const sets: SetEntry[] = [];
    for (let s = 0; s < setCount; s++) {
      const { weight, reps } = getInput(`${exIndex}-${s}`);
      if (weight && reps) {
        sets.push({ weight: parseFloat(weight), reps: parseInt(reps, 10) });
      }
    }
    if (sets.length === 0) return;

    const next: FitnessData = {
      ...data,
      logs: [
        ...data.logs,
        { date: viewingDateStr, day: currentDay, exercise: name, sets },
      ],
    };
    persist(next);
    setSetInputs({});
  }

  function skipExercise(name: string) {
    if (!isSelectedToday) return;
    const next: FitnessData = {
      ...data,
      skips: [
        ...data.skips,
        { date: viewingDateStr, day: currentDay, exercise: name },
      ],
    };
    persist(next);
  }

  // ================= ANALYSIS: MONTH STATS =================
  const monthStats = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = startOfDay(now);

    let attended = 0,
      absent = 0,
      missed = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      if (date > today) {
        missed++;
      } else {
        const dStr = fmtDate(date);
        const hasLog = data.logs.some((l) => l.date === dStr);
        if (hasLog) attended++;
        else absent++;
      }
    }
    return { daysInMonth, attended, absent, missed };
  }, [data.logs]);

  // ================= ANALYSIS: EXERCISE OPTIONS FOR SELECTED MUSCLE =================
  const exerciseOptions = useMemo(() => {
    const loggedNames = new Set(data.logs.map((l) => l.exercise));
    const names = [
      ...new Set((DEFAULT_PLAN[muscleDay] || []).map((ex) => ex.name)),
    ]
      .filter((n) => loggedNames.has(n))
      .sort((a, b) => a.localeCompare(b));
    return names;
  }, [muscleDay, data.logs]);

  // keep selected exercise valid whenever the muscle day (or its options) changes
  useEffect(() => {
    if (exerciseOptions.length === 0) {
      setExerciseName("");
    } else if (!exerciseOptions.includes(exerciseName)) {
      setExerciseName(exerciseOptions[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exerciseOptions]);

  // ================= ANALYSIS: WEIGHT PROGRESSION CHART =================
  const chartLogs = useMemo(() => {
    if (!exerciseName) return [];
    return data.logs
      .filter((l) => l.exercise === exerciseName)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [data.logs, exerciseName]);

  const chartSeries = useMemo(() => {
    return [0, 1, 2].map((s) => ({
      label: `Set ${s + 1}`,
      color: SET_COLORS[s],
      data: chartLogs.map((l) => (l.sets[s] ? l.sets[s].weight : null)),
    }));
  }, [chartLogs]);

  const chartXLabels = useMemo(
    () => chartLogs.map((l) => l.date.slice(5)),
    [chartLogs],
  );

  // ================= ANALYSIS: WEEK COMPARE =================
  const weekCompareRows = useMemo(() => {
    if (!exerciseName) return null;
    const logs = data.logs.filter((l) => l.exercise === exerciseName);
    const thisWeekRange = getWeekRange(0);
    const prevWeekRange = getWeekRange(-1);
    const thisWeekLogs = logs
      .filter((l) => inWeekRange(l.date, thisWeekRange))
      .sort((a, b) => a.date.localeCompare(b.date));
    const prevWeekLogs = logs
      .filter((l) => inWeekRange(l.date, prevWeekRange))
      .sort((a, b) => a.date.localeCompare(b.date));
    const thisWeek = thisWeekLogs[thisWeekLogs.length - 1];
    const prevWeek = prevWeekLogs[prevWeekLogs.length - 1];
    if (!thisWeek && !prevWeek) return [];

    const cardio = isCardioExercise(exerciseName);
    const fmtCell = (entry: typeof thisWeek, s: number) => {
      if (!entry || !entry.sets[s]) return "–";
      const set = entry.sets[s];
      return cardio ?
          `${set.weight}kcal × ${set.reps}min`
        : `${set.weight}kg × ${set.reps}`;
    };
    return [0, 1, 2].map((s) => ({
      set: s + 1,
      thisWeek: fmtCell(thisWeek, s),
      prevWeek: fmtCell(prevWeek, s),
    }));
  }, [data.logs, exerciseName]);

  // ================= ANALYSIS: PDF REPORT =================
  async function handleGenerateReport() {
    setGeneratingReport(true);
    try {
      const options =
        reportType === "muscle" ?
          ({ type: "muscle", day: reportMuscleDay } as const)
        : ({ type: "range", days: reportRangeDays } as const);
      await generateFitnessReport(data, options);
    } catch (e) {
      Alert.alert(
        "Report failed",
        "Could not generate the PDF report. Please try again.",
      );
      console.error(e);
    } finally {
      setGeneratingReport(false);
    }
  }

  if (!loaded) {
    return (
      <View style={styles.container}>
        <Text style={styles.dim}>Loading…</Text>
      </View>
    );
  }

  const dateLabel = selectedDate.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.eyebrow}>Fitness</Text>
        <TouchableOpacity onPress={goToTodaysPlan} activeOpacity={0.7}>
          <Text style={styles.headerTitle}>Today's Plan</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 40 },
        ]}
      >
        <View style={styles.subnav}>
          <TouchableOpacity
            style={[
              styles.subnavBtn,
              view === "plan" && styles.subnavBtnActive,
            ]}
            onPress={() => setView("plan")}
          >
            <Text
              style={[
                styles.subnavText,
                view === "plan" && styles.subnavTextActive,
              ]}
            >
              Plan &amp; Log
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.subnavBtn,
              view === "analysis" && styles.subnavBtnActive,
            ]}
            onPress={() => setView("analysis")}
          >
            <Text
              style={[
                styles.subnavText,
                view === "analysis" && styles.subnavTextActive,
              ]}
            >
              Analysis
            </Text>
          </TouchableOpacity>
        </View>

        {view === "plan" ?
          <>
            <ScrollView
              ref={dayScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.daypicker}
            >
              {monthDays.map(({ date, dayName, status }) => {
                const dStr = fmtDate(date);
                const active = dStr === fmtDate(selectedDate);
                const isToday = dStr === todayStr;
                return (
                  <TouchableOpacity
                    key={dStr}
                    onPress={() => selectDate(date)}
                    style={[
                      styles.dayBtn,
                      status === "attended" && styles.dayAttended,
                      status === "absent" && styles.dayAbsent,
                      status === "future" && styles.dayFuture,
                      isToday && styles.dayToday,
                      active && styles.dayActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayBtnText,
                        status === "attended" && { color: colors.green },
                        isToday && styles.dayBtnTextToday,
                      ]}
                    >
                      {dayName.slice(0, 3)}
                    </Text>
                    <Text
                      style={[
                        styles.dayBtnDate,
                        isToday && styles.dayBtnTextToday,
                      ]}
                    >
                      {date.getDate()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.card}>
              <Text style={styles.dayHeading}>
                {currentDay} - {DAY_MUSCLES[currentDay]}
              </Text>
              <Text style={styles.dayHeadingDate}>{dateLabel}</Text>

              {!isSelectedToday && (
                <Text style={styles.sub}>
                  You can only log or edit today's workout — this is a read-only
                  preview of the plan.
                </Text>
              )}

              {exercises.length === 0 ?
                <Text style={styles.empty}>Rest day.</Text>
              : exercises.map((ex, i) => {
                  const logEntry = data.logs.find(
                    (l) => l.exercise === ex.name && l.date === viewingDateStr,
                  );
                  const skipEntry = data.skips.find(
                    (s) => s.exercise === ex.name && s.date === viewingDateStr,
                  );
                  const isDone = !!logEntry || !!skipEntry;
                  const cardio = isCardioExercise(ex.name);
                  const fmtSet = (s: SetEntry) =>
                    cardio ?
                      `${s.weight}kcal × ${s.reps}min`
                    : `${s.weight}kg×${s.reps}`;

                  let statusText: string;
                  if (logEntry) {
                    statusText = `Logged: ${logEntry.sets.map(fmtSet).join(", ")}`;
                  } else if (skipEntry) {
                    statusText = "Skipped";
                  } else {
                    const priorLog = [...data.logs]
                      .reverse()
                      .find(
                        (l) =>
                          l.exercise === ex.name && l.date !== viewingDateStr,
                      );
                    statusText =
                      priorLog ?
                        `Last: ${priorLog.sets.map(fmtSet).join(", ")}`
                      : "Not logged yet";
                  }

                  const setCount = cardio ? 1 : 3;

                  return (
                    <View
                      key={`${ex.name}-${i}`}
                      style={[
                        styles.exerciseRow,
                        isDone && styles.exerciseRowDone,
                      ]}
                    >
                      <Text style={styles.exName}>{ex.name}</Text>
                      <Text style={styles.exTarget}>{statusText}</Text>

                      {isSelectedToday && !isDone && (
                        <>
                          {Array.from({ length: setCount }).map((_, s) => {
                            const key = `${i}-${s}`;
                            const { weight, reps } = getInput(key);
                            return (
                              <View key={key} style={styles.setRow}>
                                <Text style={styles.setLabel}>Set {s + 1}</Text>
                                <TextInput
                                  style={styles.setInput}
                                  placeholder={cardio ? "kcal" : "kg"}
                                  placeholderTextColor={colors.textDim}
                                  keyboardType="numeric"
                                  value={weight}
                                  onChangeText={(v) =>
                                    updateInput(key, "weight", v)
                                  }
                                />
                                <TextInput
                                  style={styles.setInput}
                                  placeholder={cardio ? "min" : "reps"}
                                  placeholderTextColor={colors.textDim}
                                  keyboardType="numeric"
                                  value={reps}
                                  onChangeText={(v) =>
                                    updateInput(key, "reps", v)
                                  }
                                />
                              </View>
                            );
                          })}
                          <View style={styles.actionRow}>
                            <TouchableOpacity
                              style={styles.logBtn}
                              onPress={() => logSet(i, ex.name)}
                            >
                              <Text style={styles.logBtnText}>
                                {cardio ? "Log Cardio" : "Log 3 Sets"}
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.skipBtn}
                              onPress={() => skipExercise(ex.name)}
                            >
                              <Text style={styles.skipBtnText}>Skip</Text>
                            </TouchableOpacity>
                          </View>
                        </>
                      )}
                    </View>
                  );
                })
              }
            </View>
          </>
        : <>
            {/* ============ MONTH STATS ============ */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>This Month</Text>
              <View style={styles.statGrid}>
                <View style={styles.statBox}>
                  <Text style={styles.statVal}>{monthStats.daysInMonth}</Text>
                  <Text style={styles.statLbl}>Days in Month</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={[styles.statVal, { color: colors.green }]}>
                    {monthStats.attended}
                  </Text>
                  <Text style={styles.statLbl}>Attended</Text>
                </View>
              </View>
              <View style={styles.statGrid}>
                <View style={styles.statBox}>
                  <Text style={styles.statVal}>{monthStats.absent}</Text>
                  <Text style={styles.statLbl}>Absent</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statVal}>{monthStats.missed}</Text>
                  <Text style={styles.statLbl}>Remaining</Text>
                </View>
              </View>
            </View>

            {/* ============ WEIGHT PROGRESSION ============ */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Weight Progression</Text>

              <Text style={styles.label}>Select Muscle</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.pillRow}
              >
                {MUSCLE_DAYS.map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.pill, muscleDay === d && styles.pillActive]}
                    onPress={() => setMuscleDay(d)}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        muscleDay === d && styles.pillTextActive,
                      ]}
                    >
                      {DAY_MUSCLES[d]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.label}>Select Machine</Text>
              {exerciseOptions.length === 0 ?
                <Text style={styles.empty}>No logs yet for this muscle</Text>
              : <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.pillRow}
                >
                  {exerciseOptions.map((n) => (
                    <TouchableOpacity
                      key={n}
                      style={[
                        styles.pill,
                        exerciseName === n && styles.pillActive,
                      ]}
                      onPress={() => setExerciseName(n)}
                    >
                      <Text
                        style={[
                          styles.pillText,
                          exerciseName === n && styles.pillTextActive,
                        ]}
                      >
                        {n}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              }

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginTop: 10 }}
              >
                <MultiLineChart series={chartSeries} xLabels={chartXLabels} />
              </ScrollView>
            </View>

            {/* ============ WEEK COMPARE ============ */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>This Week vs Previous Week</Text>
              {!weekCompareRows || weekCompareRows.length === 0 ?
                <Text style={styles.empty}>No logs yet for this exercise.</Text>
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
                  {weekCompareRows.map((row) => (
                    <View key={row.set} style={styles.tableRow}>
                      <Text
                        style={[
                          styles.tableCell,
                          { flex: 0.8, color: colors.text },
                        ]}
                      >
                        {row.set}
                      </Text>
                      <Text style={styles.tableCell}>{row.thisWeek}</Text>
                      <Text style={styles.tableCell}>{row.prevWeek}</Text>
                    </View>
                  ))}
                </View>
              }
            </View>

            {/* ============ REPORT GENERATOR ============ */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Report Generator</Text>
              <Text style={styles.sub}>
                Download a day-wise PDF report of your performed exercises,
                weights and tips.
              </Text>

              <Text style={styles.label}>Report Type</Text>
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[
                    styles.toggleBtn,
                    reportType === "range" && styles.toggleBtnActive,
                  ]}
                  onPress={() => setReportType("range")}
                >
                  <Text
                    style={[
                      styles.toggleBtnText,
                      reportType === "range" && styles.toggleBtnTextActive,
                    ]}
                  >
                    By Range
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.toggleBtn,
                    reportType === "muscle" && styles.toggleBtnActive,
                  ]}
                  onPress={() => setReportType("muscle")}
                >
                  <Text
                    style={[
                      styles.toggleBtnText,
                      reportType === "muscle" && styles.toggleBtnTextActive,
                    ]}
                  >
                    By Muscle
                  </Text>
                </TouchableOpacity>
              </View>

              {reportType === "range" ?
                <>
                  <Text style={styles.label}>Report Range</Text>
                  <View style={styles.pillRowWrap}>
                    {[7, 15, 30, 60, 90].map((d) => (
                      <TouchableOpacity
                        key={d}
                        style={[
                          styles.pill,
                          reportRangeDays === d && styles.pillActive,
                        ]}
                        onPress={() => setReportRangeDays(d)}
                      >
                        <Text
                          style={[
                            styles.pillText,
                            reportRangeDays === d && styles.pillTextActive,
                          ]}
                        >
                          Last {d} Days
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              : <>
                  <Text style={styles.label}>Select Muscle</Text>
                  <View style={styles.pillRowWrap}>
                    {MUSCLE_DAYS.map((d) => (
                      <TouchableOpacity
                        key={d}
                        style={[
                          styles.pill,
                          reportMuscleDay === d && styles.pillActive,
                        ]}
                        onPress={() => setReportMuscleDay(d)}
                      >
                        <Text
                          style={[
                            styles.pillText,
                            reportMuscleDay === d && styles.pillTextActive,
                          ]}
                        >
                          {DAY_MUSCLES[d]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              }

              <TouchableOpacity
                style={[
                  styles.generateBtn,
                  generatingReport && { opacity: 0.6 },
                ]}
                onPress={handleGenerateReport}
                disabled={generatingReport}
              >
                <Text style={styles.generateBtnText}>
                  {generatingReport ? "Generating…" : "Generate PDF Report"}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        }
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { padding: 14, paddingBottom: 40 },
  dim: { color: colors.textDim, textAlign: "center", marginTop: 20 },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 2,
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: colors.textDim,
    fontWeight: "600",
  },
  headerTitle: { fontSize: 22, fontWeight: "700", color: colors.text },

  subnav: { flexDirection: "row", gap: 8, marginBottom: 14 },
  subnavBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  subnavBtnActive: { backgroundColor: colors.fit, borderColor: colors.fit },
  subnavText: { color: colors.textDim, fontWeight: "600", fontSize: 13 },
  subnavTextActive: { color: "#1a0d05" },

  daypicker: { marginBottom: 14 },
  dayBtn: {
    width: DAY_BTN_WIDTH,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingVertical: 8,
    marginRight: DAY_BTN_MARGIN,
    alignItems: "center",
    justifyContent: "center",
  },
  dayBtnText: { color: colors.textDim, fontWeight: "600", fontSize: 12.5 },
  dayBtnDate: {
    color: colors.textDim,
    fontSize: 9.5,
    opacity: 0.7,
    marginTop: 2,
  },
  dayAttended: {
    backgroundColor: "rgba(61,220,140,0.14)",
    borderColor: colors.green,
  },
  dayAbsent: {
    backgroundColor: "rgba(255,99,99,0.12)",
    borderColor: "rgba(255,99,99,0.45)",
  },
  dayFuture: { opacity: 0.6 },
  dayToday: {
    backgroundColor: "rgba(255,196,0,0.14)",
    borderColor: "#ffc400",
    borderWidth: 1.5,
  },
  dayBtnTextToday: { color: "#ffc400" },
  dayActive: { borderColor: colors.fit, borderWidth: 2 },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 10,
  },
  dayHeading: { color: colors.text, fontSize: 15, fontWeight: "700" },
  dayHeadingDate: {
    color: colors.textDim,
    fontSize: 12.5,
    marginTop: 2,
    marginBottom: 6,
  },
  sub: { color: colors.textDim, fontSize: 12, marginBottom: 10 },
  empty: { color: colors.textDim, fontSize: 13, paddingVertical: 12 },
  label: {
    color: colors.textDim,
    fontSize: 11.5,
    fontWeight: "600",
    marginTop: 8,
    marginBottom: 6,
  },

  exerciseRow: {
    paddingVertical: 12,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  exerciseRowDone: {
    backgroundColor: colors.doneRowBg,
    borderWidth: 1,
    borderColor: colors.doneRowBorder,
    borderRadius: 12,
    borderBottomWidth: 0,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  exName: { color: colors.text, fontWeight: "600", fontSize: 13.5 },
  exTarget: { color: colors.textDim, fontSize: 11.5, marginTop: 2 },

  setRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  setLabel: { color: colors.textDim, fontSize: 11, width: 40 },
  setInput: {
    flex: 1,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    fontSize: 12.5,
  },

  actionRow: { flexDirection: "row", gap: 6, marginTop: 10 },
  logBtn: {
    flex: 2,
    backgroundColor: colors.fit,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  logBtnText: { color: "#1a0d05", fontWeight: "700", fontSize: 12 },
  skipBtn: {
    flex: 1,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  skipBtnText: { color: "#e5e5ea", fontWeight: "600", fontSize: 12 },

  // Analysis-specific
  statGrid: { flexDirection: "row", gap: 10, marginBottom: 10 },
  statBox: {
    flex: 1,
    backgroundColor: colors.surface2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    alignItems: "center",
  },
  statVal: { color: colors.text, fontSize: 20, fontWeight: "700" },
  statLbl: { color: colors.textDim, fontSize: 10.5, marginTop: 4 },

  pillRow: { marginBottom: 4 },
  pillRowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 4,
  },
  pill: {
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingVertical: 7,
    paddingHorizontal: 12,
    marginRight: 6,
  },
  pillActive: { backgroundColor: colors.fit, borderColor: colors.fit },
  pillText: { color: colors.textDim, fontSize: 11.5, fontWeight: "600" },
  pillTextActive: { color: "#1a0d05" },

  table: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    overflow: "hidden",
  },
  tableRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tableHeaderRow: { borderTopWidth: 0, backgroundColor: colors.surface2 },
  tableCell: { flex: 1, padding: 9, color: colors.textDim, fontSize: 11.5 },
  tableHeaderText: { color: colors.text, fontWeight: "700", fontSize: 11 },

  toggleRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  toggleBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleBtnActive: { backgroundColor: colors.fit, borderColor: colors.fit },
  toggleBtnText: { color: colors.textDim, fontWeight: "600", fontSize: 12.5 },
  toggleBtnTextActive: { color: "#1a0d05" },

  generateBtn: {
    backgroundColor: colors.fit,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 12,
  },
  generateBtnText: { color: "#1a0d05", fontWeight: "700", fontSize: 13.5 },
});
