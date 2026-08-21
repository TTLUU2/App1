'use client';

/**
 * CityDetailModal — the "Book now / Track to here" popup from the
 * Track-a-journey wizard's Step 1. Surfaces the city's airport name,
 * IATA code, and per-cabin point estimates so the user can compare
 * destinations before committing.
 *
 * Two outs:
 *   - Close (X / backdrop)          → returns to Step 1
 *   - "Track to {city}" primary CTA → wizard advances to Step 2
 *
 * Bottom sheet on mobile, centred dialog on sm+. Lacquer palette
 * applied in Phase 4 polish; the CityIllustration silhouette watermark
 * carries over from the pre-Lacquer version and now paints in
 * ph-brick against a cream wash.
 */

import { Plane, X } from 'lucide-react';
import { CityIllustration } from '@/components/city-illustration';
import { formatPoints } from '@/lib/format';
import type { CabinClass, CabinPoints, DestinationOption, OriginPort } from '@/store/journeys';

interface CityDetailModalProps {
  destination: DestinationOption | null;
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
      // Scrim uses the same ink-42% recipe as the Lacquer BottomSheet.
      className="fixed inset-0 z-[70] flex items-end justify-center backdrop-blur-sm sm:items-center"
      style={{ backgroundColor: 'rgba(46,10,8,0.42)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-t-ph-sheet bg-ph-paper shadow-2xl sm:rounded-ph-sheet"
      >
        {/* Header — cream wash + city silhouette watermark. */}
        <div
          className="relative overflow-hidden px-5 pt-5 pb-4"
          style={{
            background:
              'linear-gradient(to bottom, var(--color-ph-fill-warm), var(--color-ph-card))',
          }}
        >
          <CityIllustration
            destinationId={destination.id}
            preserveAspectRatio="xMaxYMax meet"
            className="pointer-events-none absolute inset-y-0 right-0 h-full w-1/2 text-ph-brick opacity-30"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close city details"
            className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-ph-card text-ph-text-muted ring-1 ring-ph-border transition-colors hover:text-ph-text"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>

          <div className="relative">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ph-brick">
              {destination.country}
            </p>
            <h2
              id="city-detail-title"
              className="mt-1 font-serif text-[26px] leading-tight text-ph-ink"
            >
              {destination.city}{' '}
              <span className="font-mono text-[13px] tabular-nums text-ph-text-meta">· {code}</span>
            </h2>
            <p className="mt-1 text-[12px] leading-snug text-ph-text-muted">
              {destination.airport}
            </p>
          </div>
        </div>

        {/* Body — cabin points table. */}
        <div className="px-5 pt-4 pb-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ph-text-meta">
            Estimated return points
          </p>
          <p className="mt-1 text-[11px] text-ph-text-muted">
            Per person, {origin.city} ({originCode}) → {destination.city} ({code}). Real award costs
            vary by program and date.
          </p>

          <ul className="mt-3 divide-y divide-ph-border">
            {CABIN_ROWS.map((row) => {
              const pts = destination.pointsByCabin[row.key];
              const headline = row.cabin === 'Business';
              return (
                <li
                  key={row.key}
                  className={
                    headline
                      ? 'flex items-baseline justify-between gap-3 rounded-ph-inner bg-ph-tint px-2 py-2.5'
                      : 'flex items-baseline justify-between gap-3 px-2 py-2.5'
                  }
                >
                  <div className="min-w-0 flex-1">
                    <p
                      className={
                        headline
                          ? 'font-serif text-[17px] leading-tight text-ph-brick'
                          : 'font-serif text-[17px] leading-tight text-ph-ink'
                      }
                    >
                      {row.cabin}
                    </p>
                    <p className="mt-0.5 text-[11px] text-ph-text-muted">{row.blurb}</p>
                  </div>
                  <p
                    className={
                      headline
                        ? 'flex-none font-serif text-[21px] leading-none text-ph-brick tabular-nums'
                        : 'flex-none font-serif text-[17px] leading-none text-ph-ink tabular-nums'
                    }
                  >
                    {formatPoints(pts)}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Footer — primary CTA + secondary out. */}
        <div className="px-5 pt-4 pb-6">
          <button
            type="button"
            onClick={() => onTrack(destination.id)}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-ph-red px-4 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            <Plane className="h-4 w-4" aria-hidden />
            Track to {destination.city}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="mt-3 block w-full text-center text-[12px] font-medium text-ph-text-muted hover:text-ph-text"
          >
            Browse more cities
          </button>
        </div>
      </div>
    </div>
  );
}
