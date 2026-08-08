"use client";

import { useMemo } from "react";

export interface SparklineProps {
  /** Array of numeric data points */
  data: number[];
  /** SVG viewbox width (default 120) */
  width?: number;
  /** SVG viewbox height (default 32) */
  height?: number;
  /** Stroke / fill color (CSS color string) */
  color?: string;
  /** Stroke width in SVG units (default 1.8) */
  strokeWidth?: number;
  /** Whether to render a gradient fill area beneath the curve */
  showArea?: boolean;
  /** Unique ID for gradient defs (needed when multiple sparklines coexist) */
  id?: string;
  /** CSS class applied to the root <svg> */
  className?: string;
}

/**
 * Lightweight SVG sparkline chart with optional gradient area fill.
 * Uses cubic bezier smoothing for natural-looking curves and a
 * CSS draw-in animation on mount.
 */
export function Sparkline({
  data,
  width = 120,
  height = 32,
  color = "#10b981",
  strokeWidth = 1.8,
  showArea = true,
  id = "sparkline",
  className,
}: SparklineProps) {
  const padding = strokeWidth / 2 + 1; // keep stroke inside viewBox

  const { pathD, areaD } = useMemo(() => {
    if (data.length < 2) return { pathD: "", areaD: "" };

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1; // avoid div-by-zero

    const xStep = (width - padding * 2) / (data.length - 1);
    const yScale = height - padding * 2;

    // Map data → SVG points
    const points: [number, number][] = data.map((v, i) => [
      padding + i * xStep,
      padding + yScale - ((v - min) / range) * yScale,
    ]);

    // Build smooth cubic bezier path (Catmull-Rom → cubic Bezier)
    let d = `M ${points[0][0]} ${points[0][1]}`;

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(i - 1, 0)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(i + 2, points.length - 1)];

      // Catmull-Rom tangent → bezier control points (tension = 0)
      const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
      const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
      const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
      const cp2y = p2[1] - (p3[1] - p1[1]) / 6;

      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2[0]} ${p2[1]}`;
    }

    // Area: same path, then line to bottom-right, bottom-left, close
    const area =
      d +
      ` L ${points[points.length - 1][0]} ${height - padding}` +
      ` L ${points[0][0]} ${height - padding} Z`;

    return { pathD: d, areaD: area };
  }, [data, width, height, padding]);

  if (data.length < 2) return null;

  const gradId = `${id}-grad`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={className}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {showArea && areaD && (
        <path
          d={areaD}
          fill={`url(#${gradId})`}
          className="sparkline-area"
        />
      )}

      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="sparkline-line"
      />
    </svg>
  );
}

/* ---------- Status-based color helpers ---------- */

/** Return a sparkline color based on deployment status. */
export function sparklineColor(status: string): string {
  switch (status) {
    case "running":
      return "#10b981"; // emerald-500
    case "failed":
    case "dead":
      return "#ef4444"; // red-500
    default:
      return "#a1a1aa"; // zinc-400
  }
}

/* ---------- Time-series data generation ---------- */

/**
 * Generate a realistic time-series data array centered around `base`,
 * with `count` data points and per-step jitter in `[-jitter, +jitter]`.
 * Uses a seeded approach so the same key always produces the same initial
 * series (but callers can rotate by appending a tick suffix).
 */
export function generateTimeSeries(
  base: number,
  count: number,
  jitter: number,
  seed: string,
): number[] {
  const result: number[] = [];
  let current = base;
  for (let i = 0; i < count; i++) {
    // Simple deterministic-ish hash for this index
    let h = 0;
    const s = `${seed}:${i}`;
    for (let j = 0; j < s.length; j++) {
      h = (Math.imul(31, h) + s.charCodeAt(j)) | 0;
    }
    h ^= h << 13;
    h ^= h >> 17;
    h ^= h << 5;
    const rand = ((h >>> 0) % 10000) / 10000; // [0, 1)
    const delta = (rand - 0.5) * 2 * jitter; // [-jitter, +jitter]
    current = Math.max(0, Math.min(100, current + delta));
    // Gently pull back toward base to avoid drift
    current = current + (base - current) * 0.15;
    result.push(Math.round(current * 10) / 10);
  }
  return result;
}

/**
 * Produce a slightly-shifted copy of an existing time-series by
 * appending one new data point (and dropping the oldest), so
 * the sparkline appears to "tick" forward on refresh.
 */
export function tickTimeSeries(
  series: number[],
  base: number,
  jitter: number,
  tickCount: number,
): number[] {
  const last = series[series.length - 1] ?? base;
  // Simple pseudo-random based on tickCount
  let h = Math.imul(1103515245, tickCount) + 12345;
  h = (h ^ (h >>> 16)) & 0x7fffffff;
  const rand = h / 0x7fffffff;
  const delta = (rand - 0.5) * 2 * jitter;
  let next = last + delta;
  next = next + (base - next) * 0.15;
  next = Math.max(0, Math.min(100, next));
  return [...series.slice(1), Math.round(next * 10) / 10];
}
