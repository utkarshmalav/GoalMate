import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

export default function FitnessScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Fitness — coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  text: { color: colors.text, fontSize: 16 },
});