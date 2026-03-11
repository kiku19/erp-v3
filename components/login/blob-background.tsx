"use client";

import { useRef, useEffect, useCallback } from "react";

interface BlobConfig {
  x: string;
  y: string;
  width: string;
  height: string;
  color: string;
  opacity: number;
  blur: number;
  animation: string;
}

interface WaveConfig {
  amplitude: number;
  frequency: number;
  speed: number;
  centerY: number;
  phaseOffset: number;
  strokeWidth: number;
  opacity: number;
  gradientId: string;
  gradientColors: { color: string; offset: string }[];
}

interface GlowOrbConfig {
  x: string;
  y: string;
  size: string;
  color: string;
  opacity: number;
  blur: number;
  animation: string;
}

const VIEW_WIDTH = 900;
const VIEW_HEIGHT = 900;
const POINT_STEP = 30;

function waveY(wave: WaveConfig, x: number, ampBreath: number): number {
  const primary = Math.sin(wave.frequency * x + wave.phaseOffset);
  const secondary = 0.25 * Math.sin(wave.frequency * 2.3 * x + wave.phaseOffset * 1.5);
  return wave.centerY + wave.amplitude * ampBreath * (primary + secondary);
}

function buildWavePath(wave: WaveConfig, time: number): string {
  const ampBreath = 0.6 + 0.4 * Math.sin(time * wave.speed + wave.phaseOffset);
  const pts: [number, number][] = [];
  for (let x = 0; x <= VIEW_WIDTH; x += POINT_STEP) {
    pts.push([x, waveY(wave, x, ampBreath)]);
  }

  // Catmull-Rom → cubic bezier for smooth C1-continuous curves
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

// --- Dark Panel (left branding) ---

const DARK_BLOBS: BlobConfig[] = [
  {
    x: "-15%", y: "-10%", width: "75%", height: "55%",
    color: "var(--color-blob-indigo)", opacity: 0.4, blur: 80,
    animation: "blob-drift-1 25s ease-in-out infinite",
  },
  {
    x: "55%", y: "50%", width: "65%", height: "48%",
    color: "var(--color-blob-purple)", opacity: 0.3, blur: 70,
    animation: "blob-drift-2 30s ease-in-out infinite",
  },
  {
    x: "-10%", y: "55%", width: "62%", height: "44%",
    color: "var(--color-blob-teal)", opacity: 0.2, blur: 75,
    animation: "blob-drift-3 20s ease-in-out infinite",
  },
  {
    x: "62%", y: "-8%", width: "55%", height: "40%",
    color: "var(--color-blob-violet)", opacity: 0.35, blur: 65,
    animation: "blob-drift-4 28s ease-in-out infinite",
  },
  {
    x: "23%", y: "22%", width: "60%", height: "40%",
    color: "var(--color-blob-deep-blue)", opacity: 0.25, blur: 85,
    animation: "blob-drift-5 22s ease-in-out infinite",
  },
];

const DARK_WAVES: WaveConfig[] = [
  // {
  //   amplitude: 130, frequency: 0.007, speed: 0.003, centerY: 420, phaseOffset: 0,
  //   strokeWidth: 1.5, opacity: 0.3,
  //   gradientId: "dark-wave-1",
  //   gradientColors: [
  //     { color: "var(--color-flow-indigo-light)", offset: "0%" },
  //     { color: "var(--color-flow-indigo)", offset: "35%" },
  //     { color: "var(--color-flow-violet)", offset: "65%" },
  //     { color: "var(--color-flow-violet-fade)", offset: "100%" },
  //   ],
  // },
  // {
  //   amplitude: 80, frequency: 0.01, speed: 0.004, centerY: 460, phaseOffset: 2.5,
  //   strokeWidth: 1.2, opacity: 0.25,
  //   gradientId: "dark-wave-2",
  //   gradientColors: [
  //     { color: "var(--color-flow-indigo-muted-fade)", offset: "0%" },
  //     { color: "var(--color-flow-indigo-muted)", offset: "30%" },
  //     { color: "var(--color-flow-purple)", offset: "70%" },
  //     { color: "var(--color-flow-purple-fade)", offset: "100%" },
  //   ],
  // },
  // {
  //   amplitude: 105, frequency: 0.009, speed: 0.005, centerY: 440, phaseOffset: 4.8,
  //   strokeWidth: 1, opacity: 0.2,
  //   gradientId: "dark-wave-3",
  //   gradientColors: [
  //     { color: "var(--color-flow-teal-fade)", offset: "0%" },
  //     { color: "var(--color-flow-teal)", offset: "40%" },
  //     { color: "var(--color-flow-violet)", offset: "70%" },
  //     { color: "var(--color-flow-violet-fade)", offset: "100%" },
  //   ],
  // },
];

const DARK_ORBS: GlowOrbConfig[] = [
  {
    x: "75%", y: "17%", size: "100px",
    color: "var(--color-flow-indigo)", opacity: 0.3, blur: 25,
    animation: "blob-drift-3 18s ease-in-out infinite",
  },
  {
    x: "8%", y: "42%", size: "120px",
    color: "var(--color-flow-violet)", opacity: 0.25, blur: 30,
    animation: "blob-drift-5 22s ease-in-out infinite",
  },
  {
    x: "47%", y: "78%", size: "90px",
    color: "var(--color-flow-teal)", opacity: 0.2, blur: 22,
    animation: "blob-drift-1 20s ease-in-out infinite",
  },
];

// --- Light Panel (right form) ---

const LIGHT_BLOBS: BlobConfig[] = [
  {
    x: "-18%", y: "-14%", width: "70%", height: "62%",
    color: "var(--color-blob-indigo-light)", opacity: 0.7, blur: 80,
    animation: "blob-drift-1 25s ease-in-out infinite",
  },
  {
    x: "50%", y: "53%", width: "62%", height: "56%",
    color: "var(--color-blob-purple-light)", opacity: 0.6, blur: 70,
    animation: "blob-drift-2 30s ease-in-out infinite",
  },
  {
    x: "25%", y: "22%", width: "56%", height: "45%",
    color: "var(--color-blob-blue-light)", opacity: 0.45, blur: 90,
    animation: "blob-drift-3 20s ease-in-out infinite",
  },
  {
    x: "68%", y: "-6%", width: "50%", height: "42%",
    color: "var(--color-blob-violet-light)", opacity: 0.45, blur: 60,
    animation: "blob-drift-4 28s ease-in-out infinite",
  },
  {
    x: "-6%", y: "60%", width: "52%", height: "45%",
    color: "var(--color-blob-indigo-muted)", opacity: 0.35, blur: 75,
    animation: "blob-drift-5 22s ease-in-out infinite",
  },
];

const LIGHT_WAVES: WaveConfig[] = [
  {
    amplitude: 120, frequency: 0.006, speed: 0.003, centerY: 440, phaseOffset: 1.2,
    strokeWidth: 1.5, opacity: 0.35,
    gradientId: "light-wave-1",
    gradientColors: [
      { color: "var(--color-flow-indigo-muted-fade)", offset: "0%" },
      { color: "var(--color-blob-indigo-muted)", offset: "40%" },
      { color: "var(--color-flow-lavender)", offset: "70%" },
      { color: "var(--color-flow-lavender-fade)", offset: "100%" },
    ],
  },
  {
    amplitude: 70, frequency: 0.011, speed: 0.005, centerY: 470, phaseOffset: 3.6,
    strokeWidth: 1, opacity: 0.25,
    gradientId: "light-wave-2",
    gradientColors: [
      { color: "var(--color-flow-indigo-light)", offset: "0%" },
      { color: "var(--color-flow-indigo)", offset: "30%" },
      { color: "var(--color-flow-violet)", offset: "60%" },
      { color: "var(--color-flow-violet-fade)", offset: "100%" },
    ],
  },
  {
    amplitude: 95, frequency: 0.008, speed: 0.004, centerY: 455, phaseOffset: 5.4,
    strokeWidth: 1.2, opacity: 0.3,
    gradientId: "light-wave-3",
    gradientColors: [
      { color: "var(--color-flow-lavender-fade)", offset: "0%" },
      { color: "var(--color-blob-indigo-light)", offset: "35%" },
      { color: "var(--color-blob-purple-light)", offset: "65%" },
      { color: "var(--color-flow-purple-light-fade)", offset: "100%" },
    ],
  },
];

const LIGHT_ORBS: GlowOrbConfig[] = [
  {
    x: "75%", y: "13%", size: "120px",
    color: "var(--color-flow-indigo)", opacity: 0.2, blur: 30,
    animation: "blob-drift-5 18s ease-in-out infinite",
  },
  {
    x: "10%", y: "78%", size: "150px",
    color: "var(--color-flow-violet)", opacity: 0.2, blur: 35,
    animation: "blob-drift-3 22s ease-in-out infinite",
  },
  {
    x: "44%", y: "6%", size: "100px",
    color: "var(--color-flow-blue-light)", opacity: 0.25, blur: 25,
    animation: "blob-drift-1 20s ease-in-out infinite",
  },
];

interface BlobBackgroundProps {
  variant: "dark" | "light";
}

function BlobBackground({ variant }: BlobBackgroundProps) {
  const blobs = variant === "dark" ? DARK_BLOBS : LIGHT_BLOBS;
  const waves = variant === "dark" ? DARK_WAVES : LIGHT_WAVES;
  const orbs = variant === "dark" ? DARK_ORBS : LIGHT_ORBS;

  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  const frameRef = useRef<number>(0);
  const timeRef = useRef(0);

  const animate = useCallback(() => {
    timeRef.current += 1;
    waves.forEach((wave, i) => {
      const el = pathRefs.current[i];
      if (el) {
        el.setAttribute("d", buildWavePath(wave, timeRef.current));
      }
    });
    frameRef.current = requestAnimationFrame(animate);
  }, [waves]);

  useEffect(() => {
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [animate]);

  return (
    <div
      data-testid={`blob-background-${variant}`}
      className="absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      {/* Large blurred blobs — atmosphere layer */}
      {blobs.map((blob, i) => (
        <div
          key={`blob-${i}`}
          data-blob
          className="absolute rounded-full"
          style={{
            left: blob.x,
            top: blob.y,
            width: blob.width,
            height: blob.height,
            background: `radial-gradient(circle, ${blob.color} 0%, transparent 70%)`,
            opacity: blob.opacity,
            filter: `blur(${blob.blur}px)`,
            animation: blob.animation,
          }}
        />
      ))}

      {/* Sine wave curves — animated with requestAnimationFrame */}
      <svg
        data-waves
        className="absolute inset-0 h-full w-full"
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        fill="none"
        preserveAspectRatio="none"
      >
        <defs>
          {waves.map((wave) => (
            <linearGradient key={wave.gradientId} id={wave.gradientId} x1="0" y1="0" x2="1" y2="0">
              {wave.gradientColors.map((stop, j) => (
                <stop key={j} offset={stop.offset} stopColor={stop.color} />
              ))}
            </linearGradient>
          ))}
        </defs>
        {waves.map((wave, i) => (
          <path
            key={`wave-${i}`}
            ref={(el) => { pathRefs.current[i] = el; }}
            stroke={`url(#${wave.gradientId})`}
            strokeWidth={wave.strokeWidth}
            strokeLinecap="round"
            opacity={wave.opacity}
          />
        ))}
      </svg>

      {/* Glow orbs — highlight layer */}
      {orbs.map((orb, i) => (
        <div
          key={`orb-${i}`}
          data-blob
          className="absolute rounded-full"
          style={{
            left: orb.x,
            top: orb.y,
            width: orb.size,
            height: orb.size,
            background: `radial-gradient(circle, ${orb.color} 0%, transparent 100%)`,
            opacity: orb.opacity,
            filter: `blur(${orb.blur}px)`,
            animation: orb.animation,
          }}
        />
      ))}
    </div>
  );
}

export { BlobBackground, type BlobBackgroundProps };
