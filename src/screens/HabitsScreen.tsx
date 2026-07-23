import { useEffect, useMemo, useState, useCallback } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
} from "react-native";
import Svg, { Circle } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { loadData, saveData } from "../storage/storage";
import {
  HABITS_COLORS,
  MAX_DAYS_VIEW,
  ANALYSIS_DAYS,
  h_uid,
} from "../constants/habits";
import {
  H_DOW,
  h_dayList,
  getHabitStatus,
  setHabitStatus,
  computeHabitStreaks,
  computeTaskAnalysis,
} from "../utils/habits";
import { fmtDate } from "../utils/date";
import { HabitTask, HabitEntries, HabitStatus } from "../types/habits";
import HabitStatusModal from "../components/HabitStatusModal";
import AddHabitModal from "../components/AddHabitModal";
import HabitAnalysisCard from "../components/HabitAnalysisCard";

const ROW_HEIGHT = 46;
const DAY_COL_WIDTH = 44;
const ANALYSIS_WINDOW_DAYS = 30;

const DEFAULT_TASKS: HabitTask[] = [
  { id: h_uid(), name: "Gym", color: HABITS_COLORS[0].v },
  { id: h_uid(), name: "Breakfast", color: HABITS_COLORS[1].v },
  { id: h_uid(), name: "Lunch", color: HABITS_COLORS[1].v },
  { id: h_uid(), name: "Evening Snacks", color: HABITS_COLORS[2].v },
  { id: h_uid(), name: "Study Room", color: HABITS_COLORS[2].v },
  { id: h_uid(), name: "Dinner", color: HABITS_COLORS[2].v },
];

type ScreenMode = "grid" | "edit" | "analysis";

