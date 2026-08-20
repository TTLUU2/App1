'use client';

// Score view — the "Today" content that used to live at
// /home?view=score and now anchors /today (Phase 3 nav shell cutover,
// Decision #33).
//
// Rendered as a body-only component: no greeting header, no <main>,
// no toggle — the page that mounts it owns those. Phase 4 will
// rebuild this against the Lacquer palette + HeroCard + Evidence
// Panel primitives; for now the pre-Lacquer visual is preserved so
// nothing regresses during the nav-shell shift.

import Link from 'next/link';
import { ArrowRight, BarChart3, TrendingUp } from 'lucide-react';
import { formatCurrency, formatPoints } from '@/lib/format';
import { useAlertsStore, type FiredAlert } from '@/store/alerts';
import { selectTotalPoints, useBalancesStore } from '@/store/balances';

// v1 mock numbers — wired to real spend / portfolio data when the
// screens settle. Kept here rather than in the page shell so the
// component is drop-in-swappable during the Phase 4 redesign.
const SCORE = 78;
const SCORE_DELTA = 6;
const SPEND_TO_GO = 1_240;
const MOMENTUM_POINTS = 42_000;
const MOMENTUM_LABEL = 'Best month yet — on pace for 2 bonuses';

function isToday(iso: string): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return iso.startsWith(today);
}

export function ScoreView() {
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
