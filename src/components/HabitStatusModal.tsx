import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { HabitStatus } from "../types/habits";

type Props = {
  visible: boolean;
  taskName: string;
  dateLabel: string;
  current: HabitStatus;
  onSelect: (status: HabitStatus) => void;
  onClose: () => void;
};

const OPTIONS: {
  val: HabitStatus;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { val: "done", label: "Done", icon: "checkmark-circle" },
  { val: "x", label: "Missed", icon: "close-circle" },
  { val: "unknown", label: "Clear", icon: "help-circle-outline" },
];

export default function HabitStatusModal({
  visible,
  taskName,
  dateLabel,
  current,
  onSelect,
  onClose,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1} style={styles.sheet}>
          <Text style={styles.title}>{taskName}</Text>
          <Text style={styles.sub}>{dateLabel}</Text>
          <View style={styles.optionsRow}>
            {OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.val}
                style={[styles.opt, current === opt.val && styles.optSel]}
                onPress={() => onSelect(opt.val)}
              >
                <Ionicons
                  name={opt.icon}
                  size={26}
                  color={current === opt.val ? colors.hText : colors.hTextDim}
                />
                <Text
                  style={[
                    styles.optLabel,
                    current === opt.val && styles.optLabelSel,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.hSurface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 34,
  },
  title: { color: colors.hText, fontSize: 17, fontWeight: "700" },
  sub: {
    color: colors.hTextDim,
    fontSize: 12.5,
    marginTop: 2,
    marginBottom: 18,
  },
  optionsRow: { flexDirection: "row", gap: 10 },
  opt: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: colors.hSurface2,
    borderWidth: 1,
    borderColor: colors.hBorder,
    gap: 6,
  },
  optSel: { borderColor: colors.hText, backgroundColor: colors.hSurface3 },
  optLabel: { color: colors.hTextDim, fontSize: 12, fontWeight: "600" },
  optLabelSel: { color: colors.hText },
});
