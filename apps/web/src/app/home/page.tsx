'use client';

/**
 * /home — Daily Brief. Two views switched by a segmented control at
 * the top, per design "Home toggle":
 *   - Optimisation score (H-D): score ring + 3-stat strip + DO TODAY
 *     list + momentum cue
 *   - Journeys: wallet (per-program balances) + "Where you can go"
 *     destinations + tracked journeys + Track-a-journey CTA
 *
 * Both modes share the greeting header. Switching modes is local
 * state only — no URL change — so the back button doesn't get
 * littered with toggle bounces. The standalone /journeys route still
 * exists for the wizard's back-navigation target.
 *
 * v1 numbers in the score view (score, spend-to-go, momentum) are
 * mocked constants — we'll wire them to real spend / portfolio data
 * once the screens settle.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BarChart3, Plane, TrendingUp } from 'lucide-react';
import { formatCurrency, formatPoints } from '@/lib/format';
import { useAlertsStore, type FiredAlert } from '@/store/alerts';
import {
  selectTotalPoints,
  selectTotalValueAud,
  useBalancesStore,
  type ProgramBalance,
} from '@/store/balances';
import { DESTINATION_CATALOGUE, useJourneysStore, type DestinationOption } from '@/store/journeys';

type HomeView = 'score' | 'journeys';

const USER_NAME = 'Tin';
const SCORE = 78;
const SCORE_DELTA = 6;
const SPEND_TO_GO = 1_240;
const MOMENTUM_POINTS = 42_000;
const MOMENTUM_LABEL = 'Best month yet — on pace for 2 bonuses';

function greetingForHour(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function isToday(iso: string): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return iso.startsWith(today);
}

export default function HomePage() {
  const [view, setView] = useState<HomeView>('score');

  const { greeting, dateLabel } = useMemo(() => {
    const now = new Date();
    const dateLabel = new Intl.DateTimeFormat('en-AU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(now);
    return { greeting: greetingForHour(now.getHours()), dateLabel };
  }, []);

  return (
    <main className="px-4 pt-4 pb-32">
      <header className="mb-3">
        <h1 className="text-xl font-semibold tracking-tight">
          {greeting}, {USER_NAME}
        </h1>
        <p className="mt-1 text-xs text-zinc-500">{dateLabel}</p>
      </header>

      <ViewToggle value={view} onChange={setView} />

      {view === 'score' ? <ScoreView /> : <JourneysView />}
    </main>
  );
}

function ViewToggle({ value, onChange }: { value: HomeView; onChange: (v: HomeView) => void }) {
  return (
    <div className="mb-4 grid grid-cols-2 rounded-xl border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-900">
      <ToggleButton active={value === 'score'} onClick={() => onChange('score')}>
        Optimisation score
      </ToggleButton>
      <ToggleButton active={value === 'journeys'} onClick={() => onChange('journeys')}>
        Journeys
      </ToggleButton>
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={
        active
          ? 'rounded-lg bg-white px-3 py-2 text-xs font-bold shadow-sm dark:bg-zinc-950'
          : 'rounded-lg px-3 py-2 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
      }
    >
      {children}
    </button>
  );
}

/* ─────────────────────────  SCORE VIEW (H-D)  ───────────────────────── */

