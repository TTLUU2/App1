'use client';

/**
 * /home — Daily Brief, expanded (design H-D).
 *
 * Single-screen at-a-glance: greeting + date, headline optimisation
 * score, a 3-up stat strip (spend-to-go / points pending / deadlines),
 * a "DO TODAY" action list lifted from the alerts feed, a momentum
 * cue, and the Track-a-journey entry that hops into /journeys.
 *
 * v1 numbers (score, spend-to-go, momentum) are mocked constants —
 * we'll wire them to real spend / portfolio data once the screens are
 * usable end-to-end.
 */

import Link from 'next/link';
import { useMemo } from 'react';
import { ArrowRight, BarChart3, Plane, TrendingUp } from 'lucide-react';
import { formatCurrency, formatPoints } from '@/lib/format';
import { useAlertsStore } from '@/store/alerts';
import type { FiredAlert } from '@/store/alerts';
import { useBalancesStore, selectTotalPoints } from '@/store/balances';

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
  const totalPoints = useBalancesStore(selectTotalPoints);
  const feed = useAlertsStore((s) => s.feed);

  const { greeting, dateLabel } = useMemo(() => {
    const now = new Date();
    const dateLabel = new Intl.DateTimeFormat('en-AU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(now);
    return { greeting: greetingForHour(now.getHours()), dateLabel };
  }, []);

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
    <main className="px-4 pt-4 pb-32">
      <header className="mb-4">
        <h1 className="text-xl font-semibold tracking-tight">
          {greeting}, {USER_NAME}
        </h1>
        <p className="mt-1 text-xs text-zinc-500">{dateLabel}</p>
      </header>

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

      <TrackJourneyCta />
    </main>
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

function TrackJourneyCta() {
  return (
    <Link
      href="/journeys"
      className="mt-4 flex items-center gap-3 rounded-xl border-2 border-dashed border-zinc-300 p-4 transition-colors hover:border-[var(--color-ph-red)] hover:bg-red-50/40 dark:border-zinc-700 dark:hover:bg-red-500/10"
    >
      <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-[var(--color-ph-red)] text-white">
        <Plane className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Track a journey</p>
        <p className="mt-0.5 text-xs text-zinc-500">
          Turn your points into a trip — set a target and watch it grow.
        </p>
      </div>
      <ArrowRight className="h-4 w-4 flex-none text-zinc-400" aria-hidden />
    </Link>
  );
}
