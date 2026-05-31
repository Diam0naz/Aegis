"use client";

interface SparklineProps {
  history?: number[];
  color?: string;
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

  const points = history.map((val, index) => ({
    x: (index / (history.length - 1)) * width,
    y: height - (val / 100) * height,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg width={width} height={height} className="sparkline-svg" aria-hidden="true">
      <path d={areaPath} fill={color} fillOpacity="0.08" />
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
