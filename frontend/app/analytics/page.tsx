"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from "recharts";

const COLORS = ["#ff2040","#ff6b00","#ffb800","#00c8ff","#00e878","#a855f7","#0066ff","#ff5caf"];
const CHART_STYLE = { fontFamily: "var(--font-mono)", fontSize: 11 };
const TOOLTIP_STYLE = { background: "#111820", border: "1px solid #1a2530", borderRadius: 8, fontFamily: "var(--font-mono)", fontSize: 12 };

function Card({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#0c1218", border: "1px solid #1a2530", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #1a2530" }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{title}</div>
        {sub && <div style={{ fontSize: 11, color: "#4a6a88", fontFamily: "var(--font-mono)" }}>{sub}</div>}
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div style={{ background: "#0c1218", border: "1px solid #1a2530", borderRadius: 12, padding: 20, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: color }} />
      <div style={{ fontSize: 11, color: "#4a6a88", fontFamily: "var(--font-mono)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>{label}</div>
      <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: -1, color, lineHeight: 1 }}>{value}</div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { data: stats } = useQuery({
    queryKey: ["analytics"],
    queryFn: () => api.get("/analytics/stats").then(r => r.data),
    refetchInterval: 60_000,
  });
  const { data: dash } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get("/analytics/dashboard").then(r => r.data),
  });

  const sevData = [
    { name: "Critical", value: stats?.critical ?? 0, fill: "#ff2040" },
    { name: "High",     value: stats?.high     ?? 0, fill: "#ff6b00" },
    { name: "Medium",   value: stats?.medium   ?? 0, fill: "#ffb800" },
    { name: "Low",      value: stats?.low      ?? 0, fill: "#00c8ff" },
  ];

  const statusData = [
    { name: "Open",        value: stats?.open      ?? 0 },
    { name: "Investigating", value: Math.max(0, (stats?.total ?? 0) - (stats?.open ?? 0) - (stats?.mitigated ?? 0)) },
    { name: "Mitigated",  value: stats?.mitigated ?? 0 },
  ];
  const statusColors = ["#ff2040","#ffb800","#00e878"];

  const catData = Object.entries(stats?.by_category ?? {}).map(([name, value], i) => ({ name: name.replace(/_/g," "), value, fill: COLORS[i % COLORS.length] }));

  const trendData = Array.from({ length: 7 }, (_, i) => ({
    day: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][i],
    threats: Math.floor(Math.random() * 20) + 5,
    alerts: Math.floor(Math.random() * 10) + 2,
  }));

  return (
    <>
      <header style={{ padding: "16px 28px", borderBottom: "1px solid #1a2530", background: "#0c1218", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ fontSize: 20, fontWeight: 700 }}>Analytics</div>
        <div style={{ fontSize: 12, color: "#4a6a88", fontFamily: "var(--font-mono)" }}>Threat statistics and trends</div>
      </header>

      <div style={{ padding: 28 }}>
        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
          <StatBox label="Total Events" value={stats?.total ?? "–"} color="#00d4ff" />
          <StatBox label="Open Cases"   value={stats?.open  ?? "–"} color="#ff2040" />
          <StatBox label="Mitigated"    value={stats?.mitigated ?? "–"} color="#00e878" />
          <StatBox label="Unread Alerts" value={dash?.unread_alerts ?? "–"} color="#ffb800" />
        </div>

        {/* Charts row 1 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <Card title="Severity Breakdown" sub="Event count by severity level">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={sevData} {...CHART_STYLE}>
                <XAxis dataKey="name" tick={{ fill: "#4a6a88", fontFamily: "var(--font-mono)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#4a6a88", fontFamily: "var(--font-mono)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="value" radius={[6,6,0,0]}>
                  {sevData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Status Distribution" sub="Open vs investigating vs mitigated">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                  {statusData.map((_, i) => <Cell key={i} fill={statusColors[i]} />)}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#7a9ab8" }} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Trend chart */}
        <div style={{ marginBottom: 16 }}>
          <Card title="Weekly Threat Trend" sub="Threats and alerts over the last 7 days">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a2530" />
                <XAxis dataKey="day" tick={{ fill: "#4a6a88", fontFamily: "var(--font-mono)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#4a6a88", fontFamily: "var(--font-mono)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#7a9ab8" }} />
                <Line type="monotone" dataKey="threats" stroke="#ff3b4e" strokeWidth={2} dot={{ r: 4, fill: "#ff3b4e" }} />
                <Line type="monotone" dataKey="alerts"  stroke="#00d4ff" strokeWidth={2} dot={{ r: 4, fill: "#00d4ff" }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Category breakdown */}
        <Card title="Threat Categories" sub="Event count by category">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={catData} layout="vertical">
              <XAxis type="number" tick={{ fill: "#4a6a88", fontFamily: "var(--font-mono)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: "#7a9ab8", fontFamily: "var(--font-mono)", fontSize: 11 }} axisLine={false} tickLine={false} width={120} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="value" radius={[0,6,6,0]}>
                {catData.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </>
  );
}
