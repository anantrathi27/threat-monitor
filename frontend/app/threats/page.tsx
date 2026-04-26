"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { formatDistanceToNow } from "date-fns";

const SEV = { critical: "#ff2040", high: "#ff6b00", medium: "#ffb800", low: "#00c8ff", info: "#6b7fa8" };
const SEVS = ["all","critical","high","medium","low"] as const;

export default function ThreatsPage() {
  const [sev, setSev] = useState("all");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title:"", severity:"medium", category:"unknown", source_ip:"", destination_ip:"", description:"" });
  const qc = useQueryClient();

  const { data: threats = [], isLoading } = useQuery({
    queryKey: ["threats", sev, status, search],
    queryFn: () => api.get("/threats", { params: { ...(sev !== "all" ? { severity: sev } : {}), ...(status ? { status } : {}), ...(search ? { search } : {}) } }).then(r => r.data),
    refetchInterval: 15_000,
  });

  const createMutation = useMutation({
    mutationFn: (d: typeof form) => api.post("/threats", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["threats"] }); setShowModal(false); toast.success("Threat reported!"); },
    onError: () => toast.error("Failed to create threat"),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => api.patch(`/threats/${id}`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["threats"] }); toast.success("Status updated"); },
  });

  return (
    <>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 28px", borderBottom: "1px solid #1a2530", background: "#0c1218", position: "sticky", top: 0, zIndex: 100 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>Threat Events</div>
          <div style={{ fontSize: 12, color: "#4a6a88", fontFamily: "var(--font-mono)" }}>{threats.length} events</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search threats, IPs…" style={{ background: "#111820", border: "1px solid #1a2530", borderRadius: 8, padding: "8px 14px", color: "#e8f0f8", fontFamily: "var(--font-mono)", fontSize: 12, outline: "none", width: 220 }} />
          <select value={status} onChange={e => setStatus(e.target.value)} style={{ background: "#111820", border: "1px solid #1a2530", color: "#e8f0f8", padding: "8px 12px", borderRadius: 8, fontFamily: "var(--font-mono)", fontSize: 12, cursor: "pointer", outline: "none" }}>
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="investigating">Investigating</option>
            <option value="mitigated">Mitigated</option>
          </select>
          <button onClick={() => setShowModal(true)} style={{ padding: "8px 16px", background: "#00d4ff", color: "#000", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: 13 }}>+ New Threat</button>
        </div>
      </header>

      <div style={{ padding: 28 }}>
        {/* Severity filter chips */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {SEVS.map(s => (
            <button key={s} onClick={() => setSev(s)} style={{ padding: "5px 14px", borderRadius: 20, fontSize: 12, fontFamily: "var(--font-mono)", cursor: "pointer", border: `1px solid ${sev === s && s !== "all" ? (SEV as any)[s] : sev === s ? "#00d4ff" : "#1a2530"}`, background: sev === s ? `${s !== "all" ? (SEV as any)[s] : "#00d4ff"}18` : "#111820", color: sev === s ? (s !== "all" ? (SEV as any)[s] : "#00d4ff") : "#7a9ab8", transition: "all 0.15s" }}>
              {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        <div style={{ background: "#0c1218", border: "1px solid #1a2530", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  {["#","Title","Severity","Category","Source IP","Dest IP","Score","Status","Detected","Actions"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "10px 14px", fontSize: 11, fontFamily: "var(--font-mono)", color: "#4a6a88", letterSpacing: 1, textTransform: "uppercase", borderBottom: "1px solid #1a2530", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={10} style={{ textAlign: "center", padding: 60, color: "#4a6a88", fontFamily: "var(--font-mono)" }}>Loading…</td></tr>
                ) : threats.length === 0 ? (
                  <tr><td colSpan={10} style={{ textAlign: "center", padding: 60, color: "#4a6a88", fontFamily: "var(--font-mono)" }}>No threats found</td></tr>
                ) : threats.map((t: any) => (
                  <tr key={t.id} style={{ borderBottom: "1px solid #1a2530" }}>
                    <td style={{ padding: "11px 14px", color: "#4a6a88", fontFamily: "var(--font-mono)", fontSize: 11 }}>#{t.id}</td>
                    <td style={{ padding: "11px 14px", fontWeight: 600, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</td>
                    <td style={{ padding: "11px 14px" }}><span style={{ padding: "3px 8px", borderRadius: 4, fontSize: 11, fontFamily: "var(--font-mono)", fontWeight: 700, textTransform: "uppercase", background: `${(SEV as any)[t.severity] || "#888"}20`, color: (SEV as any)[t.severity] || "#888", border: `1px solid ${(SEV as any)[t.severity] || "#888"}50` }}>{t.severity}</span></td>
                    <td style={{ padding: "11px 14px", color: "#7a9ab8", fontSize: 12 }}>{t.category?.replace(/_/g," ")}</td>
                    <td style={{ padding: "11px 14px" }}>{t.source_ip ? <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#00d4ff", background: "rgba(0,212,255,0.07)", padding: "2px 6px", borderRadius: 4 }}>{t.source_ip}</span> : <span style={{ color: "#4a6a88" }}>–</span>}</td>
                    <td style={{ padding: "11px 14px" }}>{t.destination_ip ? <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#7a9ab8", background: "rgba(122,154,184,0.07)", padding: "2px 6px", borderRadius: 4 }}>{t.destination_ip}</span> : <span style={{ color: "#4a6a88" }}>–</span>}</td>
                    <td style={{ padding: "11px 14px", fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: (t.score ?? 0) >= 8 ? "#ff2040" : (t.score ?? 0) >= 5 ? "#ffb800" : "#00c8ff" }}>{(t.score ?? 0).toFixed(1)}</td>
                    <td style={{ padding: "11px 14px" }}><span style={{ padding: "3px 8px", borderRadius: 4, fontSize: 11, fontFamily: "var(--font-mono)", background: t.status === "open" ? "rgba(255,32,64,0.1)" : t.status === "mitigated" ? "rgba(0,232,120,0.1)" : "rgba(255,184,0,0.1)", color: t.status === "open" ? "#ff6b7a" : t.status === "mitigated" ? "#00e878" : "#ffd94a" }}>{t.status}</span></td>
                    <td style={{ padding: "11px 14px", fontSize: 11, fontFamily: "var(--font-mono)", color: "#4a6a88" }}>{t.detected_at ? formatDistanceToNow(new Date(t.detected_at), { addSuffix: true }) : "–"}</td>
                    <td style={{ padding: "11px 14px" }}>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={() => updateStatus.mutate({ id: t.id, status: "investigating" })} style={{ background: "none", border: "1px solid #1a2530", color: "#ffd94a", padding: "3px 8px", borderRadius: 5, cursor: "pointer", fontSize: 11, fontFamily: "var(--font-mono)" }}>Inv.</button>
                        <button onClick={() => updateStatus.mutate({ id: t.id, status: "mitigated" })} style={{ background: "none", border: "1px solid #1a2530", color: "#00e878", padding: "3px 8px", borderRadius: 5, cursor: "pointer", fontSize: 11, fontFamily: "var(--font-mono)" }}>Done</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* New Threat Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div style={{ background: "#0c1218", border: "1px solid #1a2530", borderRadius: 16, width: 560, maxHeight: "80vh", overflowY: "auto" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #1a2530", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Report New Threat</div>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", color: "#4a6a88", cursor: "pointer", fontSize: 20 }}>×</button>
            </div>
            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              {[{ key: "title", label: "Title *", type: "text", placeholder: "e.g. SSH brute force attack" }, { key: "source_ip", label: "Source IP", type: "text", placeholder: "192.168.1.1" }, { key: "destination_ip", label: "Destination IP", type: "text", placeholder: "10.0.0.1" }, { key: "description", label: "Description", type: "text", placeholder: "Detailed description…" }].map(f => (
                <div key={f.key}>
                  <label style={{ display: "block", fontSize: 11, fontFamily: "var(--font-mono)", color: "#4a6a88", marginBottom: 6, letterSpacing: 0.5 }}>{f.label.toUpperCase()}</label>
                  <input type={f.type} value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} style={{ width: "100%", background: "#111820", border: "1px solid #1a2530", borderRadius: 8, padding: "10px 14px", color: "#e8f0f8", fontFamily: "var(--font-mono)", fontSize: 13, outline: "none" }} />
                </div>
              ))}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontFamily: "var(--font-mono)", color: "#4a6a88", marginBottom: 6 }}>SEVERITY</label>
                  <select value={form.severity} onChange={e => setForm(p => ({ ...p, severity: e.target.value }))} style={{ width: "100%", background: "#111820", border: "1px solid #1a2530", color: "#e8f0f8", padding: "10px 12px", borderRadius: 8, fontFamily: "var(--font-mono)", fontSize: 12, cursor: "pointer", outline: "none" }}>
                    {["critical","high","medium","low"].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontFamily: "var(--font-mono)", color: "#4a6a88", marginBottom: 6 }}>CATEGORY</label>
                  <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} style={{ width: "100%", background: "#111820", border: "1px solid #1a2530", color: "#e8f0f8", padding: "10px 12px", borderRadius: 8, fontFamily: "var(--font-mono)", fontSize: 12, cursor: "pointer", outline: "none" }}>
                    {["intrusion","malware","ddos","brute_force","phishing","reconnaissance","data_exfiltration","lateral_movement","unknown"].map(c => <option key={c} value={c}>{c.replace(/_/g," ")}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: 12, background: "#111820", border: "1px solid #1a2530", color: "#7a9ab8", borderRadius: 10, cursor: "pointer", fontWeight: 600 }}>Cancel</button>
                <button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending} style={{ flex: 2, padding: 12, background: "#00d4ff", border: "none", color: "#000", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 14 }}>Report Threat →</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
