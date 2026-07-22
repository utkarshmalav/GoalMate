import { View, Text, StyleSheet } from "react-native";
import { colors } from "../theme/colors";
import { HabitAnalysis } from "../utils/habits";
import { HabitTask } from "../types/habits";

type Props = {
  task: HabitTask;
  analysis: HabitAnalysis;
};

export default function HabitAnalysisCard({ task, analysis }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.nameRow}>
          <View style={[styles.dot, { backgroundColor: task.color }]} />
          <Text style={styles.name} numberOfLines={1}>
            {task.name}
          </Text>
        </View>
        <Text style={[styles.rate, { color: task.color }]}>
          {analysis.rate}%
        </Text>
      </View>

      <View style={styles.barTrack}>
        <View
          style={[
            styles.barFill,
            { width: `${analysis.rate}%`, backgroundColor: task.color },
          ]}
        />
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statVal}>🔥 {analysis.current}</Text>
          <Text style={styles.statLbl}>Current streak</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statVal}>{analysis.best}</Text>
          <Text style={styles.statLbl}>Best streak</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statVal}>{analysis.done}</Text>
          <Text style={styles.statLbl}>Days done</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statVal}>{analysis.missed}</Text>
          <Text style={styles.statLbl}>Days missed</Text>
        </View>
      </View>

      <View style={styles.heatmap}>
        {analysis.cells.map((cell, i) => (
          <View
            key={i}
            style={[
              styles.heatCell,
              cell.status === "done" ? { backgroundColor: task.color }
              : cell.status === "x" ?
                { backgroundColor: colors.hDanger, opacity: 0.55 }
              : { backgroundColor: colors.hSurface3 },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.hSurface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.hBorder,
    padding: 14,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  name: {
    color: colors.hText,
    fontSize: 14.5,
    fontWeight: "700",
    flexShrink: 1,
  },
  rate: { fontSize: 16, fontWeight: "800" },

  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.hSurface3,
    overflow: "hidden",
    marginBottom: 12,
  },
  barFill: { height: "100%", borderRadius: 3 },

  statsRow: { flexDirection: "row", marginBottom: 12 },
  statItem: { flex: 1, alignItems: "center" },
  statVal: { color: colors.hText, fontSize: 13, fontWeight: "700" },
  statLbl: {
    color: colors.hTextDim,
    fontSize: 9,
    marginTop: 2,
    textAlign: "center",
  },

  heatmap: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  heatCell: { width: 16, height: 16, borderRadius: 4 },
});
