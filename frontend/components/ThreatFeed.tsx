"use client";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { wsClient } from "@/lib/ws";
import { useAuthStore } from "@/lib/auth";
import { formatDistanceToNow } from "date-fns";

const SEV_COLOR: Record<string, string> = {
  critical: "#ff2040", high: "#ff6b00", medium: "#ffb800", low: "#00c8ff", info: "#6b7fa8",
};

interface Threat {
  id: number;
  title: string;
  severity: string;
  category: string;
  source_ip?: string;
  destination_ip?: string;
  score?: number;
  detected_at: string;
}

export function ThreatFeed() {
  const { token } = useAuthStore();
  const [live, setLive] = useState<Threat[]>([]);

  const { data: threats = [] } = useQuery<Threat[]>({
    queryKey: ["threats-feed"],
    queryFn: () => api.get("/threats", { params: { limit: 12 } }).then(r => r.data),
    refetchInterval: 20_000,
  });

  // Seed live feed from API on load
  useEffect(() => {
    if (threats.length) setLive(threats.slice(0, 12));
  }, [threats]);

  // WebSocket live push
  useEffect(() => {
    if (!token) return;
    wsClient.connect(token);
    const off = wsClient.on((msg) => {
      if (msg.type === "new_threat" && msg.data) {
        setLive(prev => [msg.data as Threat, ...prev].slice(0, 20));
      }
    });
    return off;
  }, [token]);

  return (
    <div style={{ background: "#0c1218", border: "1px solid #1a2530", borderRadius: 12, overflow: "hidden", marginBottom: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 20px", borderBottom: "1px solid #1a2530" }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ff3b4e", boxShadow: "0 0 10px #ff3b4e", animation: "pulse 1s infinite" }} />
        <div style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>Live Threat Feed</div>
        <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "#4a6a88" }}>
          {live.length} events
        </div>
      </div>

      {/* Feed items */}
      <div style={{ maxHeight: 260, overflowY: "auto" }}>
        {live.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "#4a6a88" }}>
            <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.4 }}>📡</div>
            <div style={{ fontSize: 13, fontFamily: "var(--font-mono)" }}>Monitoring active — waiting for events</div>
          </div>
        ) : (
          live.map((t, i) => (
            <div
              key={`${t.id}-${i}`}
              style={{
                display: "flex", alignItems: "center", gap: 12, padding: "10px 20px",
                borderBottom: "1px solid #1a2530", cursor: "pointer",
                transition: "background 0.15s",
                animation: i === 0 ? "slideIn 0.4s ease" : "none",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              {/* Severity dot */}
              <div style={{
                width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                background: SEV_COLOR[t.severity] || "#888",
                boxShadow: `0 0 6px ${SEV_COLOR[t.severity] || "#888"}`,
              }} />

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {t.title}
                </div>
                <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "#4a6a88", marginTop: 2 }}>
                  {t.source_ip || "Unknown"} → {t.destination_ip || "Internal"} · {(t.category || "").replace(/_/g, " ")}
                </div>
              </div>

              {/* Score badge */}
              {t.score != null && (
                <div style={{
                  fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700,
                  color: t.score >= 8 ? "#ff2040" : t.score >= 5 ? "#ffb800" : "#00c8ff",
                  minWidth: 32, textAlign: "right",
                }}>
                  {t.score.toFixed(1)}
                </div>
              )}

              {/* Time */}
              <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "#4a6a88", flexShrink: 0, minWidth: 60, textAlign: "right" }}>
                {t.detected_at ? formatDistanceToNow(new Date(t.detected_at), { addSuffix: true }) : "just now"}
              </div>
            </div>
          ))
        )}
      </div>

      <style>{`
        @keyframes slideIn { from { opacity:0; transform: translateX(-10px); } to { opacity:1; transform: translateX(0); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </div>
  );
}
