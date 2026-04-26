"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function AlertBell() {
  const { data: alerts = [] } = useQuery({
    queryKey: ["alerts-count"],
    queryFn: () => api.get("/alerts", { params: { unread_only: true } }).then(r => r.data),
    refetchInterval: 15_000,
  });

  const count = Array.isArray(alerts) ? alerts.filter((a: any) => !a.is_read).length : 0;

  if (count === 0) return null;

  return (
    <span style={{
      marginLeft: "auto",
      background: "#ff3b4e",
      color: "#fff",
      fontSize: 10,
      fontFamily: "var(--font-mono)",
      padding: "2px 6px",
      borderRadius: 10,
      minWidth: 20,
      textAlign: "center",
      boxShadow: "0 0 8px rgba(255,59,78,0.5)",
    }}>
      {count > 99 ? "99+" : count}
    </span>
  );
}
