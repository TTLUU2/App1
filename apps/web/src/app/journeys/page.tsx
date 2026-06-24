'use client';

/**
 * /journeys — Journeys landing. Wallet on top (per-program balances),
 * then "Where you can go" destination tiles flipped to "book now" or
 * "X to go" based on the user's totals, then any in-flight tracked
 * journeys, and the Track-a-journey CTA at the bottom that hops into
 * the wizard.
 *
 * Logic: a destination is "book now" if total points across all
 * programs >= its target. Otherwise we show the gap. This is a rough
 * heuristic — real redemption would need per-program awards charts,
 * which we'll layer in later.
 */

import Link from 'next/link';
import { ArrowRight, Diamond, Plane } from 'lucide-react';
import { formatPoints } from '@/lib/format';
import {
  selectTotalPoints,
  selectTotalValueAud,
  useBalancesStore,
  type ProgramBalance,
} from '@/store/balances';
import { DESTINATION_CATALOGUE, useJourneysStore, type DestinationOption } from '@/store/journeys';

export default function JourneysPage() {
  const programs = useBalancesStore((s) => s.programs);
  const total = useBalancesStore(selectTotalPoints);
  const valueAud = useBalancesStore(selectTotalValueAud);
  const tracked = useJourneysStore((s) => s.tracked);

  const fundedPrograms = programs.filter((p) => p.balance > 0);
  const visibleDestinations = DESTINATION_CATALOGUE.slice(0, 4);

  return (
    <main className="px-4 pt-4 pb-32">
      <header className="mb-4">
        <h1 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Diamond className="h-5 w-5 text-[var(--color-ph-red)]" aria-hidden />
          Journeys
        </h1>
        <p className="mt-1 text-xs text-zinc-500">Your wallet, then where it can take you.</p>
      </header>

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
            You're tracking
          </h2>
          <ul className="space-y-2">
            {tracked.map((j) => {
              const progress = Math.min(100, Math.round((total / j.targetPoints) * 100));
              return (
                <li
                  key={j.id}
                  className="rounded-xl bg-white p-3 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">
                      {j.destinationCity} · {j.cabin}
                    </p>
                    <p className="text-xs font-bold tabular-nums text-zinc-500">{progress}%</p>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-[var(--color-ph-red)] transition-[width] duration-700"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-zinc-500">
                    Target {formatPoints(j.targetPoints)} · {j.tripType}
                    {j.departureMonth ? ` · ${j.departureMonth}` : ''}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section aria-labelledby="where-heading" className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h2
            id="where-heading"
            className="text-[10px] font-bold uppercase tracking-wide text-zinc-500"
          >
            Where you can go
          </h2>
          <button
            type="button"
            className="text-[11px] font-semibold text-[var(--color-ph-red)] hover:underline"
          >
            See all
          </button>
        </div>
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
    </main>
  );
}

function WalletRow({ program }: { program: ProgramBalance }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white p-3 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
      {program.logoUrl ? (
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
      className="block rounded-xl bg-white p-3 ring-1 ring-zinc-200 transition-colors hover:bg-zinc-50 dark:bg-zinc-900 dark:ring-zinc-800 dark:hover:bg-zinc-800/60"
    >
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
    </Link>
  );
}
