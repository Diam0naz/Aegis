"use client";

interface SparklineProps {
  history?: number[];
  color?: string; // e.g. "var(--yes)" or "var(--no)" or "var(--primary)"
  width?: number;
  height?: number;
}

export default function Sparkline({
  history = [50, 51, 48, 52, 54, 58, 55, 60, 62],
  color = "var(--primary)",
  width = 60,
  height = 24,
}: SparklineProps) {
  if (history.length < 2) return null;

  const points = history.map((val, index) => {
    const x = (index / (history.length - 1)) * width;
    const y = height - (val / 100) * height; // Price is between 0 and 100
    return { x, y };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");

  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;

  // Unique ID for the gradient to prevent collisions
  const gradId = `sparkline-grad-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <svg width={width} height={height} className="sparkline-svg" aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      {/* Fill Area */}
      <path d={areaPath} fill={`url(#${gradId})`} />
      {/* Stroke Line */}
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
