import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../theme/colors";
import { loadData, saveData } from "../storage/storage";
import { SYLLABUS_DETAILED } from "../constants/syllabus";
import { subjectStats, chapterStats } from "../utils/study";
import { StudyData } from "../types/study";

const EMPTY_DATA: StudyData = { syllabus: {} };
const SUBJECTS = Object.keys(SYLLABUS_DETAILED);

export default function StudyScreen() {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<StudyData>(EMPTY_DATA);
  const [loaded, setLoaded] = useState(false);

  const [openSubject, setOpenSubject] = useState<string | null>(null);
  const [openChapter, setOpenChapter] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const stored = await loadData<StudyData>("study-data", EMPTY_DATA);
      if (!stored.syllabus) stored.syllabus = {};
      setData(stored);
      setLoaded(true);
    })();
  }, []);

  const persist = useCallback((next: StudyData) => {
    setData(next);
    saveData("study-data", next);
  }, []);

  function toggleSubject(subject: string) {
    setOpenSubject((prev) => (prev === subject ? null : subject));
    setOpenChapter(null);
  }

  function toggleChapter(subject: string, chapter: string) {
    const key = `${subject}|${chapter}`;
    setOpenChapter((prev) => (prev === key ? null : key));
  }

  function toggleSubtopic(subject: string, chapter: string, subtopic: string) {
    const subjectMap = { ...(data.syllabus[subject] || {}) };
    const chapterMap = { ...(subjectMap[chapter] || {}) };
    chapterMap[subtopic] = !chapterMap[subtopic];
    subjectMap[chapter] = chapterMap;
    const next: StudyData = {
      syllabus: { ...data.syllabus, [subject]: subjectMap },
    };
    persist(next);
  }

  const overall = (() => {
    let total = 0;
    let done = 0;
    SUBJECTS.forEach((s) => {
      const st = subjectStats(data, s);
      total += st.total;
      done += st.done;
    });
    return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
  })();

  if (!loaded) {
    return (
      <View style={styles.container}>
        <Text style={styles.dim}>Loading…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.eyebrow}>Study</Text>
        <Text style={styles.headerTitle}>SSC CGL Syllabus</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Overview card */}
        <View style={styles.card}>

          <View style={styles.overallRow}>
            <Text style={[styles.overallPct, { color: colors.study }]}>
              {overall.pct}%
            </Text>
            <Text style={styles.overallLbl}>
              {overall.done} of {overall.total} subtopics completed overall
            </Text>
          </View>
          <View style={styles.statGrid}>
            {SUBJECTS.map((s) => {
              const st = subjectStats(data, s);
              return (
                <View key={s} style={styles.statBox}>
                  <Text style={styles.statVal}>{st.pct}%</Text>
                  <Text style={styles.statLbl} numberOfLines={1}>
                    {s}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Accordion */}
        {SUBJECTS.map((subject) => {
          const st = subjectStats(data, subject);
          const isOpen = openSubject === subject;
          const chapters = Object.keys(SYLLABUS_DETAILED[subject]);

          return (
            <View key={subject} style={styles.subjectCard}>
              <TouchableOpacity
                style={styles.subjectHeader}
                onPress={() => toggleSubject(subject)}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.subjectName}>{subject}</Text>
                  <Text style={styles.subjectSub}>
                    {st.done}/{st.total} subtopics done
                  </Text>
                </View>
                <View style={styles.subjectRight}>
                  <View style={styles.pctPill}>
                    <Text style={styles.pctPillText}>{st.pct}%</Text>
                  </View>
                  <Ionicons
                    name={isOpen ? "chevron-up" : "chevron-down"}
                    size={16}
                    color={colors.textDim}
                  />
                </View>
              </TouchableOpacity>

              {isOpen && (
                <View style={styles.chaptersWrap}>
                  {chapters.map((chapter) => {
                    const cs = chapterStats(data, subject, chapter);
                    const chKey = `${subject}|${chapter}`;
                    const chOpen = openChapter === chKey;

                    return (
                      <View key={chapter} style={styles.chapterCard}>
                        <TouchableOpacity
                          style={styles.chapterHeader}
                          onPress={() => toggleChapter(subject, chapter)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.chapterLeft}>
                            <View
                              style={[
                                styles.tick,
                                cs.complete && styles.tickChecked,
                              ]}
                            >
                              {cs.complete && (
                                <Ionicons
                                  name="checkmark"
                                  size={11}
                                  color={colors.bg}
                                />
                              )}
                            </View>
                            <Text
                              style={[
                                styles.chapterName,
                                cs.complete && styles.chapterNameDone,
                              ]}
                              numberOfLines={1}
                            >
                              {chapter}
                            </Text>
                          </View>
                          <View style={styles.chapterRight}>
                            <Text style={styles.chapterCount}>
                              {cs.done}/{cs.total}
                            </Text>
                            <Ionicons
                              name={chOpen ? "chevron-up" : "chevron-down"}
                              size={13}
                              color={colors.textDim}
                            />
                          </View>
                        </TouchableOpacity>

                        {chOpen && (
                          <View style={styles.subtopicsWrap}>
                            {SYLLABUS_DETAILED[subject][chapter].map((sub) => {
                              const checked =
                                !!data.syllabus[subject]?.[chapter]?.[sub];
                              return (
                                <TouchableOpacity
                                  key={sub}
                                  style={styles.subtopicRow}
                                  onPress={() =>
                                    toggleSubtopic(subject, chapter, sub)
                                  }
                                  activeOpacity={0.6}
                                >
                                  <View
                                    style={[
                                      styles.tick,
                                      checked && styles.tickChecked,
                                    ]}
                                  >
                                    {checked && (
                                      <Ionicons
                                        name="checkmark"
                                        size={11}
                                        color={colors.bg}
                                      />
                                    )}
                                  </View>
                                  <Text
                                    style={[
                                      styles.subtopicText,
                                      checked && styles.subtopicTextDone,
                                    ]}
                                  >
                                    {sub}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
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

  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  cardSub: { color: colors.textDim, fontSize: 12, marginBottom: 12 },
  overallRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  overallPct: { fontSize: 26, fontWeight: "800" },
  overallLbl: { flex: 1, color: colors.textDim, fontSize: 12 },

  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statBox: {
    flexGrow: 1,
    minWidth: "47%",
    backgroundColor: colors.surface2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    alignItems: "center",
  },
  statVal: { color: colors.study, fontSize: 16, fontWeight: "700" },
  statLbl: {
    color: colors.textDim,
    fontSize: 10,
    marginTop: 3,
    textAlign: "center",
  },

  subjectCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
    overflow: "hidden",
  },
  subjectHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  subjectName: { color: colors.text, fontSize: 14.5, fontWeight: "700" },
  subjectSub: { color: colors.textDim, fontSize: 11.5, marginTop: 2 },
  subjectRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  pctPill: {
    backgroundColor: colors.studyDim,
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  pctPillText: { color: colors.study, fontSize: 11.5, fontWeight: "700" },

  chaptersWrap: { paddingHorizontal: 12, paddingBottom: 12, gap: 8 },
  chapterCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    overflow: "hidden",
  },
  chapterHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  chapterLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  chapterRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  chapterName: {
    color: colors.text,
    fontSize: 12.5,
    fontWeight: "600",
    flexShrink: 1,
  },
  chapterNameDone: {
    textDecorationLine: "line-through",
    color: colors.textDim,
  },
  chapterCount: { color: colors.textDim, fontSize: 11 },

  tick: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  tickChecked: { backgroundColor: colors.study, borderColor: colors.study },

  subtopicsWrap: {
    paddingLeft: 30,
    paddingRight: 12,
    paddingBottom: 8,
    gap: 8,
  },
  subtopicRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 2,
  },
  subtopicText: { color: colors.text, fontSize: 12.5, flexShrink: 1 },
  subtopicTextDone: {
    textDecorationLine: "line-through",
    color: colors.textDim,
  },
});
