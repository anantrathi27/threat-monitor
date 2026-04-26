"use client";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";

const MONO = "var(--font-mono)";

interface Props {
  data?: Array<{ hour: number; count: number }>;
}

export function ActivityHeatmap({ data }: Props) {
  const chartData = data && data.length > 0
    ? data.map(d => ({ name: `${String(d.hour).padStart(2, "0")}:00`, value: d.count }))
    : Array.from({ length: 24 }, (_, i) => ({
        name: `${String(i).padStart(2, "0")}:00`,
        value: Math.floor(Math.random() * 18) + (i >= 8 && i <= 18 ? 10 : 1),
      }));

  const max = Math.max(...chartData.map(d => d.value), 1);

  const getColor = (val: number) => {
    const pct = val / max;
    if (pct >= 0.8) return "#ff2040";
    if (pct >= 0.5) return "#ff6b00";
    if (pct >= 0.25) return "#ffb800";
    return "rgba(0,200,255,0.5)";
  };

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
        <XAxis
          dataKey="name"
          tick={{ fill: "#4a6a88", fontFamily: MONO, fontSize: 9 }}
          axisLine={false} tickLine={false}
          interval={2}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fill: "#4a6a88", fontFamily: MONO, fontSize: 9 }}
          axisLine={false} tickLine={false}
        />
        <Tooltip
          contentStyle={{
            background: "#111820", border: "1px solid #1a2530",
            borderRadius: 8, fontFamily: MONO, fontSize: 11, color: "#e8f0f8",
          }}
          cursor={{ fill: "rgba(255,255,255,0.03)" }}
        />
        <Bar dataKey="value" radius={[3, 3, 0, 0]}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={getColor(entry.value)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
