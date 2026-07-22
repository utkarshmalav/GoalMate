import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { loadData, saveData } from "../storage/storage";
import { CATEGORIES, CATEGORY_COLORS } from "../constants/money";
import {
  fmtYearMonth,
  formatMonthLabel,
  shiftYearMonth,
  daysElapsedInYearMonth,
} from "../utils/money";
import { Expense, MoneyData } from "../types/money";
import PieChart from "../components/PieChart";

const EMPTY_DATA: MoneyData = { expenses: [] };

export default function MoneyScreen() {
  const [data, setData] = useState<MoneyData>(EMPTY_DATA);
  const [loaded, setLoaded] = useState(false);

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [note, setNote] = useState("");

  const [viewingMonth, setViewingMonth] = useState(() =>
    fmtYearMonth(new Date()),
  );
  const [revealedIndex, setRevealedIndex] = useState<number | null>(null);
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      const stored = await loadData<MoneyData>("money-data", EMPTY_DATA);
      if (!stored.expenses) stored.expenses = [];
      setData(stored);
      setLoaded(true);
    })();
  }, []);

  const persist = useCallback((next: MoneyData) => {
    setData(next);
    saveData("money-data", next);
  }, []);

  function handleAddExpense() {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    const next: MoneyData = {
      expenses: [
        {
          date: new Date().toISOString().slice(0, 10),
          amount: amt,
          category,
          note: note.trim(),
        },
        ...data.expenses,
      ],
    };
    persist(next);
    setAmount("");
    setNote("");
  }

  function handleDeleteExpense(i: number) {
    const next: MoneyData = {
      expenses: data.expenses.filter((_, idx) => idx !== i),
    };
    persist(next);
    setRevealedIndex(null);
  }

  function revealDelete(i: number) {
    setRevealedIndex(i);
    if (revealTimer.current) clearTimeout(revealTimer.current);
    revealTimer.current = setTimeout(() => setRevealedIndex(null), 3000);
  }

  // ---- Stats: current real-world month + all-time ----
  const stats = useMemo(() => {
    const currentMonthPrefix = fmtYearMonth(new Date());
    const monthTotal = data.expenses
      .filter((e) => e.date.startsWith(currentMonthPrefix))
      .reduce((s, e) => s + e.amount, 0);
    const allTotal = data.expenses.reduce((s, e) => s + e.amount, 0);
    return { monthTotal, allTotal };
  }, [data.expenses]);

  // ---- Chart data for the navigable viewingMonth ----
  const chartData = useMemo(() => {
    const monthExpenses = data.expenses.filter((e) =>
      e.date.startsWith(viewingMonth),
    );
    const totals: Record<string, number> = {};
    monthExpenses.forEach((e) => {
      totals[e.category] = (totals[e.category] || 0) + e.amount;
    });
    const cats = Object.keys(totals).sort((a, b) => totals[b] - totals[a]);
    const totalAll = cats.reduce((s, c) => s + totals[c], 0);
    const daysElapsed = daysElapsedInYearMonth(viewingMonth);
    const avgPerDay = daysElapsed > 0 ? totalAll / daysElapsed : 0;
    return { totals, cats, totalAll, avgPerDay, count: monthExpenses.length };
  }, [data.expenses, viewingMonth]);

  const isCurrentMonth = viewingMonth === fmtYearMonth(new Date());

  if (!loaded) {
    return (
      <View style={styles.container}>
        <Text style={styles.dim}>Loading…</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Money</Text>
        <Text style={styles.headerTitle}>Track Spending</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* ============ QUICK ADD ============ */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Add Expense</Text>

          <View style={styles.amountRow}>
            <Text style={styles.currencySign}>₹</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0"
              placeholderTextColor={colors.textDim}
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
            />
          </View>

          <Text style={styles.label}>Category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.pillRow}
          >
            {CATEGORIES.map((c) => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.catPill,
                  category === c && {
                    backgroundColor: CATEGORY_COLORS[c],
                    borderColor: CATEGORY_COLORS[c],
                  },
                ]}
                onPress={() => setCategory(c)}
              >
                {category !== c && (
                  <View
                    style={[
                      styles.catDot,
                      { backgroundColor: CATEGORY_COLORS[c] },
                    ]}
                  />
                )}
                <Text
                  style={[
                    styles.catPillText,
                    category === c && styles.catPillTextActive,
                  ]}
                >
                  {c}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.label}>Note (optional)</Text>
          <TextInput
            style={styles.noteInput}
            placeholder="e.g. Lunch with friends"
            placeholderTextColor={colors.textDim}
            value={note}
            onChangeText={setNote}
          />

          <TouchableOpacity
            style={[
              styles.addBtn,
              (!amount || parseFloat(amount) <= 0) && styles.addBtnDisabled,
            ]}
            onPress={handleAddExpense}
            disabled={!amount || parseFloat(amount) <= 0}
          >
            <Ionicons name="add-circle" size={18} color={colors.bg} />
            <Text style={styles.addBtnText}>Add Expense</Text>
          </TouchableOpacity>
        </View>

        {/* ============ MONTH STATS ============ */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>This Month</Text>
          <View style={styles.statGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statVal}>
                ₹{stats.monthTotal.toLocaleString()}
              </Text>
              <Text style={styles.statLbl}>Total Spent</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statVal}>
                ₹{stats.allTotal.toLocaleString()}
              </Text>
              <Text style={styles.statLbl}>All-Time Spent</Text>
            </View>
          </View>
        </View>

        {/* ============ MONTHLY BREAKDOWN ============ */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Monthly Breakdown</Text>

          <View style={styles.monthNav}>
            <TouchableOpacity
              style={styles.monthNavBtn}
              onPress={() => setViewingMonth((m) => shiftYearMonth(m, -1))}
            >
              <Ionicons name="chevron-back" size={18} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.monthNavLabel}>
              {formatMonthLabel(viewingMonth)}
            </Text>
            <TouchableOpacity
              style={styles.monthNavBtn}
              onPress={() => setViewingMonth((m) => shiftYearMonth(m, 1))}
            >
              <Ionicons name="chevron-forward" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          {chartData.cats.length === 0 ?
            <Text style={styles.empty}>No expenses logged for this month.</Text>
          : <>
              <View style={styles.chartRow}>
                <PieChart
                  slices={chartData.cats.map((c) => ({
                    value: chartData.totals[c],
                    color: CATEGORY_COLORS[c] || colors.textDim,
                  }))}
                />
                <View style={styles.chartStatsCol}>
                  <Text style={styles.chartTotal}>
                    ₹{chartData.totalAll.toLocaleString()}
                  </Text>
                  <Text style={styles.chartTotalLbl}>
                    total {isCurrentMonth ? "so far" : "spent"}
                  </Text>
                  <View style={styles.chartMiniStat}>
                    <Text style={styles.chartMiniStatVal}>
                      ₹{Math.round(chartData.avgPerDay).toLocaleString()}
                    </Text>
                    <Text style={styles.chartMiniStatLbl}>avg / day</Text>
                  </View>
                  <View style={styles.chartMiniStat}>
                    <Text style={styles.chartMiniStatVal}>
                      {chartData.count}
                    </Text>
                    <Text style={styles.chartMiniStatLbl}>transactions</Text>
                  </View>
                </View>
              </View>

              <View style={styles.legend}>
                {chartData.cats.map((c) => {
                  const pct = Math.round(
                    (chartData.totals[c] / chartData.totalAll) * 100,
                  );
                  return (
                    <View key={c} style={styles.legendRow}>
                      <View style={styles.legendLeft}>
                        <View
                          style={[
                            styles.catDot,
                            { backgroundColor: CATEGORY_COLORS[c] },
                          ]}
                        />
                        <Text style={styles.legendCat}>{c}</Text>
                      </View>
                      <Text style={styles.legendVal}>
                        ₹{chartData.totals[c].toLocaleString()} · {pct}%
                      </Text>
                    </View>
                  );
                })}
              </View>
            </>
          }
        </View>

        {/* ============ RECENT EXPENSES ============ */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recent Expenses</Text>
          {data.expenses.length === 0 ?
            <Text style={styles.empty}>No expenses logged yet.</Text>
          : data.expenses.slice(0, 15).map((e, i) => (
              <TouchableOpacity
                key={`${e.date}-${i}`}
                style={styles.expenseRow}
                onLongPress={() => revealDelete(i)}
                activeOpacity={0.7}
              >
                <View style={styles.expenseLeft}>
                  <View
                    style={[
                      styles.catDot,
                      {
                        backgroundColor:
                          CATEGORY_COLORS[e.category] || colors.textDim,
                      },
                    ]}
                  />
                  <View>
                    <Text style={styles.expenseCat}>{e.category}</Text>
                    <Text style={styles.expenseMeta}>
                      {e.date}
                      {e.note ? ` · ${e.note}` : ""}
                    </Text>
                  </View>
                </View>
                {revealedIndex === i ?
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDeleteExpense(i)}
                  >
                    <Text style={styles.deleteBtnText}>Delete</Text>
                  </TouchableOpacity>
                : <Text style={styles.expenseAmt}>
                    ₹{e.amount.toLocaleString()}
                  </Text>
                }
              </TouchableOpacity>
            ))
          }
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { padding: 14, paddingBottom: 40 },
  dim: { color: colors.textDim, textAlign: "center", marginTop: 20 },

  header: {
    paddingTop: 22,
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
  cardTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 12,
  },
  label: {
    color: colors.textDim,
    fontSize: 11.5,
    fontWeight: "600",
    marginBottom: 6,
  },
  empty: { color: colors.textDim, fontSize: 13, paddingVertical: 12 },

  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  currencySign: {
    color: colors.money,
    fontSize: 20,
    fontWeight: "700",
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    color: colors.text,
    fontSize: 24,
    fontWeight: "700",
    paddingVertical: 12,
  },

  pillRow: { marginBottom: 4 },
  catPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 6,
  },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  catPillText: { color: colors.text, fontSize: 12, fontWeight: "600" },
  catPillTextActive: { color: "#0a0d14", fontWeight: "700" },

  noteInput: {
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 13,
    marginTop: 10,
    marginBottom: 14,
  },

  addBtn: {
    flexDirection: "row",
    gap: 6,
    backgroundColor: colors.money,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnDisabled: { opacity: 0.5 },
  addBtnText: { color: colors.bg, fontWeight: "700", fontSize: 13.5 },

  statGrid: { flexDirection: "row", gap: 10 },
  statBox: {
    flex: 1,
    backgroundColor: colors.surface2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    alignItems: "center",
  },
  statVal: { color: colors.money, fontSize: 17, fontWeight: "700" },
  statLbl: { color: colors.textDim, fontSize: 10.5, marginTop: 4 },

  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  monthNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  monthNavLabel: { color: colors.text, fontSize: 13.5, fontWeight: "700" },

  chartRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 16,
  },
  chartStatsCol: { flex: 1 },
  chartTotal: { color: colors.text, fontSize: 20, fontWeight: "800" },
  chartTotalLbl: { color: colors.textDim, fontSize: 11, marginBottom: 10 },
  chartMiniStat: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    marginTop: 4,
  },
  chartMiniStatVal: { color: colors.text, fontSize: 13, fontWeight: "700" },
  chartMiniStatLbl: { color: colors.textDim, fontSize: 11 },

  legend: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 },
  legendRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  legendLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  legendCat: { color: colors.text, fontSize: 12.5 },
  legendVal: { color: colors.textDim, fontSize: 12 },

  expenseRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  expenseLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  expenseCat: { color: colors.text, fontSize: 13, fontWeight: "600" },
  expenseMeta: { color: colors.textDim, fontSize: 11, marginTop: 2 },
  expenseAmt: { color: colors.text, fontSize: 13.5, fontWeight: "700" },
  deleteBtn: {
    backgroundColor: colors.danger,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  deleteBtnText: { color: "#2b0710", fontWeight: "700", fontSize: 12 },
});
