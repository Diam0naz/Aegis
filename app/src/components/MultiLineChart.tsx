"use client";

import { useState } from "react";
import type { OutcomeOption } from "@/lib/mockData";

interface MultiLineChartProps {
  outcomes: OutcomeOption[];
  height?: number;
}

const OUTCOME_COLORS = [
  "#f59e0b", // Amber
  "#38bdf8", // Sky blue
  "#ec4899", // Pink
  "#10b981", // Emerald
];

export default function MultiLineChart({ outcomes, height = 240 }: MultiLineChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; val: number; name: string } | null>(null);

  if (!outcomes || outcomes.length === 0) return null;

  const width = 600;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Let's assume all histories have the same length (e.g. 30)
  const dataLength = outcomes[0].history.length;

  const getCoordinates = (history: number[]) => {
    return history.map((val, idx) => {
      const x = paddingLeft + (idx / (dataLength - 1)) * chartWidth;
      const y = paddingTop + chartHeight - (val / 100) * chartHeight;
      return { x, y, val };
    });
  };

  const lines = outcomes.map((out, idx) => {
    const coords = getCoordinates(out.history);
    const linePath = coords.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
    const areaPath = `${linePath} L ${paddingLeft + chartWidth} ${paddingTop + chartHeight} L ${paddingLeft} ${paddingTop + chartHeight} Z`;
    return {
      ...out,
      coords,
      linePath,
      areaPath,
      color: OUTCOME_COLORS[idx % OUTCOME_COLORS.length],
    };
  });

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const svgX = (x / rect.width) * width;

    // Find closest index
    let closestIdx = 0;
    let minDiff = Infinity;
    for (let i = 0; i < dataLength; i++) {
      const px = paddingLeft + (i / (dataLength - 1)) * chartWidth;
      const diff = Math.abs(svgX - px);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    }

    // If we're hovering a specific outcome line
    const activeLineIdx = hoveredIdx !== null ? hoveredIdx : 0;
    const activeLine = lines[activeLineIdx];
    if (activeLine && activeLine.coords[closestIdx]) {
      const pt = activeLine.coords[closestIdx];
      setHoveredPoint({
        x: pt.x,
        y: pt.y,
        val: pt.val,
        name: activeLine.name,
      });
    }
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Legend & Hover Controls */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", borderBottom: "1px solid rgba(255,255,255,0.03)", paddingBottom: "12px" }}>
        {lines.map((line, idx) => (
          <button
            key={line.id}
            onMouseEnter={() => setHoveredIdx(idx)}
            onMouseLeave={() => setHoveredIdx(null)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 12px",
              background: hoveredIdx === idx ? "rgba(255,255,255,0.04)" : "transparent",
              border: `1.5px solid ${hoveredIdx === idx ? line.color : "rgba(255,255,255,0.05)"}`,
              borderRadius: "4px",
              transition: "all 0.15s",
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

      {/* SVG MultiLine Chart */}
      <div style={{ position: "relative", width: "100%", overflow: "hidden" }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: "100%", height: "auto", overflow: "visible" }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Grids / Axes */}
          {[0, 25, 50, 75, 100].map((level) => {
            const y = paddingTop + chartHeight - (level / 100) * chartHeight;
            return (
              <g key={level}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={paddingLeft + chartWidth}
                  y2={y}
                  stroke="rgba(255,255,255,0.04)"
                  strokeWidth="1"
                  strokeDasharray="2,4"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 4}
                  fill="var(--text-subtle)"
                  fontSize="10"
                  textAnchor="end"
                  className="font-mono"
                >
                  {level}%
                </text>
              </g>
            );
          })}

          {/* Lines */}
          {lines.map((line, idx) => {
            const isHovered = hoveredIdx === idx;
            const isAnyHovered = hoveredIdx !== null;
            const opacity = isHovered ? 1 : isAnyHovered ? 0.15 : 0.7;
            const strokeWidth = isHovered ? 2.5 : 1.5;

            return (
              <g key={line.id} style={{ transition: "opacity 0.2s" }} opacity={opacity}>
                {/* Area under the line */}
                <defs>
                  <linearGradient id={`area-grad-${line.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={line.color} stopOpacity="0.15" />
                    <stop offset="100%" stopColor={line.color} stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path d={line.areaPath} fill={`url(#area-grad-${line.id})`} />

                {/* Line itself */}
                <path
                  d={line.linePath}
                  fill="none"
                  stroke={line.color}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            );
          })}

          {/* Interactive Tooltip Circle & Vertical Line */}
          {hoveredPoint && (
            <g>
              <line
                x1={hoveredPoint.x}
                y1={paddingTop}
                x2={hoveredPoint.x}
                y2={paddingTop + chartHeight}
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="1.5"
                strokeDasharray="2,2"
              />
              <circle
                cx={hoveredPoint.x}
                cy={hoveredPoint.y}
                r="5"
                fill={OUTCOME_COLORS[hoveredIdx !== null ? hoveredIdx : 0]}
                stroke="#09090b"
                strokeWidth="2"
              />
              {/* Tooltip box */}
              <foreignObject
                x={hoveredPoint.x > width / 2 ? hoveredPoint.x - 120 : hoveredPoint.x + 10}
                y={hoveredPoint.y - 40}
                width="110"
                height="50"
              >
                <div
                  style={{
                    background: "#16161c",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "4px",
                    padding: "4px 8px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                    fontSize: "11px",
                  }}
                >
                  <div style={{ color: "var(--text-muted)", fontSize: "9px", textTransform: "uppercase" }}>
                    {hoveredPoint.name}
                  </div>
                  <div className="font-mono" style={{ fontWeight: "700", color: "#fff", marginTop: "2px" }}>
                    Probability: {hoveredPoint.val}%
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
