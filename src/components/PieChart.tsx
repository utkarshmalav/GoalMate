import Svg, { Path, Circle } from "react-native-svg";

type Slice = { value: number; color: string };
type Props = { slices: Slice[]; size?: number };

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`;
}

export default function PieChart({ slices, size = 170 }: Props) {
  const filtered = slices.filter((s) => s.value > 0);
  const total = filtered.reduce((s, sl) => s + sl.value, 0);
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2;

  if (total <= 0) return null;

  // Single category: describeArc degenerates on a full 360° slice, draw a plain circle instead
  if (filtered.length === 1) {
    return (
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle
          cx={cx}
          cy={cy}
          r={r - 1}
          fill={filtered[0].color}
          stroke="#10121a"
          strokeWidth={2}
        />
      </Svg>
    );
  }

  let angle = 0;
  const paths = filtered.map((sl, i) => {
    const sliceAngle = (sl.value / total) * 360;
    const startAngle = angle;
    const endAngle = angle + sliceAngle;
    angle = endAngle;
    return {
      d: describeArc(cx, cy, r, startAngle, endAngle),
      color: sl.color,
      key: i,
    };
  });

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {paths.map((p) => (
        <Path
          key={p.key}
          d={p.d}
          fill={p.color}
          stroke="#10121a"
          strokeWidth={2}
        />
      ))}
    </Svg>
  );
}
