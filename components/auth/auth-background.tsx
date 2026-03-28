"use client";

import { useRef, useEffect, useCallback } from "react";

const VW = 1400;
const VH = 900;
const POINT_STEP = 25;

/* ------------------------------------------------------------------ */
/*  Config types                                                       */
/* ------------------------------------------------------------------ */

interface MorphBlobConfig {
  cx: number;
  cy: number;
  baseRadius: number;
  numPoints: number;
  speed: number;
  wobble: number;
  phaseOffset: number;
  opacity: number;
  gradientColors: [string, string];
}

interface FlowCurveConfig {
  amplitude: number;
  frequency: number;
  speed: number;
  centerY: number;
  phaseOffset: number;
  strokeWidth: number;
  opacity: number;
  gradientColors: { color: string; offset: string }[];
}

/* ------------------------------------------------------------------ */
/*  Morphing organic blobs — large soft shapes that slowly deform      */
/* ------------------------------------------------------------------ */

const MORPH_BLOBS: MorphBlobConfig[] = [
  {
    cx: 200, cy: 250, baseRadius: 300, numPoints: 8,
    speed: 0.004, wobble: 80, phaseOffset: 0,
    opacity: 0.55,
    gradientColors: [
      "var(--color-blob-indigo-light)",
      "var(--color-blob-purple-light)",
    ],
  },
  {
    cx: 1200, cy: 600, baseRadius: 350, numPoints: 8,
    speed: 0.003, wobble: 100, phaseOffset: 2.5,
    opacity: 0.45,
    gradientColors: [
      "var(--color-blob-violet-light)",
      "var(--color-blob-blue-light)",
    ],
  },
  {
    cx: 750, cy: 50, baseRadius: 280, numPoints: 7,
    speed: 0.005, wobble: 70, phaseOffset: 5.0,
    opacity: 0.35,
    gradientColors: [
      "var(--color-blob-purple-light)",
      "var(--color-blob-indigo-muted)",
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Flowing gradient curves — thin animated sine-wave paths            */
/* ------------------------------------------------------------------ */

const FLOW_CURVES: FlowCurveConfig[] = [
  {
    amplitude: 180, frequency: 0.004, speed: 0.002, centerY: 300,
    phaseOffset: 0, strokeWidth: 1.8, opacity: 0.18,
    gradientColors: [
      { color: "var(--color-flow-indigo-light)", offset: "0%" },
      { color: "var(--color-flow-indigo)", offset: "35%" },
      { color: "var(--color-flow-violet)", offset: "65%" },
      { color: "var(--color-flow-violet-fade)", offset: "100%" },
    ],
  },
  {
    amplitude: 120, frequency: 0.006, speed: 0.003, centerY: 500,
    phaseOffset: 2.0, strokeWidth: 1.5, opacity: 0.15,
    gradientColors: [
      { color: "var(--color-flow-violet-fade)", offset: "0%" },
      { color: "var(--color-flow-lavender)", offset: "30%" },
      { color: "var(--color-flow-indigo)", offset: "70%" },
      { color: "var(--color-flow-indigo-light)", offset: "100%" },
    ],
  },
  {
    amplitude: 200, frequency: 0.003, speed: 0.0015, centerY: 200,
    phaseOffset: 4.0, strokeWidth: 2, opacity: 0.12,
    gradientColors: [
      { color: "var(--color-flow-indigo-muted-fade)", offset: "0%" },
      { color: "var(--color-flow-purple)", offset: "40%" },
      { color: "var(--color-flow-teal)", offset: "70%" },
      { color: "var(--color-flow-teal-fade)", offset: "100%" },
    ],
  },
  {
    amplitude: 90, frequency: 0.008, speed: 0.004, centerY: 650,
    phaseOffset: 1.5, strokeWidth: 1.2, opacity: 0.15,
    gradientColors: [
      { color: "var(--color-flow-teal-fade)", offset: "0%" },
      { color: "var(--color-flow-teal)", offset: "35%" },
      { color: "var(--color-flow-violet)", offset: "65%" },
      { color: "var(--color-flow-violet-fade)", offset: "100%" },
    ],
  },
  {
    amplitude: 150, frequency: 0.005, speed: 0.0025, centerY: 750,
    phaseOffset: 3.2, strokeWidth: 1.5, opacity: 0.1,
    gradientColors: [
      { color: "var(--color-flow-lavender-fade)", offset: "0%" },
      { color: "var(--color-flow-lavender)", offset: "30%" },
      { color: "var(--color-flow-purple)", offset: "60%" },
      { color: "var(--color-flow-purple-fade)", offset: "100%" },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Path builders                                                      */
/* ------------------------------------------------------------------ */

/** Closed organic shape via Catmull-Rom on polar-coordinate points */
function buildBlobPath(blob: MorphBlobConfig, time: number): string {
  const { cx, cy, baseRadius, numPoints, speed, wobble, phaseOffset } = blob;
  const angleStep = (Math.PI * 2) / numPoints;
  const pts: [number, number][] = [];

  for (let i = 0; i < numPoints; i++) {
    const angle = angleStep * i;
    const noise =
      wobble *
      (Math.sin(time * speed + phaseOffset + i * 0.9) * 0.6 +
        Math.sin(time * speed * 0.7 + phaseOffset * 1.3 + i * 1.4) * 0.4);
    const r = baseRadius + noise;
    pts.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
  }

  const n = pts.length;
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d + " Z";
}

/** Open flowing curve via Catmull-Rom on sine-wave samples */
function buildCurvePath(curve: FlowCurveConfig, time: number): string {
  const ampBreath =
    0.6 + 0.4 * Math.sin(time * curve.speed + curve.phaseOffset);
  const pts: [number, number][] = [];

  for (let x = 0; x <= VW; x += POINT_STEP) {
    const primary = Math.sin(
      curve.frequency * x + curve.phaseOffset + time * curve.speed,
    );
    const secondary =
      0.3 *
      Math.sin(
        curve.frequency * 2.1 * x +
          curve.phaseOffset * 1.5 +
          time * curve.speed * 0.7,
      );
    pts.push([x, curve.centerY + curve.amplitude * ampBreath * (primary + secondary)]);
  }

  const n = pts.length;
  let d = `M${pts[0][0]} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(i + 2, n - 1)];
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${cp1x.toFixed(1)} ${cp1y.toFixed(1)},${cp2x.toFixed(1)} ${cp2y.toFixed(1)},${p2[0]} ${p2[1].toFixed(1)}`;
  }
  return d;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

function AuthBackground() {
  const blobRefs = useRef<(SVGPathElement | null)[]>([]);
  const curveRefs = useRef<(SVGPathElement | null)[]>([]);
  const frameRef = useRef<number>(0);
  const timeRef = useRef(0);

  const animate = useCallback(() => {
    timeRef.current += 1;

    MORPH_BLOBS.forEach((blob, i) => {
      const el = blobRefs.current[i];
      if (el) el.setAttribute("d", buildBlobPath(blob, timeRef.current));
    });

    FLOW_CURVES.forEach((curve, i) => {
      const el = curveRefs.current[i];
      if (el) el.setAttribute("d", buildCurvePath(curve, timeRef.current));
    });

    frameRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [animate]);

  return (
    <div
      data-testid="auth-background"
      className="fixed inset-0 overflow-hidden"
      aria-hidden="true"
    >
      {/* Layer 1 — Blurred morphing blobs (CSS blur for GPU acceleration) */}
      <div className="absolute inset-0" style={{ filter: "blur(80px)" }}>
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox={`0 0 ${VW} ${VH}`}
          preserveAspectRatio="xMidYMid slice"
          fill="none"
        >
          <defs>
            {MORPH_BLOBS.map((blob, i) => (
              <radialGradient key={`bg-${i}`} id={`auth-blob-${i}`}>
                <stop offset="0%" stopColor={blob.gradientColors[0]} />
                <stop offset="100%" stopColor={blob.gradientColors[1]} />
              </radialGradient>
            ))}
          </defs>
          {MORPH_BLOBS.map((blob, i) => (
            <path
              key={`blob-${i}`}
              ref={(el) => {
                blobRefs.current[i] = el;
              }}
              fill={`url(#auth-blob-${i})`}
              opacity={blob.opacity}
            />
          ))}
        </svg>
      </div>

      {/* Layer 2 — Flowing gradient curves */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox={`0 0 ${VW} ${VH}`}
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <defs>
          {FLOW_CURVES.map((curve, i) => (
            <linearGradient
              key={`cg-${i}`}
              id={`auth-curve-${i}`}
              x1="0"
              y1="0"
              x2="1"
              y2="0"
            >
              {curve.gradientColors.map((stop, j) => (
                <stop key={j} offset={stop.offset} stopColor={stop.color} />
              ))}
            </linearGradient>
          ))}
        </defs>
        {FLOW_CURVES.map((curve, i) => (
          <path
            key={`curve-${i}`}
            ref={(el) => {
              curveRefs.current[i] = el;
            }}
            stroke={`url(#auth-curve-${i})`}
            strokeWidth={curve.strokeWidth}
            strokeLinecap="round"
            opacity={curve.opacity}
          />
        ))}
      </svg>
    </div>
  );
}

export { AuthBackground };
