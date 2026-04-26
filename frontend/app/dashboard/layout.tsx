"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/auth";
import Link from "next/link";
import { AlertBell } from "@/components/AlertBell";

const navItems = [
  { href: "/dashboard", icon: "⬡", label: "Dashboard" },
  { href: "/threats", icon: "⚡", label: "Threats" },
  { href: "/alerts", icon: "🔔", label: "Alerts" },
  { href: "/analytics", icon: "◈", label: "Analytics" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, token, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!token) router.push("/login");
  }, [token, router]);

  if (!token) return null;

  return (
    <div style={{ display: "flex", minHeight: "100vh", position: "relative", zIndex: 1 }}>
      {/* Sidebar */}
      <aside style={{ width: 240, minWidth: 240, background: "#0c1218", borderRight: "1px solid #1a2530", display: "flex", flexDirection: "column", height: "100vh", position: "sticky", top: 0 }}>
        <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid #1a2530" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: "linear-gradient(135deg,#00d4ff,#0066ff)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🛡️</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.5 }}>CyberShield</div>
              <div style={{ fontSize: 10, color: "#4a6a88", fontFamily: "var(--font-mono)", letterSpacing: 2 }}>SOC PLATFORM</div>
            </div>
          </div>
        </div>

        <div style={{ padding: "12px 20px", borderBottom: "1px solid #1a2530", display: "flex", alignItems: "center", gap: 8, fontSize: 11, fontFamily: "var(--font-mono)" }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#00e878", boxShadow: "0 0 8px #00e878", animation: "pulse 2s infinite" }} />
          <span style={{ color: "#00e878" }}>LIVE</span>
          <span style={{ color: "#4a6a88" }}>monitoring active</span>
        </div>

        <nav style={{ padding: "12px 0", flex: 1 }}>
          <div style={{ padding: "4px 20px 4px", fontSize: 10, color: "#4a6a88", letterSpacing: 2, textTransform: "uppercase", fontFamily: "var(--font-mono)", marginTop: 8 }}>Operations</div>
          {navItems.map(item => {
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 20px", textDecoration: "none", color: active ? "#00d4ff" : "#7a9ab8", fontWeight: 500, fontSize: 14, background: active ? "rgba(0,212,255,0.08)" : "transparent", position: "relative", transition: "all 0.15s" }}>
                {active && <div style={{ position: "absolute", left: 0, top: 4, bottom: 4, width: 3, background: "#00d4ff", borderRadius: "0 2px 2px 0" }} />}
                <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>{item.icon}</span>
                {item.label}
                {item.label === "Alerts" && <AlertBell />}
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: "16px 20px", borderTop: "1px solid #1a2530", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#0066ff,#a855f7)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
            {(user?.username || "U")[0].toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.username || "User"}</div>
            <div style={{ fontSize: 11, color: "#4a6a88", fontFamily: "var(--font-mono)" }}>{user?.role}</div>
          </div>
          <button onClick={logout} style={{ background: "none", border: "none", color: "#4a6a88", cursor: "pointer", fontSize: 16 }} title="Logout">↩</button>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {children}
      </div>
    </div>
  );
}
