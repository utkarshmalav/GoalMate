import { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { colors } from "../theme/colors";
import { HABITS_COLORS } from "../constants/habits";

type Props = {
  visible: boolean;
  onSubmit: (name: string, color: string) => void;
  onClose: () => void;
  suggestedColor: string;
};

export default function AddHabitModal({
  visible,
  onSubmit,
  onClose,
  suggestedColor,
}: Props) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(suggestedColor);

  useEffect(() => {
    if (visible) {
      setName("");
      setColor(suggestedColor);
    }
  }, [visible, suggestedColor]);

  function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit(trimmed, color);
  }

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
          <Text style={styles.title}>New Habit</Text>
          <TextInput
            style={styles.input}
            placeholder="Habit name"
            placeholderTextColor={colors.hTextDim}
            value={name}
            onChangeText={setName}
            autoFocus
          />
          <View style={styles.swatchRow}>
            {HABITS_COLORS.map((c) => (
              <TouchableOpacity
                key={c.v}
                onPress={() => setColor(c.v)}
                style={[
                  styles.swatch,
                  { backgroundColor: c.v },
                  color === c.v && styles.swatchSel,
                ]}
              />
            ))}
          </View>
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addBtn} onPress={handleSubmit}>
              <Text style={styles.addBtnText}>Add Habit</Text>
            </TouchableOpacity>
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
  title: {
    color: colors.hText,
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 14,
  },
  input: {
    backgroundColor: colors.hSurface2,
    borderWidth: 1,
    borderColor: colors.hBorder,
    borderRadius: 10,
    color: colors.hText,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 16,
  },
  swatchRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "transparent",
  },
  swatchSel: { borderColor: colors.hText },
  btnRow: { flexDirection: "row", gap: 10 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: colors.hSurface2,
    borderWidth: 1,
    borderColor: colors.hBorder,
  },
  cancelBtnText: { color: colors.hTextDim, fontWeight: "600", fontSize: 13.5 },
  addBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: colors.green,
  },
  addBtnText: { color: "#08150e", fontWeight: "700", fontSize: 13.5 },
});
