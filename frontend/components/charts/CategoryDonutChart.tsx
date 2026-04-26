"use client";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const COLORS = [
  "#00d4ff", "#ff3b4e", "#ff7a1a", "#ffd94a",
  "#00e878", "#a855f7", "#0066ff", "#ff5caf",
];

const MONO = "var(--font-mono)";

interface Props {
  data?: Record<string, number>;
}

export function CategoryDonutChart({ data }: Props) {
  const chartData = Object.entries(data ?? {})
    .map(([name, value]) => ({ name: name.replace(/_/g, " "), value }))
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value);

  if (!chartData.length) {
    return (
      <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "#4a6a88", fontFamily: MONO, fontSize: 12 }}>
        No category data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%" cy="45%"
          innerRadius={50} outerRadius={78}
          paddingAngle={3}
          dataKey="value"
        >
          {chartData.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: "#111820", border: "1px solid #1a2530",
            borderRadius: 8, fontFamily: MONO, fontSize: 12, color: "#e8f0f8",
          }}
        />
        <Legend
          iconType="circle" iconSize={8}
          wrapperStyle={{ fontFamily: MONO, fontSize: 10, color: "#7a9ab8" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
