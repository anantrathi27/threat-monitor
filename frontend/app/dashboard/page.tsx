"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ThreatFeed } from "@/components/ThreatFeed";
import { ThreatTimelineChart } from "@/components/charts/ThreatTimelineChart";
import { CategoryDonutChart } from "@/components/charts/CategoryDonutChart";
import { formatDistanceToNow } from "date-fns";

const SEV_COLORS: Record<string, string> = {
  critical: "#ff2040", high: "#ff6b00", medium: "#ffb800", low: "#00c8ff",
};

function StatCard({ label, value, color, sub }: { label: string; value: number | string; color: string; sub?: string }) {
  return (
    <div style={{ background: "#0c1218", border: "1px solid #1a2530", borderRadius: 12, padding: 20, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: color }} />
      <div style={{ fontSize: 11, color: "#4a6a88", fontFamily: "var(--font-mono)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>{label}</div>
      <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: -1, color, lineHeight: 1, marginBottom: 8 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "#4a6a88" }}>{sub}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const { data: dash } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get("/analytics/dashboard").then(r => r.data),
    refetchInterval: 30_000,
  });

  const stats = dash?.threat_stats;

  return (
    <>
      {/* Topbar */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 28px", borderBottom: "1px solid #1a2530", background: "#0c1218", position: "sticky", top: 0, zIndex: 100 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.3 }}>Dashboard</div>
          <div style={{ fontSize: 12, color: "#4a6a88", fontFamily: "var(--font-mono)" }}>Real-time threat overview</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "#4a6a88" }}>Last updated: {new Date().toLocaleTimeString()}</div>
        </div>
      </header>

      <div style={{ padding: 28 }}>
        {/* Stat Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
          <StatCard label="Critical Threats" value={stats?.critical ?? "–"} color="#ff2040" sub="Needs immediate action" />
          <StatCard label="High Severity" value={stats?.high ?? "–"} color="#ff6b00" sub="Active open events" />
          <StatCard label="Total Events" value={stats?.total ?? "–"} color="#ffb800" sub="All time" />
          <StatCard label="Mitigated" value={stats?.mitigated ?? "–"} color="#00e878" sub="Resolved threats" />
        </div>

        {/* Live Feed */}
        <ThreatFeed />

        {/* Charts */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 24 }}>
          <div style={{ background: "#0c1218", border: "1px solid #1a2530", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #1a2530" }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Threat Timeline</div>
              <div style={{ fontSize: 11, color: "#4a6a88", fontFamily: "var(--font-mono)" }}>Last 7 days</div>
            </div>
            <div style={{ padding: 20 }}><ThreatTimelineChart /></div>
          </div>
          <div style={{ background: "#0c1218", border: "1px solid #1a2530", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #1a2530" }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>By Category</div>
              <div style={{ fontSize: 11, color: "#4a6a88", fontFamily: "var(--font-mono)" }}>Distribution</div>
            </div>
            <div style={{ padding: 20 }}><CategoryDonutChart data={stats?.by_category} /></div>
          </div>
        </div>

        {/* Recent Threats Table */}
        <div style={{ background: "#0c1218", border: "1px solid #1a2530", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #1a2530" }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Recent Threats</div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  {["Event","Severity","Category","Source IP","Score","Status","Time"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, fontFamily: "var(--font-mono)", color: "#4a6a88", letterSpacing: 1, textTransform: "uppercase", borderBottom: "1px solid #1a2530" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dash?.recent_threats?.map((t: any) => (
                  <tr key={t.id} style={{ borderBottom: "1px solid #1a2530" }}>
                    <td style={{ padding: "12px 16px", fontWeight: 600, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ padding: "3px 8px", borderRadius: 4, fontSize: 11, fontFamily: "var(--font-mono)", fontWeight: 700, textTransform: "uppercase", background: `${SEV_COLORS[t.severity]}20`, color: SEV_COLORS[t.severity], border: `1px solid ${SEV_COLORS[t.severity]}50` }}>{t.severity}</span>
                    </td>
                    <td style={{ padding: "12px 16px", color: "#7a9ab8", fontSize: 12 }}>{t.category?.replace("_"," ")}</td>
                    <td style={{ padding: "12px 16px" }}>
                      {t.source_ip ? <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#00d4ff", background: "rgba(0,212,255,0.07)", padding: "2px 6px", borderRadius: 4 }}>{t.source_ip}</span> : <span style={{ color: "#4a6a88" }}>–</span>}
                    </td>
                    <td style={{ padding: "12px 16px", fontFamily: "var(--font-mono)", fontSize: 12, color: (t.score ?? 0) >= 8 ? "#ff2040" : (t.score ?? 0) >= 5 ? "#ffb800" : "#00c8ff" }}>{(t.score ?? 0).toFixed(1)}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ padding: "3px 8px", borderRadius: 4, fontSize: 11, fontFamily: "var(--font-mono)", background: t.status === "open" ? "rgba(255,32,64,0.1)" : t.status === "mitigated" ? "rgba(0,232,120,0.1)" : "rgba(255,184,0,0.1)", color: t.status === "open" ? "#ff6b7a" : t.status === "mitigated" ? "#00e878" : "#ffd94a" }}>{t.status}</span>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 11, fontFamily: "var(--font-mono)", color: "#4a6a88" }}>{t.detected_at ? formatDistanceToNow(new Date(t.detected_at), { addSuffix: true }) : "–"}</td>
                  </tr>
                )) ?? (
                  <tr><td colSpan={7} style={{ textAlign: "center", padding: 40, color: "#4a6a88", fontFamily: "var(--font-mono)" }}>Loading threats…</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
