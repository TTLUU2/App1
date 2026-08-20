// LacquerChip — colour + icon + text, always (HANDOFF § Behaviour
// rules #8). Sits alongside the existing `status-chip.tsx` rather
// than replacing it: that one is keyed on the shared package's
// `EligibilityStatus` union; this one is variant-driven so it can
// express deadline / positive / action / negative / brand contexts
// that aren't tied to eligibility.
//
// Variant → palette map:
//   pine         on-track / positive / "✓ Used" / "+42,000 this month"
//   amber        deadlines / "⚠ 19d" / celebration figures / reached
//   red-action   destructive/action-emphasis chip (rare — most red
//                lives on buttons; this is for pinned action nudges)
//   negative     "✕ Not eligible" / "✕ Held in 2025"
//   brick        brand eyebrow labels (mono-cased outside)
//
// The icon is required by contract; passing `null` intentionally means
// "I'm using the wrong primitive" — reach for a plain label instead.

import { type ComponentType, type ReactNode } from 'react';
import clsx from 'clsx';

export type LacquerChipVariant = 'pine' | 'amber' | 'red-action' | 'negative' | 'brick';

export interface LacquerChipProps {
  variant: LacquerChipVariant;
  /** lucide-react icon component. Required — colour is never the only signal. */
  Icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  children: ReactNode;
  size?: 'sm' | 'md';
  className?: string;
}

const VARIANT_CLASSES: Record<LacquerChipVariant, string> = {
  pine: 'bg-ph-pine-chip text-ph-pine-text',
  amber: 'bg-ph-amber-chip text-ph-amber-text',
  'red-action': 'bg-ph-red/12 text-ph-red',
  negative: 'bg-ph-negative-chip text-ph-ink',
  brick: 'bg-ph-brick/10 text-ph-brick',
};

export function LacquerChip({ variant, Icon, children, size = 'md', className }: LacquerChipProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full font-medium',
        VARIANT_CLASSES[variant],
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
        className,
      )}
    >
      <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} aria-hidden />
      {children}
    </span>
  );
}
