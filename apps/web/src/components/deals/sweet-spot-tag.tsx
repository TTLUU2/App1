'use client';

/**
 * SweetSpotTag — shows the best redemption a bonus unlocks, with an
 * expandable drawer listing all matches.
 *
 * Lifted from points-deals. All emoji glyphs (▾/▸/✕/🏆/⚠️) replaced with
 * lucide-react icons per PH Copilot's no-emoji UI rule.
 */

import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, Trophy, X } from 'lucide-react';
import type { Bonus } from '@/data/deals-types';
import {
  bestSweetSpot,
  formatRetailValue,
  matchingSweetSpots,
  type SweetSpot,
} from '@/lib/sweet-spots';

function SpotRow({ spot }: { spot: SweetSpot }) {
  return (
    <div className="py-2.5 first:pt-0 last:pb-0 border-b border-amber/20 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-ink leading-snug">{spot.label}</p>
        <span className="shrink-0 text-[11px] font-semibold text-amber-deep tabular-nums">
          {formatRetailValue(spot.retailValue)}
        </span>
      </div>
      <p className="mt-0.5 text-[12px] leading-relaxed text-ink-soft">{spot.description}</p>
      <p className="mt-1 flex items-start gap-1 text-[11px] italic text-ink-mute">
        <AlertTriangle size={11} strokeWidth={1.75} aria-hidden className="mt-0.5 shrink-0" />
        <span>{spot.caveats}</span>
      </p>
    </div>
  );
}

interface SweetSpotTagProps {
  bonus: Bonus;
  /** "inline" sits inside a card's footer; "hero" is in the top-match card */
  variant?: 'inline' | 'hero';
}

export function SweetSpotTag({ bonus, variant = 'inline' }: SweetSpotTagProps) {
  const [open, setOpen] = useState(false);

  const best = bestSweetSpot(bonus);
  if (!best) return null;

  const allMatches = matchingSweetSpots(bonus);
  const isHero = variant === 'hero';

  return (
    <div className={isHero ? 'mt-3' : 'mt-1'}>
      {/* Teaser tag */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition ${
          isHero
            ? 'bg-amber/15 text-amber-deep hover:bg-amber/25'
            : 'bg-amber/10 text-amber-deep hover:bg-amber/20'
        }`}
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown size={11} strokeWidth={2} aria-hidden />
        ) : (
          <ChevronRight size={11} strokeWidth={2} aria-hidden />
        )}
        {best.label}
      </button>

      {open && (
        <div className="mt-2 overflow-hidden rounded-lg border border-amber/20 bg-amber/5">
          {/* Drawer header */}
          <div className="flex items-center justify-between border-b border-amber/20 px-3 py-2">
            <p className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-amber-deep">
              <Trophy size={11} strokeWidth={2} aria-hidden />
              What these points unlock
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="grid size-5 place-items-center text-ink-mute hover:text-ink"
            >
              <X size={12} strokeWidth={2} aria-hidden />
            </button>
          </div>

          <div className="divide-y divide-amber/10 px-3 py-2">
            {allMatches.map((spot) => (
              <SpotRow key={spot.id} spot={spot} />
            ))}
          </div>

          <div className="border-t border-amber/20 bg-amber/5 px-3 py-2">
            <p className="text-[10px] italic text-ink-mute">
              Point thresholds and retail estimates only — not live award availability. Taxes, fees,
              and routing rules apply.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
