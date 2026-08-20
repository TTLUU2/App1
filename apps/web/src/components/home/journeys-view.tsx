'use client';

// Journeys view — the "Later" content that used to live at
// /home?view=journeys and now anchors /journeys (Phase 3 nav shell
// cutover, Decision #33).
//
// Rendered as a body-only component: no greeting header, no <main>.
// Phase 4 will rebuild against the Lacquer palette + HeroCard for the
// wallet total + LacquerChip for "book now" / "shortfall" states; for
// now the pre-Lacquer visual is preserved.

import Link from 'next/link';
import { ArrowRight, Plane } from 'lucide-react';
import { formatPoints } from '@/lib/format';
import {
  selectTotalPoints,
  selectTotalValueAud,
  useBalancesStore,
  type ProgramBalance,
} from '@/store/balances';
import {
  DESTINATION_CATALOGUE,
  pointsDeadlineForDeparture,
  useJourneysStore,
  type DestinationOption,
} from '@/store/journeys';
import { formatMonthYear } from '@/components/month-year-picker';
import { JourneyProgress } from '@/components/journey-progress';
import { CityIllustration } from '@/components/city-illustration';

export function JourneysView() {
  const programs = useBalancesStore((s) => s.programs);
  const total = useBalancesStore(selectTotalPoints);
  const valueAud = useBalancesStore(selectTotalValueAud);
  const tracked = useJourneysStore((s) => s.tracked);

  const fundedPrograms = programs.filter((p) => p.balance > 0);
  const visibleDestinations = DESTINATION_CATALOGUE.slice(0, 4);

  return (
    <>
      <section
        aria-label="Total points"
        className="rounded-2xl bg-white p-4 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800"
      >
        <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Total points</p>
        <p className="mt-1 text-3xl font-semibold tabular-nums">{formatPoints(total)}</p>
        <p className="mt-1 text-xs text-zinc-500">
          Across {fundedPrograms.length} program{fundedPrograms.length === 1 ? '' : 's'} · ≈ $
          {Math.round(valueAud).toLocaleString('en-AU')} value
        </p>
      </section>

      <ul className="mt-2 space-y-2">
        {fundedPrograms.map((p) => (
          <li key={p.id}>
            <WalletRow program={p} />
          </li>
        ))}
      </ul>

      {tracked.length > 0 && (
        <section aria-labelledby="tracking-heading" className="mt-6">
          <h2
            id="tracking-heading"
            className="mb-2 text-[10px] font-bold uppercase tracking-wide text-zinc-500"
          >
            You&apos;re tracking
          </h2>
          <ul className="space-y-2">
            {tracked.map((j) => {
              const pct = Math.min(100, Math.round((total / j.targetPoints) * 100));
              return (
                <li
                  key={j.id}
                  className="relative overflow-hidden rounded-xl bg-white ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800"
                >
                  <CityIllustration
                    destinationId={j.destinationId}
                    preserveAspectRatio="xMaxYMid meet"
                    className="pointer-events-none absolute inset-y-0 right-0 h-full w-1/2 text-[var(--color-ph-red)] opacity-10 dark:opacity-20"
                  />
                  <div className="relative flex items-center gap-3 p-3">
                    <JourneyProgress
                      progress={total / j.targetPoints}
                      tripType={j.tripType}
                      size={52}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold leading-tight">
                        {j.destinationCity} · {j.cabin}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] leading-tight text-zinc-500">
                        {j.tripType}
                        {j.pax > 1 ? ` · ${j.pax} pax` : ''}
                        {j.departureMonth ? ` · ${formatMonthYear(j.departureMonth)}` : ''}
                        {' · '}
                        <span className="tabular-nums">{formatPoints(j.targetPoints)}</span>
                      </p>
                      {(() => {
                        const deadline = pointsDeadlineForDeparture(j.departureMonth);
                        return deadline ? (
                          <p className="mt-0.5 truncate text-[11px] font-semibold leading-tight text-[var(--color-ph-red)]">
                            Points by {formatMonthYear(deadline)}
                          </p>
                        ) : null;
                      })()}
                    </div>
                    <p className="flex-none text-base font-bold tabular-nums text-[var(--color-ph-red)]">
                      {pct}%
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section aria-labelledby="where-heading" className="mt-6">
        <h2
          id="where-heading"
          className="mb-2 text-[10px] font-bold uppercase tracking-wide text-zinc-500"
        >
          Where you can go
        </h2>
        <ul className="grid grid-cols-2 gap-2">
          {visibleDestinations.map((d) => (
            <li key={d.id}>
              <DestinationTile dest={d} totalPoints={total} />
            </li>
          ))}
        </ul>
      </section>

      <Link
        href="/journeys/track"
        className="mt-4 flex items-center gap-3 rounded-xl border-2 border-dashed border-zinc-300 p-4 transition-colors hover:border-[var(--color-ph-red)] hover:bg-red-50/40 dark:border-zinc-700 dark:hover:bg-red-500/10"
      >
        <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-[var(--color-ph-red)] text-white">
          <Plane className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Track a journey</p>
          <p className="mt-0.5 text-xs text-zinc-500">
            Pick a destination and watch your points stack.
          </p>
        </div>
        <ArrowRight className="h-4 w-4 flex-none text-zinc-400" aria-hidden />
      </Link>
    </>
  );
}

function WalletRow({ program }: { program: ProgramBalance }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white p-3 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
      {program.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- program logos are external, not next/image-optimised
        <img
          src={program.logoUrl}
          alt=""
          aria-hidden
          className="h-8 w-8 flex-none rounded-md object-contain ring-1 ring-zinc-100 dark:ring-zinc-800"
        />
      ) : (
        <span className="grid h-8 w-8 flex-none place-items-center rounded-md bg-zinc-100 text-[10px] font-bold text-zinc-600 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700">
          {program.shortName.slice(0, 2).toUpperCase()}
        </span>
      )}
      <p className="flex-1 truncate text-sm font-semibold">{program.name}</p>
      <p className="text-sm font-semibold tabular-nums">{formatPoints(program.balance)}</p>
    </div>
  );
}

function DestinationTile({ dest, totalPoints }: { dest: DestinationOption; totalPoints: number }) {
  const canBook = totalPoints >= dest.pointsBusinessReturn;
  const gap = dest.pointsBusinessReturn - totalPoints;
  return (
    <Link
      href={`/journeys/track?destinationId=${dest.id}`}
      className="block overflow-hidden rounded-xl bg-white ring-1 ring-zinc-200 transition-colors hover:bg-zinc-50 dark:bg-zinc-900 dark:ring-zinc-800 dark:hover:bg-zinc-800/60"
    >
      <CityBanner destinationId={dest.id} />
      <div className="p-3">
        <p className="text-sm font-semibold">{dest.city}</p>
        <p className="mt-0.5 text-[11px] text-zinc-500 tabular-nums">
          {formatPoints(dest.pointsBusinessReturn)} · Business
        </p>
        {canBook ? (
          <p className="mt-2 text-[11px] font-bold text-[var(--color-ph-red)]">You can book now</p>
        ) : (
          <p className="mt-2 text-[11px] font-semibold text-zinc-500 tabular-nums">
            {formatPoints(gap)} to go
          </p>
        )}
      </div>
    </Link>
  );
}

/** Stylised landmark banner used on top of destination tiles. Soft
 *  cream wash + red ink so it reads as a passport stamp rather than a
 *  busy illustration. */
function CityBanner({ destinationId }: { destinationId: string }) {
  return (
    <div className="relative h-16 overflow-hidden bg-gradient-to-b from-red-50 to-white dark:from-red-500/10 dark:to-zinc-900">
      <CityIllustration
        destinationId={destinationId}
        className="absolute inset-x-0 bottom-0 h-12 w-full text-[var(--color-ph-red)]"
        preserveAspectRatio="xMidYMax meet"
      />
    </div>
  );
}
