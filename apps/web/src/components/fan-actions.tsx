'use client';

// Radial fan menu — PRD §6.2 ("radial / sheet menu") + §11.1 (FAB icon
// animates from '+' to '×' when expanded).
//
// Tap FAB → 4 action buttons fan upward in an arc. 2 sit on the left of
// the FAB, 2 on the right; each labelled with a short word + an icon
// chip. Backdrop dismisses; selecting an action closes the fan.
//
// Animation: each fan button transitions transform + opacity from origin
// (FAB centre, scale 0) to its arc position (scale 1). Stagger from the
// inner pair outward for a "blossom" feel.

import Link from 'next/link';
import { CreditCard, Mic, Receipt, Sparkles } from 'lucide-react';
import clsx from 'clsx';

export type FanActionId = 'add' | 'spend' | 'benefits' | 'ask';

interface FanAction {
  id: FanActionId;
  label: string;
  Icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  /** When set, this action navigates instead of triggering onPick. */
  href?: string;
}

// Ordered left → right as they appear in the arc.
const ACTIONS: FanAction[] = [
  { id: 'add', label: 'Add card', Icon: CreditCard },
  { id: 'spend', label: 'Spend', Icon: Receipt, href: '/spend' },
  { id: 'benefits', label: 'Benefits', Icon: Sparkles, href: '/benefits' },
  // No href on Ask — TabBar handles the pick by opening an in-place
  // VoiceCaptureOverlay so recording starts on the current screen
  // (live transcript + pulse) and only navigates to /ask once the
  // user finishes speaking. Matches the pre-Lacquer 'tap mic →
  // recording starts, animation dictates what the user is saying in
  // real time' behaviour.
  { id: 'ask', label: 'Ask', Icon: Mic },
];

// Wider arc — icon-over-label stack keeps each button ~64px wide so we can
// space them out without overlapping or running off a 360px-wide viewport.
// Outer pair sits lower and wider; inner pair sits higher and closer to the
// vertical, producing a clear fan silhouette.
const ARC_POSITIONS: { x: number; y: number }[] = [
  { x: -110, y: -60 }, // B0 outer left
  { x: -45, y: -135 }, // B1 inner left
  { x: 45, y: -135 }, // B2 inner right
  { x: 110, y: -60 }, // B3 outer right
];

export function FanActions({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  /** Called when a non-link action is picked. */
  onPick: (id: FanActionId) => void;
}) {
  return (
    <>
      {/* Backdrop — sits below the FAB (FAB is z-50) and above everything
          else. Tap-anywhere-else to dismiss. */}
      <button
        type="button"
        aria-hidden={!open}
        tabIndex={-1}
        onClick={onClose}
        className={clsx(
          'fixed inset-0 z-40 backdrop-blur-sm transition-opacity duration-150',
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        )}
        style={{ backgroundColor: 'rgba(46,10,8,0.42)' }}
      />

      {/* Fan buttons. Anchored to the same fixed position as the FAB; each
          transform-translates to its arc position when open.
          Uses `inert` (not aria-hidden) when closed — inert blocks both
          AT and focus, which avoids the "aria-hidden ancestor of focused
          element" warning when the user dismisses mid-animation. */}
      <div
        className="pointer-events-none fixed left-1/2 z-50"
        style={{ bottom: 'calc(2.25rem + env(safe-area-inset-bottom))' }}
        inert={!open}
      >
        {ACTIONS.map((action, i) => {
          const pos = ARC_POSITIONS[i];
          if (!pos) return null;
          const transform = open
            ? `translate(calc(${pos.x}px - 50%), ${pos.y}px) scale(1)`
            : 'translate(-50%, 0) scale(0.4)';
          // Stagger: inner pair (1, 2) first, then outer (0, 3) — 0ms/30ms/30ms/60ms.
          const delay = open ? (i === 1 || i === 2 ? 0 : 50) : 0;
          return (
            <FanButton
              key={action.id}
              action={action}
              open={open}
              transform={transform}
              delayMs={delay}
              onPick={onPick}
              onClose={onClose}
            />
          );
        })}
      </div>
    </>
  );
}

function FanButton({
  action,
  open,
  transform,
  delayMs,
  onPick,
  onClose,
}: {
  action: FanAction;
  open: boolean;
  transform: string;
  delayMs: number;
  onPick: (id: FanActionId) => void;
  onClose: () => void;
}) {
  // Icon-over-label stack. Each button is ~64px wide, narrow enough that
  // ARC_POSITIONS at ±110px / ±45px keep clear spacing on a 360px viewport.
  const baseClass = clsx(
    'pointer-events-auto absolute left-0 top-0 flex w-16 flex-col items-center gap-1 transition-all duration-200 ease-out',
    open ? 'opacity-100' : 'opacity-0',
  );
  const style = {
    transform,
    transitionDelay: `${delayMs}ms`,
  } as const;

  const body = (
    <>
      <span
        className="grid h-12 w-12 place-items-center rounded-full bg-ph-card text-ph-ink ring-1 ring-ph-border transition-transform hover:scale-105 active:scale-95"
        style={{ boxShadow: 'var(--shadow-ph-thumb)' }}
      >
        <action.Icon className="h-5 w-5" aria-hidden />
      </span>
      <span className="rounded-full bg-ph-ink px-2 py-0.5 text-[10px] font-medium text-ph-on-brick">
        {action.label}
      </span>
    </>
  );

  // Tabbable + reachable by screen reader only when open.
  const tabIndex = open ? 0 : -1;

  if (action.href) {
    return (
      <Link
        href={action.href}
        aria-label={action.label}
        tabIndex={tabIndex}
        onClick={() => {
          onClose();
        }}
        className={baseClass}
        style={style}
      >
        {body}
      </Link>
    );
  }

  return (
    <button
      type="button"
      aria-label={action.label}
      tabIndex={tabIndex}
      onClick={() => onPick(action.id)}
      className={baseClass}
      style={style}
    >
      {body}
    </button>
  );
}
