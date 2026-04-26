"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

// Country → approximate SVG coordinates on a 860×440 viewBox world map
const GEO_COORDS: Record<string, [number, number]> = {
  US: [160, 160], CN: [640, 175], RU: [580, 110], DE: [450, 140],
  GB: [430, 130], FR: [440, 148], NL: [448, 135], UA: [510, 140],
  IN: [598, 210], BR: [240, 290], AU: [690, 340], JP: [700, 175],
  KR: [680, 175], SG: [655, 255], NG: [460, 250], ZA: [490, 320],
  CA: [140, 130], MX: [150, 210], AR: [220, 330], IT: [460, 158],
  ES: [430, 162], TR: [520, 160], IL: [516, 178], SA: [540, 210],
  PK: [590, 195], IR: [555, 185], EG: [510, 195], TH: [645, 235],
};

const SEV_COLOR: Record<string, string> = {
  critical: "#ff2040", high: "#ff6b00", medium: "#ffb800", low: "#00c8ff",
};

export function ThreatMap() {
  const { data: threats = [] } = useQuery({
    queryKey: ["threats-map"],
    queryFn: () => api.get("/threats", { params: { limit: 50 } }).then(r => r.data),
    refetchInterval: 30_000,
  });

  // Group attacks by country
  const points: Array<{ x: number; y: number; count: number; severity: string; country: string }> = [];
  const seen = new Map<string, { count: number; severity: string }>();

  threats.forEach((t: any) => {
    const country = t.geo_country || "US";
    const existing = seen.get(country);
    if (!existing) {
      seen.set(country, { count: 1, severity: t.severity });
    } else {
      const sevOrder = ["critical","high","medium","low","info"];
      const worse = sevOrder.indexOf(t.severity) < sevOrder.indexOf(existing.severity) ? t.severity : existing.severity;
      seen.set(country, { count: existing.count + 1, severity: worse });
    }
  });

  seen.forEach((val, country) => {
    const coords = GEO_COORDS[country];
    if (coords) {
      points.push({ x: coords[0], y: coords[1], count: val.count, severity: val.severity, country });
    }
  });

  return (
    <div style={{ background: "#0c1218", border: "1px solid #1a2530", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #1a2530", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Threat Origin Map</div>
          <div style={{ fontSize: 11, color: "#4a6a88", fontFamily: "var(--font-mono)" }}>Attack source geolocation</div>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          {Object.entries(SEV_COLOR).map(([sev, color]) => (
            <div key={sev} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, fontFamily: "var(--font-mono)", color: "#7a9ab8" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
              {sev}
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: "12px 20px 20px", position: "relative" }}>
        <svg viewBox="0 0 860 440" style={{ width: "100%", height: "auto", display: "block" }}>
          {/* Background */}
          <rect width="860" height="440" fill="#060a0f" rx="8" />

          {/* Grid lines (simplified lat/lon) */}
          {[0.2,0.4,0.6,0.8].map(t => (
            <g key={t}>
              <line x1={t*860} y1={0} x2={t*860} y2={440} stroke="#1a2530" strokeWidth={0.5} />
              <line x1={0} y1={t*440} x2={860} y2={t*440} stroke="#1a2530" strokeWidth={0.5} />
            </g>
          ))}

          {/* Simplified world outline paths */}
          {/* North America */}
          <path d="M80,80 L220,80 L240,110 L230,160 L200,200 L180,240 L150,250 L120,230 L90,200 L70,160 L75,120 Z" fill="#111820" stroke="#1a2530" strokeWidth={0.8} />
          {/* South America */}
          <path d="M180,250 L250,250 L270,280 L260,330 L240,370 L210,380 L190,360 L175,320 L170,290 Z" fill="#111820" stroke="#1a2530" strokeWidth={0.8} />
          {/* Europe */}
          <path d="M400,100 L480,100 L495,120 L490,155 L465,175 L435,175 L415,160 L400,140 Z" fill="#111820" stroke="#1a2530" strokeWidth={0.8} />
          {/* Africa */}
          <path d="M430,180 L510,180 L530,210 L520,270 L500,320 L475,340 L450,320 L430,280 L420,240 L425,210 Z" fill="#111820" stroke="#1a2530" strokeWidth={0.8} />
          {/* Russia */}
          <path d="M490,70 L720,70 L740,90 L730,120 L700,130 L620,130 L550,120 L500,110 Z" fill="#111820" stroke="#1a2530" strokeWidth={0.8} />
          {/* Asia */}
          <path d="M530,120 L730,120 L760,150 L750,200 L720,230 L680,250 L640,260 L590,250 L555,220 L540,190 L530,160 Z" fill="#111820" stroke="#1a2530" strokeWidth={0.8} />
          {/* Australia */}
          <path d="M650,300 L750,300 L770,330 L760,370 L730,390 L690,380 L660,360 L645,330 Z" fill="#111820" stroke="#1a2530" strokeWidth={0.8} />

          {/* Attack lines + pulsing dots */}
          {points.map((p, i) => {
            const color = SEV_COLOR[p.severity] || "#888";
            const r = Math.min(3 + p.count * 2, 14);
            // Draw line from attack origin towards center (simulated target ~200,200)
            return (
              <g key={i}>
                <line
                  x1={p.x} y1={p.y} x2={200} y2={200}
                  stroke={color} strokeWidth={0.6} strokeOpacity={0.3}
                  strokeDasharray="4 4"
                />
                <circle cx={p.x} cy={p.y} r={r + 4} fill={color} opacity={0.08} />
                <circle cx={p.x} cy={p.y} r={r} fill={color} opacity={0.25} />
                <circle cx={p.x} cy={p.y} r={Math.max(r - 2, 3)} fill={color} opacity={0.7} />
                <text x={p.x} y={p.y - r - 4} textAnchor="middle" fill={color} fontSize={9} fontFamily="Space Mono" opacity={0.8}>
                  {p.country}
                </text>
              </g>
            );
          })}

          {/* Home target marker */}
          <circle cx={200} cy={200} r={6} fill="none" stroke="#00d4ff" strokeWidth={1.5} />
          <circle cx={200} cy={200} r={3} fill="#00d4ff" />
          <circle cx={200} cy={200} r={14} fill="none" stroke="#00d4ff" strokeWidth={0.5} strokeOpacity={0.4} />
        </svg>

        {points.length === 0 && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8, color: "#4a6a88" }}>
            <div style={{ fontSize: 28, opacity: 0.3 }}>🌐</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>No geo-tagged threats yet</div>
          </div>
        )}
      </div>
    </div>
  );
}
