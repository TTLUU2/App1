'use client';

// Journeys · Destinations (HANDOFF § 4) — Phase 4d.
//
// Screen purpose: what your points actually buy. Brick hero → grid
// of reachable destinations → "Almost there" list of the ones just
// out of reach (Behaviour rule #7: show the gap).
//
// v1 pulls destination data from useJourneysStore.DESTINATION_CATALOGUE
// so the same catalogue that powers the Track wizard drives this
// screen. Photos are placeholder — the CardArtFrame-style striped
// panel until Phase 6 assets land.

import Link from 'next/link';
import { Check } from 'lucide-react';
import { formatPoints } from '@/lib/format';
import { selectTotalPoints, useBalancesStore } from '@/store/balances';
import { DESTINATION_CATALOGUE, type DestinationOption } from '@/store/journeys';
import { CityIllustration } from '@/components/city-illustration';
import { HeroCard, LacquerChip } from '@/components/lacquer';

export function DestinationsView() {
  const totalPoints = useBalancesStore(selectTotalPoints);
  const reachable = DESTINATION_CATALOGUE.filter((d) => totalPoints >= d.pointsBusinessReturn);
  const almostThere = DESTINATION_CATALOGUE.filter(
    (d) => totalPoints < d.pointsBusinessReturn,
  ).slice(0, 5);

  const businessCount = reachable.length;
  const economyCount = DESTINATION_CATALOGUE.filter(
    (d) => totalPoints >= d.pointsByCabin.economy,
  ).length;

  return (
    <section className="mt-4 space-y-5">
      <HeroCard aria-labelledby="destinations-heading" style={{ padding: 20, gap: 18 }}>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ph-on-brick-meta">
            {formatPoints(totalPoints)} points buys you
          </p>
          <p
            id="destinations-heading"
            className="mt-1 font-serif text-[34px] leading-none text-ph-on-brick"
          >
            {businessCount} destination{businessCount === 1 ? '' : 's'}
          </p>
          <p className="mt-1 text-[13px] text-ph-on-brick-secondary">
            in business · {economyCount} in economy
          </p>
        </div>
      </HeroCard>

      {reachable.length > 0 ? (
        <div>
          <ul className="grid grid-cols-2 gap-3">
            {reachable.slice(0, 6).map((d) => (
              <li key={d.id}>
                <ReachableTile dest={d} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {almostThere.length > 0 ? (
        <section aria-labelledby="almost-there-heading">
          <h2
            id="almost-there-heading"
            className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ph-text-meta"
          >
            Almost there
          </h2>
          <ul className="space-y-2">
            {almostThere.map((d) => (
              <li key={d.id}>
                <AlmostThereRow dest={d} totalPoints={totalPoints} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </section>
  );
}

function ReachableTile({ dest }: { dest: DestinationOption }) {
  return (
    <Link
      href={`/journeys/track?destinationId=${dest.id}`}
      className="block overflow-hidden rounded-ph-card border border-ph-border bg-ph-card transition-colors hover:bg-ph-fill-warm"
    >
      <CityBanner destinationId={dest.id} />
      <div className="p-3">
        <p className="font-serif text-[19px] leading-tight text-ph-ink">{dest.city}</p>
        <p className="mt-1 text-[12px] text-ph-text-muted tabular-nums">
          {formatPoints(dest.pointsBusinessReturn)} · Business
        </p>
        <div className="mt-2">
          <LacquerChip variant="amber" Icon={Check} size="sm">
            Book now
          </LacquerChip>
        </div>
      </div>
    </Link>
  );
}

function AlmostThereRow({ dest, totalPoints }: { dest: DestinationOption; totalPoints: number }) {
  const gap = dest.pointsBusinessReturn - totalPoints;
  const progress = Math.max(0, Math.min(1, totalPoints / dest.pointsBusinessReturn));
  return (
    <Link
      href={`/journeys/track?destinationId=${dest.id}`}
      className="flex items-center gap-3 rounded-ph-card border border-ph-border bg-ph-card p-[15px] transition-colors hover:bg-ph-fill-warm"
    >
      <CityThumb destinationId={dest.id} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-serif text-[17px] leading-tight text-ph-ink">{dest.city}</p>
        <p className="mt-0.5 truncate text-[12px] text-ph-text-muted tabular-nums">
          Business · {formatPoints(dest.pointsBusinessReturn)}
        </p>
      </div>
      <div className="flex flex-none flex-col items-end gap-1">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ph-text-meta tabular-nums">
          {formatPoints(gap)} short
        </p>
        <div className="h-[5px] w-[62px] overflow-hidden rounded-full bg-ph-fill" aria-hidden>
          <div
            className="h-full rounded-full bg-ph-brick transition-[width] duration-500 ease-out"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>
    </Link>
  );
}

/** 72px landmark banner atop each reachable destination tile. Cream
 *  wash (ph-fill-warm → ph-card) with the city silhouette in ph-brick
 *  — reads as a passport stamp, not a photo. Real photography drops
 *  in behind the CityIllustration in Phase 6. */
function CityBanner({ destinationId }: { destinationId: string }) {
  return (
    <div
      className="relative h-[72px] overflow-hidden"
      style={{
        background: 'linear-gradient(to bottom, var(--color-ph-fill-warm), var(--color-ph-card))',
      }}
    >
      <CityIllustration
        destinationId={destinationId}
        preserveAspectRatio="xMidYMax meet"
        className="absolute inset-x-0 bottom-0 h-14 w-full text-ph-brick"
      />
    </div>
  );
}

/** 44px square thumbnail used on the "Almost there" horizontal rows.
 *  Same silhouette, smaller crop, rounded corners to match sibling
 *  card-art thumbs. */
function CityThumb({ destinationId }: { destinationId: string }) {
  return (
    <div
      className="relative h-[44px] w-[44px] flex-none overflow-hidden rounded-[9px]"
      style={{
        background: 'linear-gradient(to bottom, var(--color-ph-fill-warm), var(--color-ph-card))',
      }}
    >
      <CityIllustration
        destinationId={destinationId}
        preserveAspectRatio="xMidYMax meet"
        className="absolute inset-x-0 bottom-0 h-8 w-full text-ph-brick"
      />
    </div>
  );
}
