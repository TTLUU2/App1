'use client';

/**
 * JourneyProgress — circular progress for a tracked journey, with a
 * little plane flying along the arc.
 *
 *   - Return trip   → full circle (plane orbits 360°)
 *   - One-way trip  → semicircle (plane flies from left over the top
 *                     to the right; 0% at the origin, 100% at the
 *                     destination)
 *
 * Animation:
 *   - On mount (and whenever the target progress changes), the arc +
 *     plane animate from 0 to the target. The trick is a useState
 *     starting at 0; we flip to the real value on the next animation
 *     frame so React paints 0 first and the existing 0.7s CSS
 *     transitions on stroke-dasharray + transform interpolate the
 *     whole journey.
 *   - When progress reaches 100%, the plane celebrates: a small
 *     scale-and-glow keyframe loop kicks in once the arc finishes
 *     drawing (~750ms after mount).
 *
 * Geometry: SVG viewBox 200×200, centre (100,100), radius 80. Plane
 * is a tiny custom path pointing straight up so rotation = tangent
 * exactly (no offset fudging, unlike lucide's Plane which points NE).
 */

import { useEffect, useState, type CSSProperties } from 'react';

interface JourneyProgressProps {
  /** 0–1; clamped internally. */
  progress: number;
  tripType: 'Return' | 'One-way';
  /** Square px size of the rendered widget. */
  size?: number;
  /** Optional content centred in the ring. */
  children?: React.ReactNode;
}

const CX = 100;
const CY = 100;
const R = 80;
const FULL_CIRCUMFERENCE = 2 * Math.PI * R;
const HALF_CIRCUMFERENCE = Math.PI * R;
const TRANSITION: CSSProperties = { transition: 'stroke-dasharray 0.7s ease-out' };
/** Wait for the arc-fill animation to finish before kicking the
 *  celebration keyframe so it doesn't fight the dashoffset tween. */
const CELEBRATE_DELAY_MS = 750;

export function JourneyProgress({
  progress,
  tripType,
  size = 160,
  children,
}: JourneyProgressProps) {
  const clamped = Math.max(0, Math.min(1, progress));
  const isReturn = tripType === 'Return';

  // Animate-on-mount: start at 0, switch to the target on the next
  // frame so CSS transitions interpolate from 0 → target.
  const [displayed, setDisplayed] = useState(0);
  const [celebrating, setCelebrating] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setDisplayed(clamped));
    return () => cancelAnimationFrame(id);
  }, [clamped]);

  useEffect(() => {
    if (clamped < 1) {
      setCelebrating(false);
      return;
    }
    const t = window.setTimeout(() => setCelebrating(true), CELEBRATE_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [clamped]);

  // Position angle in degrees, measured clockwise from north (12 o'clock).
  //   Return:   0° at start → 360° at finish
  //   One-way: −90° (left) → +90° (right), going via north
  const positionAngleDeg = isReturn ? 360 * displayed : -90 + 180 * displayed;

  // Tangent of clockwise motion = positionAngle + 90°.
  const tangentDeg = positionAngleDeg + 90;

  // Cartesian position of the plane on the circle.
  const angleRad = (positionAngleDeg * Math.PI) / 180;
  const planeX = CX + R * Math.sin(angleRad);
  const planeY = CY - R * Math.cos(angleRad);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <style>{`
        @keyframes journey-plane-cheer {
          0%, 100% {
            transform: scale(1);
            filter: drop-shadow(0 0 0 rgba(214, 40, 40, 0));
          }
          50% {
            transform: scale(1.35);
            filter: drop-shadow(0 0 8px rgba(214, 40, 40, 0.6));
          }
        }
        .journey-plane-cheer {
          animation: journey-plane-cheer 1.6s ease-in-out infinite;
          transform-origin: center;
          transform-box: fill-box;
        }
        @keyframes journey-arc-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }
        .journey-arc-pulse {
          animation: journey-arc-pulse 1.6s ease-in-out infinite;
        }
      `}</style>

      <svg
        viewBox="0 0 200 200"
        className="block h-full w-full"
        role="img"
        aria-label={`${Math.round(clamped * 100)}% of the way to your ${tripType.toLowerCase()} goal`}
      >
        {isReturn ? (
          <ReturnArcs progress={displayed} celebrating={celebrating} />
        ) : (
          <OneWayArcs progress={displayed} celebrating={celebrating} />
        )}

        {/* Plane — outer group does the translate+rotate position,
            inner group runs the celebration keyframe so the two
            transforms don't overwrite each other. */}
        <g
          transform={`translate(${planeX} ${planeY}) rotate(${tangentDeg})`}
          style={{ transition: 'transform 0.7s ease-out' }}
        >
          <g className={celebrating ? 'journey-plane-cheer' : ''}>
            <circle
              r="11"
              className="fill-white stroke-[var(--color-ph-red)] dark:fill-zinc-950"
              strokeWidth="1.5"
            />
            <path d="M 0 -7 L -5 5 L 0 2.5 L 5 5 Z" className="fill-[var(--color-ph-red)]" />
          </g>
        </g>
      </svg>

      {children && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          {children}
        </div>
      )}
    </div>
  );
}

function ReturnArcs({ progress, celebrating }: { progress: number; celebrating: boolean }) {
  return (
    <>
      <circle
        cx={CX}
        cy={CY}
        r={R}
        className="fill-none stroke-zinc-200 dark:stroke-zinc-700"
        strokeWidth="6"
      />
      <circle
        cx={CX}
        cy={CY}
        r={R}
        className={
          celebrating
            ? 'journey-arc-pulse fill-none stroke-[var(--color-ph-red)]'
            : 'fill-none stroke-[var(--color-ph-red)]'
        }
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${FULL_CIRCUMFERENCE * progress} ${FULL_CIRCUMFERENCE}`}
        transform={`rotate(-90 ${CX} ${CY})`}
        style={TRANSITION}
      />
    </>
  );
}

function OneWayArcs({ progress, celebrating }: { progress: number; celebrating: boolean }) {
  const arc = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`;
  return (
    <>
      <path d={arc} className="fill-none stroke-zinc-200 dark:stroke-zinc-700" strokeWidth="6" />
      <path
        d={arc}
        className={
          celebrating
            ? 'journey-arc-pulse fill-none stroke-[var(--color-ph-red)]'
            : 'fill-none stroke-[var(--color-ph-red)]'
        }
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${HALF_CIRCUMFERENCE * progress} ${HALF_CIRCUMFERENCE}`}
        style={TRANSITION}
      />
      {/* Endpoint dots: origin (left) and destination (right). */}
      <circle cx={CX - R} cy={CY} r="4" className="fill-zinc-300 dark:fill-zinc-600" />
      <circle cx={CX + R} cy={CY} r="4" className="fill-[var(--color-ph-red)]" />
    </>
  );
}
