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
 * Geometry: SVG viewBox 200×200, centre (100,100), radius 80.
 *   - Plane position is in (sin, -cos) of the angle from north,
 *     going clockwise — keeps the math straight.
 *   - Plane is a tiny custom path pointing straight up by default,
 *     so rotation = tangent angle exactly (no offset fudging
 *     needed, unlike lucide's Plane which points NE).
 *
 * Used by /home (tracked-journey cards in the Journeys view) and by
 * /journeys/track Step 3 (confirm-screen preview). Both replace the
 * earlier horizontal progress bar.
 */

import type { CSSProperties } from 'react';

interface JourneyProgressProps {
  /** 0–1; clamped internally. */
  progress: number;
  tripType: 'Return' | 'One-way';
  /** Square px size of the rendered widget. Defaults to a comfortable
   *  card-friendly 160px. */
  size?: number;
  /** Optional content centred in the ring (caller controls layout). */
  children?: React.ReactNode;
}

const CX = 100;
const CY = 100;
const R = 80;
const FULL_CIRCUMFERENCE = 2 * Math.PI * R;
const HALF_CIRCUMFERENCE = Math.PI * R;
const TRANSITION: CSSProperties = { transition: 'stroke-dasharray 0.7s ease-out' };

export function JourneyProgress({
  progress,
  tripType,
  size = 160,
  children,
}: JourneyProgressProps) {
  const clamped = Math.max(0, Math.min(1, progress));
  const isReturn = tripType === 'Return';

  // Position angle in degrees, measured clockwise from north (12 o'clock).
  //   Return:   0° at start → 360° at finish
  //   One-way: −90° (= left, 9 o'clock) at start → +90° (= right, 3 o'clock) at finish, going via north
  const positionAngleDeg = isReturn ? 360 * clamped : -90 + 180 * clamped;

  // For clockwise motion the tangent is positionAngle + 90° (rotate 90° clockwise from the radial direction).
  const tangentDeg = positionAngleDeg + 90;

  // Cartesian position of the plane on the circle.
  const angleRad = (positionAngleDeg * Math.PI) / 180;
  const planeX = CX + R * Math.sin(angleRad);
  const planeY = CY - R * Math.cos(angleRad);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        viewBox="0 0 200 200"
        className="block h-full w-full"
        role="img"
        aria-label={`${Math.round(clamped * 100)}% of the way to your ${tripType.toLowerCase()} goal`}
      >
        {isReturn ? <ReturnArcs progress={clamped} /> : <OneWayArcs progress={clamped} />}

        {/* Plane — white halo on top of the arc + a stylised red plane
            that I drew to point straight up so rotation matches the
            tangent without an offset. */}
        <g
          transform={`translate(${planeX} ${planeY}) rotate(${tangentDeg})`}
          style={{ transition: 'transform 0.7s ease-out' }}
        >
          <circle
            r="11"
            className="fill-white stroke-[var(--color-ph-red)] dark:fill-zinc-950"
            strokeWidth="1.5"
          />
          <path d="M 0 -7 L -5 5 L 0 2.5 L 5 5 Z" className="fill-[var(--color-ph-red)]" />
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

function ReturnArcs({ progress }: { progress: number }) {
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
        className="fill-none stroke-[var(--color-ph-red)]"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${FULL_CIRCUMFERENCE * progress} ${FULL_CIRCUMFERENCE}`}
        transform={`rotate(-90 ${CX} ${CY})`}
        style={TRANSITION}
      />
    </>
  );
}

function OneWayArcs({ progress }: { progress: number }) {
  const arc = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`;
  return (
    <>
      <path d={arc} className="fill-none stroke-zinc-200 dark:stroke-zinc-700" strokeWidth="6" />
      <path
        d={arc}
        className="fill-none stroke-[var(--color-ph-red)]"
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
