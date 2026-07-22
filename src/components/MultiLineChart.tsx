import { View, Text, StyleSheet } from 'react-native';
import Svg, { Line, Polyline, Circle, Text as SvgText } from 'react-native-svg';
import { colors } from '../theme/colors';

type Series = {
  label: string;
  color: string;
  data: (number | null)[];
};

type Props = {
  series: Series[];
  xLabels: string[];
  height?: number;
};

export default function MultiLineChart({ series, xLabels, height = 180 }: Props) {
  const width = Math.max(300, xLabels.length * 50);
  const padding = { top: 10, bottom: 24, left: 34, right: 10 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const allValues = series.flatMap((s) => s.data.filter((v): v is number => v != null));
  const maxVal = allValues.length ? Math.max(...allValues) : 10;
  const minVal = allValues.length ? Math.min(...allValues, 0) : 0;
  const range = maxVal - minVal || 1;

  const n = xLabels.length;
  const xStep = n > 1 ? chartW / (n - 1) : 0;

  function xPos(i: number) {
    return padding.left + i * xStep;
  }
  function yPos(v: number) {
    return padding.top + chartH - ((v - minVal) / range) * chartH;
  }

  if (allValues.length === 0) {
    return (
      <View style={[styles.emptyWrap, { height }]}>
        <Text style={styles.emptyText}>No data yet</Text>
      </View>
    );
  }

  return (
    <View>
      <View style={styles.legendRow}>
        {series.map((s) => (
          <View key={s.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: s.color }]} />
            <Text style={styles.legendText}>{s.label}</Text>
          </View>
        ))}
      </View>
      <Svg width={width} height={height}>
        {[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const y = padding.top + chartH * f;
          return (
            <Line
              key={f}
              x1={padding.left}
              y1={y}
              x2={width - padding.right}
              y2={y}
              stroke={colors.border}
              strokeWidth={1}
            />
          );
        })}
        {series.map((s) => {
          const points = s.data
            .map((v, i) => (v == null ? null : `${xPos(i)},${yPos(v)}`))
            .filter((p): p is string => p != null)
            .join(' ');
          return points ? (
            <Polyline key={s.label} points={points} fill="none" stroke={s.color} strokeWidth={2} />
          ) : null;
        })}
        {series.map((s) =>
          s.data.map((v, i) =>
            v == null ? null : (
              <Circle key={`${s.label}-${i}`} cx={xPos(i)} cy={yPos(v)} r={3} fill={s.color} />
            )
          )
        )}
        {xLabels.map((label, i) => (
          <SvgText
            key={label + i}
            x={xPos(i)}
            y={height - 6}
            fontSize={9}
            fill={colors.textDim}
            textAnchor="middle"
          >
            {label}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyWrap: { alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: colors.textDim, fontSize: 13 },
  legendRow: { flexDirection: 'row', gap: 12, marginBottom: 8, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: colors.textDim, fontSize: 11 },
});