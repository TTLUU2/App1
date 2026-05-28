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

// Ordered left → right as they appear in the arc (so the array index maps
// directly to position in ARC_POSITIONS below).
const ACTIONS: FanAction[] = [
  { id: 'add', label: 'Add card', Icon: CreditCard }, // leftmost — taps trigger the add-card modal
  { id: 'spend', label: 'Spend', Icon: Receipt, href: '/spend' },
  { id: 'benefits', label: 'Benefits', Icon: Sparkles, href: '/benefits' },
  { id: 'ask', label: 'Ask', Icon: Mic, href: '/ask' }, // rightmost
];

// Positions on a ~140° upward arc, radius 110px, evenly spread.
// (-x = left, -y = up.) Symmetric pairs: outer L/R further out + lower,
// inner L/R higher + closer to centre.
const ARC_POSITIONS: { x: number; y: number; align: 'left' | 'right' }[] = [
  { x: -95, y: -55, align: 'left' }, // B0 outer left
  { x: -40, y: -100, align: 'left' }, // B1 inner left
  { x: 40, y: -100, align: 'right' }, // B2 inner right
  { x: 95, y: -55, align: 'right' }, // B3 outer right
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
          'fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-150',
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        )}
      />

      {/* Fan buttons. Anchored to the same fixed position as the FAB; each
          transform-translates to its arc position when open. */}
      <div
        className="pointer-events-none fixed left-1/2 z-50"
        style={{ bottom: 'calc(2.25rem + env(safe-area-inset-bottom))' }}
        aria-hidden={!open}
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
              align={pos.align}
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
  align,
  open,
  transform,
  delayMs,
  onPick,
  onClose,
}: {
  action: FanAction;
  align: 'left' | 'right';
  open: boolean;
  transform: string;
  delayMs: number;
  onPick: (id: FanActionId) => void;
  onClose: () => void;
}) {
  const baseClass = clsx(
    'pointer-events-auto absolute left-0 top-0 flex items-center gap-2 transition-all duration-200 ease-out',
    align === 'right' ? 'flex-row' : 'flex-row-reverse',
    open ? 'opacity-100' : 'opacity-0',
  );
  const style = {
    transform,
    transitionDelay: `${delayMs}ms`,
  } as const;

  const icon = (
    <span className="grid h-12 w-12 place-items-center rounded-full bg-white text-zinc-800 shadow-md ring-1 ring-zinc-200 transition-transform hover:scale-105 active:scale-95 dark:bg-zinc-900 dark:text-zinc-100 dark:ring-zinc-700">
      <action.Icon className="h-5 w-5" aria-hidden />
    </span>
  );
  const label = (
    <span className="rounded-full bg-zinc-900/85 px-2 py-1 text-[11px] font-medium text-white shadow-sm dark:bg-zinc-100/90 dark:text-zinc-900">
      {action.label}
    </span>
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
        {icon}
        {label}
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
      {icon}
      {label}
    </button>
  );
}
