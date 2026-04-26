"use client";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Area, AreaChart,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

const MONO = "var(--font-mono)";

function buildWeekBuckets(threats: any[]) {
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    const label = d.toLocaleDateString("en", { month: "short", day: "numeric" });
    const dateStr = d.toDateString();
    const count = threats.filter(t => {
      try { return new Date(t.detected_at).toDateString() === dateStr; } catch { return false; }
    }).length;
    return { day: label, threats: count || 0 };
  });
}

export function ThreatTimelineChart() {
  const { data: threats = [] } = useQuery({
    queryKey: ["threats-timeline"],
    queryFn: () => api.get("/threats", { params: { limit: 200 } }).then(r => r.data),
    refetchInterval: 60_000,
  });

  const data = buildWeekBuckets(threats);

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="threatGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.18} />
            <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1a2530" />
        <XAxis
          dataKey="day"
          tick={{ fill: "#4a6a88", fontFamily: MONO, fontSize: 10 }}
          axisLine={false} tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fill: "#4a6a88", fontFamily: MONO, fontSize: 10 }}
          axisLine={false} tickLine={false}
        />
        <Tooltip
          contentStyle={{
            background: "#111820", border: "1px solid #1a2530",
            borderRadius: 8, fontFamily: MONO, fontSize: 12, color: "#e8f0f8",
          }}
          labelStyle={{ color: "#7a9ab8" }}
        />
        <Area
          type="monotone" dataKey="threats"
          stroke="#00d4ff" strokeWidth={2}
          fill="url(#threatGrad)"
          dot={{ r: 4, fill: "#00d4ff", strokeWidth: 0 }}
          activeDot={{ r: 6, fill: "#00d4ff" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
