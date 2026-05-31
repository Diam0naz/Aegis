"use client";

import { useState } from "react";
import type { OutcomeOption } from "@/lib/mockData";

interface MultiLineChartProps {
  outcomes: OutcomeOption[];
  height?: number;
}

const OUTCOME_COLORS = ["#f59e0b", "#38bdf8", "#ec4899", "#10b981"];

export default function MultiLineChart({ outcomes, height = 240 }: MultiLineChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; val: number; name: string } | null>(null);

  if (!outcomes || outcomes.length === 0) return null;

  const width = 600;
  const pad = { left: 40, right: 20, top: 20, bottom: 30 };
  const cW = width - pad.left - pad.right;
  const cH = height - pad.top - pad.bottom;
  const dataLength = outcomes[0].history.length;

  const getCoords = (history: number[]) =>
    history.map((val, idx) => ({
      x: pad.left + (idx / (dataLength - 1)) * cW,
      y: pad.top + cH - (val / 100) * cH,
      val,
    }));

  const lines = outcomes.map((out, idx) => {
    const coords = getCoords(out.history);
    const linePath = coords.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
    const areaPath = `${linePath} L ${pad.left + cW} ${pad.top + cH} L ${pad.left} ${pad.top + cH} Z`;
    return { ...out, coords, linePath, areaPath, color: OUTCOME_COLORS[idx % OUTCOME_COLORS.length] };
  });

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * width;
    let closestIdx = 0;
    let minDiff = Infinity;
    for (let i = 0; i < dataLength; i++) {
      const px = pad.left + (i / (dataLength - 1)) * cW;
      const diff = Math.abs(svgX - px);
      if (diff < minDiff) { minDiff = diff; closestIdx = i; }
    }
    const lineIdx = hoveredIdx !== null ? hoveredIdx : 0;
    const pt = lines[lineIdx]?.coords[closestIdx];
    if (pt) setHoveredPoint({ x: pt.x, y: pt.y, val: pt.val, name: lines[lineIdx].name });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", borderBottom: "1px solid rgba(255,255,255,0.03)", paddingBottom: "12px" }}>
        {lines.map((line, idx) => (
          <button
            key={line.id}
            onMouseEnter={() => setHoveredIdx(idx)}
            onMouseLeave={() => setHoveredIdx(null)}
            style={{
              display: "flex", alignItems: "center", gap: "8px", padding: "6px 12px",
              background: hoveredIdx === idx ? "rgba(255,255,255,0.04)" : "transparent",
              border: `1.5px solid ${hoveredIdx === idx ? line.color : "rgba(255,255,255,0.05)"}`,
              borderRadius: "4px", transition: "all 0.15s",
              opacity: hoveredIdx === null || hoveredIdx === idx ? 1 : 0.4,
            }}
          >
            <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: line.color, display: "inline-block" }} />
            <span style={{ fontSize: "12px", fontWeight: "600" }}>{line.name}</span>
            <span className="font-mono" style={{ fontSize: "13px", fontWeight: "700", color: line.color, marginLeft: "4px" }}>
              {line.price}%
            </span>
          </button>
        ))}
      </div>

      {/* Chart */}
      <div style={{ position: "relative", width: "100%", overflow: "hidden" }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: "100%", height: "auto", overflow: "visible" }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredPoint(null)}
        >
          {[0, 25, 50, 75, 100].map((level) => {
            const y = pad.top + cH - (level / 100) * cH;
            return (
              <g key={level}>
                <line x1={pad.left} y1={y} x2={pad.left + cW} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="2,4" />
                <text x={pad.left - 8} y={y + 4} fill="var(--text-subtle)" fontSize="10" textAnchor="end" className="font-mono">
                  {level}%
                </text>
              </g>
            );
          })}

          {lines.map((line, idx) => {
            const isHovered = hoveredIdx === idx;
            const isAnyHovered = hoveredIdx !== null;
            return (
              <g key={line.id} opacity={isHovered ? 1 : isAnyHovered ? 0.15 : 0.7} style={{ transition: "opacity 0.2s" }}>
                <path d={line.areaPath} fill={line.color} fillOpacity="0.06" />
                <path d={line.linePath} fill="none" stroke={line.color} strokeWidth={isHovered ? 2.5 : 1.5} strokeLinecap="round" strokeLinejoin="round" />
              </g>
            );
          })}

          {hoveredPoint && (
            <g>
              <line x1={hoveredPoint.x} y1={pad.top} x2={hoveredPoint.x} y2={pad.top + cH} stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeDasharray="2,2" />
              <circle cx={hoveredPoint.x} cy={hoveredPoint.y} r="5" fill={OUTCOME_COLORS[hoveredIdx ?? 0]} stroke="#09090b" strokeWidth="2" />
              <foreignObject
                x={hoveredPoint.x > width / 2 ? hoveredPoint.x - 120 : hoveredPoint.x + 10}
                y={hoveredPoint.y - 40}
                width="110"
                height="50"
              >
                <div style={{ background: "#16161c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "4px", padding: "4px 8px", fontSize: "11px" }}>
                  <div style={{ color: "var(--text-muted)", fontSize: "9px", textTransform: "uppercase" }}>{hoveredPoint.name}</div>
                  <div className="font-mono" style={{ fontWeight: "700", color: "#fff", marginTop: "2px" }}>
                    {hoveredPoint.val}%
                  </div>
                </div>
              </foreignObject>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}