function ScoreView() {
  const totalPoints = useBalancesStore(selectTotalPoints);
  const feed = useAlertsStore((s) => s.feed);

  const todayActions = feed
    .filter(
      (a) =>
        isToday(a.firedAt) && (a.kind === 'min-spend-deadline' || a.kind === 'benefit-expiring'),
    )
    .slice(0, 3);

  const deadlineCount = feed.filter(
    (a) => a.kind === 'annual-fee-renewal' || a.kind === 'min-spend-deadline',
  ).length;

  return (
    <>
      <ScoreCard score={SCORE} delta={SCORE_DELTA} />

      <StatStrip spendToGo={SPEND_TO_GO} pointsPending={totalPoints} deadlines={deadlineCount} />

      <section aria-labelledby="do-today-heading" className="mt-6">
        <h2
          id="do-today-heading"
          className="mb-2 text-[10px] font-bold uppercase tracking-wide text-zinc-500"
        >
          Do today
        </h2>
        {todayActions.length > 0 ? (
          <ul className="space-y-2">
            {todayActions.map((a) => (
              <li key={a.id}>
                <DoTodayCard alert={a} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl bg-white p-4 text-xs text-zinc-500 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
            Nothing urgent today — nice work staying ahead.
          </p>
        )}
      </section>

      <MomentumStrip points={MOMENTUM_POINTS} label={MOMENTUM_LABEL} />
    </>
  );
}

function ScoreCard({ score, delta }: { score: number; delta: number }) {
  return (
    <Link
      href="/optimisation"
      className="block rounded-2xl bg-white p-4 ring-1 ring-zinc-200 transition-colors hover:bg-zinc-50 dark:bg-zinc-900 dark:ring-zinc-800 dark:hover:bg-zinc-800/60"
    >
      <div className="flex items-center gap-4">
        <ScoreRing score={score} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Optimisation score</p>
          <p className="mt-0.5 text-xs text-zinc-500">Up {delta} this week · 1 action to lift it</p>
        </div>
        <ArrowRight className="h-4 w-4 flex-none text-zinc-400" aria-hidden />
      </div>
    </Link>
  );
}

function ScoreRing({ score }: { score: number }) {
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(100, Math.max(0, score)) / 100);
  return (
    <div className="relative grid h-14 w-14 place-items-center">
      <svg viewBox="0 0 56 56" className="h-14 w-14 -rotate-90">
        <circle
          cx="28"
          cy="28"
          r={radius}
          className="fill-none stroke-zinc-200 dark:stroke-zinc-700"
          strokeWidth="5"
        />
        <circle
          cx="28"
          cy="28"
          r={radius}
          className="fill-none stroke-[var(--color-ph-red)] transition-[stroke-dashoffset] duration-700 ease-out"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute text-sm font-bold tabular-nums">{score}</span>
    </div>
  );
}

function StatStrip({
  spendToGo,
  pointsPending,
  deadlines,
}: {
  spendToGo: number;
  pointsPending: number;
  deadlines: number;
}) {
  return (
    <ul className="mt-3 grid grid-cols-3 gap-2">
      <Stat label="Spend to go" value={formatCurrency(spendToGo)} />
      <Stat label="Pts pending" value={formatPoints(pointsPending)} />
      <Stat
        label="Deadlines"
        value={String(deadlines)}
        accent={deadlines > 0 ? 'red' : 'neutral'}
      />
    </ul>
  );
}

function Stat({
  label,
  value,
  accent = 'neutral',
}: {
  label: string;
  value: string;
  accent?: 'neutral' | 'red';
}) {
  return (
    <li className="rounded-xl bg-white p-3 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
      <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">{label}</p>
      <p
        className={
          accent === 'red'
            ? 'mt-1 text-base font-semibold text-[var(--color-ph-red)] tabular-nums'
            : 'mt-1 text-base font-semibold tabular-nums'
        }
      >
        {value}
      </p>
    </li>
  );
}

function DoTodayCard({ alert }: { alert: FiredAlert }) {
  const showCta = alert.kind === 'min-spend-deadline';
  return (
    <Link
      href={`/spend?cardId=${encodeURIComponent(alert.cardId)}`}
      className="flex items-center gap-3 rounded-xl bg-white p-3 ring-1 ring-zinc-200 transition-colors hover:bg-zinc-50 dark:bg-zinc-900 dark:ring-zinc-800 dark:hover:bg-zinc-800/60"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{alert.title}</p>
        <p className="mt-0.5 truncate text-xs text-zinc-500">{alert.subtitle}</p>
      </div>
      {showCta ? (
        <span className="rounded-full bg-[var(--color-ph-red)] px-3 py-1 text-[11px] font-bold text-white">
          Do
        </span>
      ) : (
        <ArrowRight className="h-4 w-4 flex-none text-zinc-400" aria-hidden />
      )}
    </Link>
  );
}

function MomentumStrip({ points, label }: { points: number; label: string }) {
  return (
    <section
      aria-label="Momentum"
      className="mt-3 flex items-center gap-3 rounded-xl bg-zinc-50 p-3 ring-1 ring-zinc-200 dark:bg-zinc-900/60 dark:ring-zinc-800"
    >
      <div className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-white text-[var(--color-ph-red)] ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-700">
        <BarChart3 className="h-4 w-4" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">
          <TrendingUp className="mr-1 inline h-3.5 w-3.5 text-[var(--color-ph-red)]" aria-hidden />+
          {formatPoints(points)} points this month
        </p>
        <p className="mt-0.5 truncate text-xs text-zinc-500">{label}</p>
      </div>
    </section>
  );
}

/* ─────────────────────────  JOURNEYS VIEW  ───────────────────────── */

function JourneysView() {
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
          <Link
            href="/journeys"
            className="text-[11px] font-semibold text-[var(--color-ph-red)] hover:underline"
          >
            See all
          </Link>
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
    </>
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
