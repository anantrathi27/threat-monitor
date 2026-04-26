"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { formatDistanceToNow } from "date-fns";

const SEV_COLOR: Record<string,string> = { critical:"#ff2040", high:"#ff6b00", medium:"#ffb800", low:"#00c8ff" };
const SEV_ICON: Record<string,string> = { critical:"🔴", high:"🟠", medium:"🟡", low:"🔵" };

export default function AlertsPage() {
  const qc = useQueryClient();
  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["alerts"],
    queryFn: () => api.get("/alerts").then(r => r.data),
    refetchInterval: 15_000,
  });

  const markRead = useMutation({
    mutationFn: (id: number) => api.patch(`/alerts/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts"] }),
  });

  const markAll = useMutation({
    mutationFn: () => api.post("/alerts/mark-all-read"),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["alerts"] }); toast.success("All alerts marked read"); },
  });

  const unread = alerts.filter((a: any) => !a.is_read).length;

  return (
    <>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 28px", borderBottom: "1px solid #1a2530", background: "#0c1218", position: "sticky", top: 0, zIndex: 100 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>Alerts</div>
          <div style={{ fontSize: 12, color: "#4a6a88", fontFamily: "var(--font-mono)" }}>{unread} unread</div>
        </div>
        <button onClick={() => markAll.mutate()} style={{ padding: "8px 16px", background: "#111820", border: "1px solid #1a2530", color: "#7a9ab8", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>✓ Mark all read</button>
      </header>

      <div style={{ padding: 28 }}>
        {isLoading && <div style={{ textAlign: "center", padding: 60, color: "#4a6a88", fontFamily: "var(--font-mono)" }}>Loading…</div>}
        {!isLoading && alerts.length === 0 && (
          <div style={{ textAlign: "center", padding: 80, color: "#4a6a88" }}>
            <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.4 }}>🔔</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No alerts</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>You're all clear, operator</div>
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {alerts.map((a: any) => (
            <div key={a.id} onClick={() => !a.is_read && markRead.mutate(a.id)} style={{ background: a.is_read ? "#0c1218" : "rgba(0,212,255,0.03)", border: "1px solid #1a2530", borderRadius: 10, padding: "16px 20px", display: "flex", alignItems: "flex-start", gap: 14, cursor: a.is_read ? "default" : "pointer", position: "relative", overflow: "hidden", transition: "border-color 0.2s" }}>
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: SEV_COLOR[a.severity] || "#888" }} />
              <div style={{ width: 36, height: 36, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0, background: `${SEV_COLOR[a.severity] || "#888"}20` }}>{SEV_ICON[a.severity] || "⚠️"}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{a.title}</div>
                <div style={{ fontSize: 12, color: "#7a9ab8", lineHeight: 1.5 }}>{a.message}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
                  <span style={{ padding: "3px 8px", borderRadius: 4, fontSize: 11, fontFamily: "var(--font-mono)", fontWeight: 700, textTransform: "uppercase", background: `${SEV_COLOR[a.severity]}20`, color: SEV_COLOR[a.severity], border: `1px solid ${SEV_COLOR[a.severity]}50` }}>{a.severity}</span>
                  <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "#4a6a88" }}>⏱ {a.created_at ? formatDistanceToNow(new Date(a.created_at), { addSuffix: true }) : "—"}</span>
                  {a.threat_id && <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "#4a6a88" }}>→ Threat #{a.threat_id}</span>}
                </div>
              </div>
              {!a.is_read && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#00d4ff", flexShrink: 0, marginTop: 4 }} />}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
