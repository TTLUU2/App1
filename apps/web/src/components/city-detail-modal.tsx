'use client';

/**
 * CityDetailModal — shown when the user taps a destination pin (or
 * grid card) in the Track-a-journey wizard's Step 1. Surfaces the
 * city's full airport name, IATA code, and the per-cabin point
 * estimates so the user can compare destinations before committing.
 *
 * Two outs:
 *   - Close (X / backdrop)            → returns to Step 1
 *   - "Track to here" primary CTA     → calls onTrack(id), which is
 *     wired in the wizard to set the destination + advance to Step 2
 *
 * Layout follows the PushOptInModal convention — bottom sheet on
 * mobile, centred dialog on sm+. The city illustration is rendered
 * faintly behind the header as a passport-stamp watermark.
 */

import { Plane, X } from 'lucide-react';
import { CityIllustration } from '@/components/city-illustration';
import { formatPoints } from '@/lib/format';
import type { CabinClass, CabinPoints, DestinationOption, OriginPort } from '@/store/journeys';

interface CityDetailModalProps {
  destination: DestinationOption | null;
  /** AU departure port — surfaced in the route line and the points
   *  blurb so the cabin points read in context. */
  origin: OriginPort;
  onClose: () => void;
  onTrack: (id: string) => void;
}

interface CabinRow {
  cabin: CabinClass;
  key: keyof CabinPoints;
  blurb: string;
}

const CABIN_ROWS: CabinRow[] = [
  { cabin: 'Economy', key: 'economy', blurb: 'Light cash, heavy on points value' },
  { cabin: 'Premium Economy', key: 'premiumEconomy', blurb: 'A step up, modest points lift' },
  { cabin: 'Business', key: 'business', blurb: 'The sweet spot — flat beds, lounge access' },
  { cabin: 'First', key: 'first', blurb: 'Top of the chart, top of the cabin' },
];

export function CityDetailModal({ destination, origin, onClose, onTrack }: CityDetailModalProps) {
  if (!destination) return null;
  const code = destination.id.toUpperCase();
  const originCode = origin.id.toUpperCase();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="city-detail-title"
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl dark:bg-zinc-900"
      >
        {/* Header — silhouette + caption */}
        <div className="relative overflow-hidden bg-gradient-to-b from-red-50 to-white px-5 pt-5 pb-4 dark:from-red-500/10 dark:to-zinc-900">
          <CityIllustration
            destinationId={destination.id}
            preserveAspectRatio="xMaxYMax meet"
            className="pointer-events-none absolute inset-y-0 right-0 h-full w-1/2 text-[var(--color-ph-red)] opacity-25 dark:opacity-30"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close city details"
            className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/80 text-zinc-700 hover:bg-white dark:bg-zinc-800/80 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>

          <div className="relative">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-ph-red)]">
              {destination.country}
            </p>
            <h2 id="city-detail-title" className="mt-0.5 text-xl font-semibold tracking-tight">
              {destination.city}{' '}
              <span className="text-sm font-bold tabular-nums text-zinc-500">· {code}</span>
            </h2>
            <p className="mt-1 text-xs leading-snug text-zinc-600 dark:text-zinc-400">
              {destination.airport}
            </p>
          </div>
        </div>

        {/* Body — cabin points */}
        <div className="px-5 pt-4 pb-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
            Estimated return points
          </p>
          <p className="mt-0.5 text-[11px] text-zinc-500">
            Per person, {origin.city} ({originCode}) → {destination.city} ({code}). Real award costs
            vary by program and date.
          </p>

          <ul className="mt-3 divide-y divide-zinc-100 dark:divide-zinc-800">
            {CABIN_ROWS.map((row) => {
              const pts = destination.pointsByCabin[row.key];
              const headline = row.cabin === 'Business';
              return (
                <li
                  key={row.key}
                  className={
                    headline
                      ? 'flex items-baseline justify-between gap-3 rounded-lg bg-red-50/60 px-2 py-2.5 dark:bg-red-500/10'
                      : 'flex items-baseline justify-between gap-3 px-2 py-2'
                  }
                >
                  <div className="min-w-0 flex-1">
                    <p
                      className={
                        headline
                          ? 'text-sm font-bold text-[var(--color-ph-red)]'
                          : 'text-sm font-semibold'
                      }
                    >
                      {row.cabin}
                    </p>
                    <p className="mt-0.5 text-[11px] text-zinc-500">{row.blurb}</p>
                  </div>
                  <p
                    className={
                      headline
                        ? 'flex-none text-base font-bold tabular-nums text-[var(--color-ph-red)]'
                        : 'flex-none text-sm font-semibold tabular-nums text-zinc-700 dark:text-zinc-200'
                    }
                  >
                    {formatPoints(pts)}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Footer — primary CTA */}
        <div className="px-5 pt-4 pb-5">
          <button
            type="button"
            onClick={() => onTrack(destination.id)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-ph-red)] px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-red-700"
          >
            <Plane className="h-4 w-4" aria-hidden />
            Track to {destination.city}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="mt-2 block w-full text-center text-[11px] font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            Browse more cities
          </button>
        </div>
      </div>
    </div>
  );
}
