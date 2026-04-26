"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth";
import { api } from "@/lib/api";
import toast from "react-hot-toast";

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", username: "" });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email: form.email, password: form.password });
      setAuth(data.access_token, data.refresh_token, data.user);
      toast.success("Welcome back!");
      router.push("/dashboard");
    } catch {
      toast.error("Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/register", form);
      setAuth(data.access_token, data.refresh_token, data.user);
      toast.success("Account created!");
      router.push("/dashboard");
    } catch {
      toast.error("Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 1 }}>
      <div style={{ width: 420, background: "#0c1218", border: "1px solid #1a2530", borderRadius: 16, padding: 40, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg,#00d4ff,#0066ff,#a855f7)" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: "linear-gradient(135deg,#00d4ff,#0066ff)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🛡️</div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>CyberShield</div>
            <div style={{ fontSize: 11, color: "#4a6a88", fontFamily: "var(--font-mono)", letterSpacing: 2 }}>THREAT MONITOR v1.0</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, background: "#111820", borderRadius: 8, padding: 4, marginBottom: 28 }}>
          {(["login","register"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: "8px 0", borderRadius: 6, border: "none", cursor: "pointer", fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: 13, background: tab === t ? "#1a2530" : "transparent", color: tab === t ? "#e8f0f8" : "#4a6a88", transition: "all 0.15s" }}>
              {t === "login" ? "Sign In" : "Register"}
            </button>
          ))}
        </div>

        <form onSubmit={tab === "login" ? handleLogin : handleRegister}>
          {tab === "register" && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 11, fontFamily: "var(--font-mono)", color: "#4a6a88", marginBottom: 6, letterSpacing: 0.5 }}>USERNAME</label>
              <input required type="text" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                style={{ width: "100%", background: "#111820", border: "1px solid #1a2530", borderRadius: 8, padding: "11px 14px", color: "#e8f0f8", fontFamily: "var(--font-mono)", fontSize: 13, outline: "none" }} placeholder="analyst_01" />
            </div>
          )}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 11, fontFamily: "var(--font-mono)", color: "#4a6a88", marginBottom: 6, letterSpacing: 0.5 }}>EMAIL</label>
            <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              style={{ width: "100%", background: "#111820", border: "1px solid #1a2530", borderRadius: 8, padding: "11px 14px", color: "#e8f0f8", fontFamily: "var(--font-mono)", fontSize: 13, outline: "none" }} placeholder="analyst@cybershield.io" />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 11, fontFamily: "var(--font-mono)", color: "#4a6a88", marginBottom: 6, letterSpacing: 0.5 }}>PASSWORD</label>
            <input required type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              style={{ width: "100%", background: "#111820", border: "1px solid #1a2530", borderRadius: 8, padding: "11px 14px", color: "#e8f0f8", fontFamily: "var(--font-mono)", fontSize: 13, outline: "none" }} placeholder="••••••••" />
          </div>
          <button type="submit" disabled={loading}
            style={{ width: "100%", padding: "12px 0", background: "#00d4ff", color: "#000", border: "none", borderRadius: 10, fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 14, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Please wait…" : tab === "login" ? "Sign In →" : "Create Account →"}
          </button>
        </form>
      </div>
    </div>
  );
}
