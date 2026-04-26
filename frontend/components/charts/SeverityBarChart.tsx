"use client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const MONO = "var(--font-mono)";
const TOOLTIP_STYLE = {
  background: "#111820", border: "1px solid #1a2530",
  borderRadius: 8, fontFamily: MONO, fontSize: 12, color: "#e8f0f8",
};

interface Props {
  critical?: number;
  high?: number;
  medium?: number;
  low?: number;
}

export function SeverityBarChart({ critical = 0, high = 0, medium = 0, low = 0 }: Props) {
  const data = [
    { name: "Critical", value: critical, fill: "#ff2040" },
    { name: "High",     value: high,     fill: "#ff6b00" },
    { name: "Medium",   value: medium,   fill: "#ffb800" },
    { name: "Low",      value: low,      fill: "#00c8ff" },
  ];

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        <XAxis
          dataKey="name"
          tick={{ fill: "#4a6a88", fontFamily: MONO, fontSize: 10 }}
          axisLine={false} tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fill: "#4a6a88", fontFamily: MONO, fontSize: 10 }}
          axisLine={false} tickLine={false}
        />
        <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