export default function HabitsScreen() {
  const insets = useSafeAreaInsets();
  const [tasks, setTasks] = useState<HabitTask[]>([]);
  const [entries, setEntries] = useState<HabitEntries>({});
  const [loaded, setLoaded] = useState(false);
  const [mode, setMode] = useState<ScreenMode>("grid");

  const [statusModal, setStatusModal] = useState<{
    taskId: string;
    date: string;
  } | null>(null);
  const [addModalVisible, setAddModalVisible] = useState(false);

  const [toastVisible, setToastVisible] = useState(false);
  const toastOpacity = useState(new Animated.Value(0))[0];

  useEffect(() => {
    (async () => {
      let storedTasks = await loadData<HabitTask[] | null>("habit_tasks", null);
      if (!storedTasks) {
        storedTasks = DEFAULT_TASKS;
        await saveData("habit_tasks", storedTasks);
      }
      const storedEntries = await loadData<HabitEntries>("habit_entries", {});
      setTasks(storedTasks);
      setEntries(storedEntries);
      setLoaded(true);
    })();
  }, []);

  const persistTasks = useCallback((next: HabitTask[]) => {
    setTasks(next);
    saveData("habit_tasks", next);
  }, []);

  const persistEntries = useCallback((next: HabitEntries) => {
    setEntries(next);
    saveData("habit_entries", next);
  }, []);

  const days = useMemo(() => h_dayList(MAX_DAYS_VIEW), []);
  const todayKey = fmtDate(days[0]);

  function showLockedToast() {
    setToastVisible(true);
    Animated.sequence([
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.delay(1300),
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => setToastVisible(false));
  }

  function handleCellPress(dIdx: number, taskId: string, dateKey: string) {
    const locked = dIdx > 1;
    if (locked) {
      showLockedToast();
      return;
    }
    setStatusModal({ taskId, date: dateKey });
  }

  function handleStatusSelect(status: HabitStatus) {
    if (!statusModal) return;
    const next = setHabitStatus(
      entries,
      statusModal.date,
      statusModal.taskId,
      status,
    );
    persistEntries(next);
    setStatusModal(null);
  }

  function handleAddHabit(name: string, color: string) {
    const next = [...tasks, { id: h_uid(), name, color }];
    persistTasks(next);
    setAddModalVisible(false);
  }

  function handleDeleteHabit(id: string) {
    const next = tasks.filter((t) => t.id !== id);
    persistTasks(next);
    const nextEntries: HabitEntries = {};
    Object.keys(entries).forEach((dateKey) => {
      const { [id]: _removed, ...rest } = entries[dateKey];
      nextEntries[dateKey] = rest;
    });
    persistEntries(nextEntries);
  }

  function moveHabit(id: string, dir: -1 | 1) {
    const i = tasks.findIndex((t) => t.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= tasks.length) return;
    const next = [...tasks];
    [next[i], next[j]] = [next[j], next[i]];
    persistTasks(next);
  }

  function toggleMode(target: ScreenMode) {
    setMode((prev) => (prev === target ? "grid" : target));
  }

  // ---- Summary: today's progress ring + best streak ----
  const summary = useMemo(() => {
    const total = tasks.length;
    let done = 0;
    tasks.forEach((t) => {
      if (getHabitStatus(entries, todayKey, t.id) === "done") done++;
    });
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;

    let bestOverall = 0;
    tasks.forEach((t) => {
      const s = computeHabitStreaks(entries, t.id, ANALYSIS_DAYS);
      if (s.best > bestOverall) bestOverall = s.best;
    });

    return { total, done, pct, bestOverall };
  }, [tasks, entries, todayKey]);

  // ---- Analysis data ----
  const analysisData = useMemo(() => {
    return tasks.map((task) => ({
      task,
      analysis: computeTaskAnalysis(
        entries,
        task.id,
        ANALYSIS_WINDOW_DAYS,
        ANALYSIS_DAYS,
      ),
    }));
  }, [tasks, entries]);

  const overallAvgRate = useMemo(() => {
    if (analysisData.length === 0) return 0;
    const sum = analysisData.reduce((acc, d) => acc + d.analysis.rate, 0);
    return Math.round(sum / analysisData.length);
  }, [analysisData]);

  const mostConsistent = useMemo(() => {
    if (analysisData.length === 0) return null;
    return analysisData.reduce((best, d) =>
      d.analysis.rate > best.analysis.rate ? d : best,
    );
  }, [analysisData]);

  if (!loaded) {
    return (
      <View style={styles.container}>
        <Text style={styles.dim}>Loading…</Text>
      </View>
    );
  }

  const circumference = 131.9;
  const ringOffset = circumference - (circumference * summary.pct) / 100;
  const ringColor =
    summary.pct === 100 ? colors.green
    : summary.pct > 0 ? colors.yellow
    : colors.hTextFaint;

  const statusModalTask =
    statusModal ? tasks.find((t) => t.id === statusModal.taskId) : null;
  const statusModalDateLabel =
    statusModal ?
      new Date(statusModal.date + "T00:00:00").toLocaleDateString(undefined, {
        weekday: "long",
        month: "short",
        day: "numeric",
      })
    : "";
  const statusModalCurrent =
    statusModal ?
      getHabitStatus(entries, statusModal.date, statusModal.taskId)
    : "unknown";

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View>
          <Text style={styles.eyebrow}>Habits</Text>
          <Text style={styles.headerTitle}>
            {mode === "analysis" ?
              "Analysis"
            : mode === "edit" ?
              "Edit Habits"
            : "Daily Routine"}
          </Text>
        </View>
        <View style={styles.headerBtns}>
          <TouchableOpacity
            style={[
              styles.iconBtn,
              mode === "analysis" && styles.iconBtnActive,
            ]}
            onPress={() => toggleMode("analysis")}
          >
            <Ionicons
              name="bar-chart-outline"
              size={19}
              color={mode === "analysis" ? colors.hBg : colors.hText}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconBtn, mode === "edit" && styles.iconBtnActive]}
            onPress={() => toggleMode("edit")}
          >
            <Ionicons
              name={mode === "edit" ? "checkmark" : "create-outline"}
              size={19}
              color={mode === "edit" ? colors.hBg : colors.hText}
            />
          </TouchableOpacity>
        </View>
      </View>

      {mode === "edit" ?
        // ================= EDIT MODE =================
        <ScrollView contentContainerStyle={styles.editScroll}>
          <Text style={styles.editHint}>
            Use ▲▼ to reorder · Tap trash to delete
          </Text>
          {tasks.map((task, idx) => (
            <View key={task.id} style={styles.editRow}>
              <View style={[styles.editDot, { backgroundColor: task.color }]} />
              <Text style={styles.editName}>{task.name}</Text>
              <TouchableOpacity
                disabled={idx === 0}
                onPress={() => moveHabit(task.id, -1)}
                style={[
                  styles.editArrowBtn,
                  idx === 0 && styles.editArrowDisabled,
                ]}
              >
                <Ionicons name="chevron-up" size={16} color={colors.hTextDim} />
              </TouchableOpacity>
              <TouchableOpacity
                disabled={idx === tasks.length - 1}
                onPress={() => moveHabit(task.id, 1)}
                style={[
                  styles.editArrowBtn,
                  idx === tasks.length - 1 && styles.editArrowDisabled,
                ]}
              >
                <Ionicons
                  name="chevron-down"
                  size={16}
                  color={colors.hTextDim}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDeleteHabit(task.id)}
                style={styles.editTrashBtn}
              >
                <Ionicons
                  name="trash-outline"
                  size={16}
                  color={colors.hDanger}
                />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity
            style={styles.addRowBtn}
            onPress={() => setAddModalVisible(true)}
          >
            <Ionicons name="add" size={18} color={colors.hTextDim} />
            <Text style={styles.addRowBtnText}>Add a habit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.doneEditingBtn}
            onPress={() => setMode("grid")}
          >
            <Text style={styles.doneEditingBtnText}>Done</Text>
          </TouchableOpacity>
        </ScrollView>
      : mode === "analysis" ?
        // ================= ANALYSIS MODE =================
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {tasks.length === 0 ?
            <View style={styles.emptyState}>
              <Ionicons
                name="bar-chart-outline"
                size={28}
                color={colors.hTextFaint}
              />
              <Text style={styles.emptyText}>
                No 
              </Text>
            </View>
          : <>
              {/* Overview card */}
              <View style={styles.overviewCard}>
                <Text style={styles.overviewTitle}>
                  Last {ANALYSIS_WINDOW_DAYS} Days
                </Text>
                <View style={styles.overviewRow}>
                  <View style={styles.overviewItem}>
                    <Text style={styles.overviewVal}>{tasks.length}</Text>
                    <Text style={styles.overviewLbl}>Habits</Text>
                  </View>
                  <View style={styles.overviewItem}>
                    <Text style={[styles.overviewVal, { color: colors.green }]}>
                      {overallAvgRate}%
                    </Text>
                    <Text style={styles.overviewLbl}>Avg. Completion</Text>
                  </View>
                  <View style={styles.overviewItem}>
                    <Text
                      style={[styles.overviewVal, { color: colors.yellow }]}
                    >
                      {summary.bestOverall}
                    </Text>
                    <Text style={styles.overviewLbl}>Best Streak</Text>
                  </View>
                </View>
                {mostConsistent && (
                  <View style={styles.mostConsistentRow}>
                    <View
                      style={[
                        styles.dot,
                        { backgroundColor: mostConsistent.task.color },
                      ]}
                    />
                    <Text style={styles.mostConsistentText}>
                      Most consistent:{" "}
                      <Text style={{ fontWeight: "700" }}>
                        {mostConsistent.task.name}
                      </Text>{" "}
                      ({mostConsistent.analysis.rate}%)
                    </Text>
                  </View>
                )}
              </View>

              {/* Per-habit cards */}
              {analysisData.map(({ task, analysis }) => (
                <HabitAnalysisCard
                  key={task.id}
                  task={task}
                  analysis={analysis}
                />
              ))}
            </>
          }
        </ScrollView>
        // ================= HABITS GRID =================
      : <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Summary strip */}
          <View style={styles.summaryStrip}>
            <View style={styles.ringWrap}>
              <Svg width={52} height={52} viewBox="0 0 52 52">
                <Circle
                  cx={26}
                  cy={26}
                  r={21}
                  stroke={colors.hSurface3}
                  strokeWidth={5}
                  fill="none"
                />
                <Circle
                  cx={26}
                  cy={26}
                  r={21}
                  stroke={ringColor}
                  strokeWidth={5}
                  fill="none"
                  strokeDasharray={circumference}
                  strokeDashoffset={ringOffset}
                  strokeLinecap="round"
                  rotation={-90}
                  originX={26}
                  originY={26}
                />
              </Svg>
              <Text style={styles.ringLabel}>{summary.pct}%</Text>
            </View>
            <View style={styles.summaryText}>
              <Text style={styles.summaryT1}>Today's progress</Text>
              <Text style={styles.summaryT2}>
                {summary.done} of {summary.total} habits done
              </Text>
            </View>
            <View style={styles.streakPill}>
              <Ionicons name="flame" size={13} color={colors.yellow} />
              <Text style={styles.streakPillText}>{summary.bestOverall}</Text>
            </View>
          </View>

          {tasks.length === 0 ?
            <View style={styles.emptyState}>
              <Ionicons
                name="stats-chart-outline"
                size={28}
                color={colors.hTextFaint}
              />
              <Text style={styles.emptyText}>
                No habits yet. Tap the edit icon above to add one.
              </Text>
            </View>
          : <View style={styles.gridWrap}>
              {/* Fixed left column: task names */}
              <View style={styles.nameCol}>
                <View style={[styles.cornerCell, { height: ROW_HEIGHT }]} />
                {tasks.map((task) => {
                  const streak = computeHabitStreaks(
                    entries,
                    task.id,
                    ANALYSIS_DAYS,
                  );
                  return (
                    <View
                      key={task.id}
                      style={[styles.nameCell, { height: ROW_HEIGHT }]}
                    >
                      <View
                        style={[
                          styles.bulletDot,
                          {
                            backgroundColor:
                              streak.current > 0 ? task.color : "transparent",
                          },
                        ]}
                      />
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[styles.taskName, { color: task.color }]}
                          numberOfLines={1}
                        >
                          {task.name}
                        </Text>
                        {streak.current > 0 && (
                          <Text style={styles.taskStreak}>
                            🔥 {streak.current} day
                            {streak.current > 1 ? "s" : ""}
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* Scrollable day grid */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View>
                  <View style={[styles.headRow, { height: ROW_HEIGHT }]}>
                    {days.map((d, idx) => (
                      <View
                        key={fmtDate(d)}
                        style={[
                          styles.headCell,
                          { width: DAY_COL_WIDTH },
                          idx === 0 && styles.headCellToday,
                        ]}
                      >
                        <Text style={styles.dow}>{H_DOW[d.getDay()]}</Text>
                        <Text style={styles.dnum}>{d.getDate()}</Text>
                      </View>
                    ))}
                  </View>
                  {tasks.map((task) => (
                    <View
                      key={task.id}
                      style={[styles.dataRow, { height: ROW_HEIGHT }]}
                    >
                      {days.map((d, dIdx) => {
                        const dateKey = fmtDate(d);
                        const status = getHabitStatus(
                          entries,
                          dateKey,
                          task.id,
                        );
                        const locked = dIdx > 1;
                        return (
                          <TouchableOpacity
                            key={dateKey}
                            style={[styles.statCell, { width: DAY_COL_WIDTH }]}
                            onPress={() =>
                              handleCellPress(dIdx, task.id, dateKey)
                            }
                            activeOpacity={locked ? 1 : 0.6}
                          >
                            <Ionicons
                              name={
                                status === "done" ? "checkmark-circle"
                                : status === "x" ?
                                  "close-circle"
                                : "ellipse-outline"
                              }
                              size={20}
                              color={
                                status === "done" ? task.color
                                : status === "x" ?
                                  colors.hTextFaint
                                : colors.hTextFaint
                              }
                              style={
                                locked && status === "unknown" ?
                                  { opacity: 0.35 }
                                : undefined
                              }
                            />
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          }
        </ScrollView>
      }

      {/* Locked-day toast */}
      {toastVisible && (
        <Animated.View style={[styles.toast, { opacity: toastOpacity }]}>
          <Text style={styles.toastText}>
            Only today and yesterday can be edited
          </Text>
        </Animated.View>
      )}

      {/* Status modal */}
      <HabitStatusModal
        visible={!!statusModal}
        taskName={statusModalTask?.name || ""}
        dateLabel={statusModalDateLabel}
        current={statusModalCurrent}
        onSelect={handleStatusSelect}
        onClose={() => setStatusModal(null)}
      />

      {/* Add habit modal (opened from the Edit screen only) */}
      <AddHabitModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        onSubmit={handleAddHabit}
        suggestedColor={HABITS_COLORS[tasks.length % HABITS_COLORS.length].v}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.hBg },
  scrollContent: { padding: 14, paddingBottom: 40 },
  dim: { color: colors.hTextDim, textAlign: "center", marginTop: 20 },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.hBorder,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: colors.hTextDim,
    fontWeight: "600",
    marginBottom: 2,
  },
  headerTitle: { fontSize: 22, fontWeight: "700", color: colors.hText },
  headerBtns: { flexDirection: "row", gap: 8 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.hSurface2,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnActive: { backgroundColor: colors.hText },

  summaryStrip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.hSurface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.hBorder,
    padding: 14,
    marginBottom: 14,
    gap: 12,
  },
  ringWrap: { alignItems: "center", justifyContent: "center" },
  ringLabel: {
    position: "absolute",
    color: colors.hText,
    fontSize: 11,
    fontWeight: "700",
  },
  summaryText: { flex: 1 },
  summaryT1: { color: colors.hText, fontSize: 13.5, fontWeight: "700" },
  summaryT2: { color: colors.hTextDim, fontSize: 11.5, marginTop: 2 },
  streakPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.hSurface2,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  streakPillText: { color: colors.hText, fontWeight: "700", fontSize: 12.5 },

  emptyState: { alignItems: "center", paddingVertical: 40, gap: 10 },
  emptyText: {
    color: colors.hTextFaint,
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 20,
  },

  gridWrap: { flexDirection: "row" },
  nameCol: { width: 128 },
  cornerCell: { justifyContent: "flex-end" },
  nameCell: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.hBorder,
    paddingRight: 6,
  },
  bulletDot: { width: 8, height: 8, borderRadius: 4 },
  taskName: { fontSize: 12.5, fontWeight: "600" },
  taskStreak: { color: colors.hTextDim, fontSize: 9.5, marginTop: 1 },

  headRow: { flexDirection: "row", alignItems: "flex-end" },
  headCell: {
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 4,
  },
  headCellToday: { backgroundColor: colors.hSurface2, borderRadius: 8 },
  dow: { color: colors.hTextFaint, fontSize: 8.5, fontWeight: "700" },
  dnum: {
    color: colors.hTextDim,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 1,
  },

  dataRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: colors.hBorder,
  },
  statCell: { alignItems: "center", justifyContent: "center" },

  addRowBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    marginTop: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.hBorder,
    borderStyle: "dashed",
  },
  addRowBtnText: { color: colors.hTextDim, fontWeight: "600", fontSize: 13 },

  editScroll: { padding: 14, paddingBottom: 40 },
  editHint: { color: colors.hTextDim, fontSize: 11.5, marginBottom: 12 },
  editRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.hSurface,
    borderWidth: 1,
    borderColor: colors.hBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  editDot: { width: 10, height: 10, borderRadius: 5 },
  editName: { flex: 1, color: colors.hText, fontSize: 13.5, fontWeight: "600" },
  editArrowBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.hSurface2,
    alignItems: "center",
    justifyContent: "center",
  },
  editArrowDisabled: { opacity: 0.3 },
  editTrashBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
  },
  doneEditingBtn: {
    backgroundColor: colors.green,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 8,
  },
  doneEditingBtnText: { color: "#08150e", fontWeight: "700", fontSize: 13.5 },

  toast: {
    position: "absolute",
    bottom: 24,
    left: 20,
    right: 20,
    backgroundColor: colors.hSurface3,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  toastText: { color: colors.hText, fontSize: 12.5, fontWeight: "600" },

  // Analysis-specific
  overviewCard: {
    backgroundColor: colors.hSurface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.hBorder,
    padding: 16,
    marginBottom: 14,
  },
  overviewTitle: {
    color: colors.hText,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 12,
  },
  overviewRow: { flexDirection: "row" },
  overviewItem: { flex: 1, alignItems: "center" },
  overviewVal: { color: colors.hText, fontSize: 20, fontWeight: "800" },
  overviewLbl: {
    color: colors.hTextDim,
    fontSize: 10,
    marginTop: 3,
    textAlign: "center",
  },
  mostConsistentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.hBorder,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  mostConsistentText: { color: colors.hTextDim, fontSize: 12 },
});
