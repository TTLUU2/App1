'use client';

// /today — the daily glance (HANDOFF § 1, first Phase 4 screen).
//
// Layout, top to bottom, per spec:
//   1. Mono date eyebrow + serif greeting header
//   2. Score card — brick HeroCard, 84px conic-gradient ring, mono
//      "Optimisation score" eyebrow + one-line description
//   3. Stat row — three columns split by 34px hairlines, serif figure
//      over mono label (ink / pine / amber-figure tones)
//   4. Mono "Do today" section label + one action card per real thing
//      to do (deadline chip + progress on min-spend; "Mark used" on
//      benefit)
//   5. Copilot bar pinned bottom — Perry avatar + Ask prompt + mic
//
// v1 numbers (score, delta, spend-to-go, daily rate) are mocked
// constants — they wire to real spend + portfolio data once the rest
// of the Lacquer screens land in Phase 4 and Phase 5's log-a-spend
// starts pushing real deltas. The alerts feed is real — deadlines /
// benefits pull from the shared alerts store.

import { Suspense, useMemo } from 'react';
import Link from 'next/link';
import { Check, Clock, Mic } from 'lucide-react';
import { formatCurrency, formatPoints } from '@/lib/format';
import { useAlertsStore, type FiredAlert } from '@/store/alerts';
import { selectTotalPoints, useBalancesStore } from '@/store/balances';
import { HeroCard, LacquerChip, PerryAvatar } from '@/components/lacquer';

const USER_NAME = 'Tin';
const SCORE = 78;
const SCORE_DELTA = 6;
const SPEND_TO_GO = 1_240;
const MONTH_POINTS = 42_000;
// Days-remaining and progress values used by the first "Do today"
// card. Wired to real spend deltas when the log-a-spend consequence
// pipeline lands in Phase 5.
const MOCK_DEADLINE_DAYS = 19;
const MOCK_MIN_SPEND_PROGRESS = 0.35;

function greetingForHour(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function TodayPage() {
  return (
    <Suspense fallback={<main className="min-h-dvh bg-ph-paper" aria-busy="true" />}>
      <TodayShell />
    </Suspense>
  );
}

function TodayShell() {
  const feed = useAlertsStore((s) => s.feed);
  // Kept subscribed so the store hydrates on this page too — Phase 5
  // wires this into a "pts pending" cell in the stat row.
  void useBalancesStore(selectTotalPoints);

  // Deadline count — anything the Alert Centre would file under
  // "needs you". Matches the number the Alert Centre chip will show
  // once its Lacquer redesign lands in Phase 4.
  const deadlineCount = useMemo(
    () =>
      feed.filter((a) => a.kind === 'annual-fee-renewal' || a.kind === 'min-spend-deadline').length,
    [feed],
  );

  // Do-today picks: prefer a deadline (min-spend) plus a benefit
  // action (mark used). Falls back to whatever's in the feed if we
  // don't have one of each.
  const doToday = useMemo(() => {
    const deadline = feed.find((a) => a.kind === 'min-spend-deadline') ?? null;
    const benefit = feed.find((a) => a.kind === 'benefit-expiring') ?? null;
    return { deadline, benefit };
  }, [feed]);

  return (
    <main className="flex min-h-dvh flex-col bg-ph-paper text-ph-text">
      <div className="px-6 pt-6 pb-4">
        <TodayHeader />

        <div className="mt-5">
          <ScoreHero score={SCORE} delta={SCORE_DELTA} />
        </div>

        <div className="mt-3">
          <StatRow spendToGo={SPEND_TO_GO} monthPoints={MONTH_POINTS} deadlines={deadlineCount} />
        </div>

        <section aria-labelledby="do-today-heading" className="mt-6">
          <h2
            id="do-today-heading"
            className="mb-2 font-mono text-[10px] font-normal uppercase tracking-[0.16em] text-ph-text-meta"
          >
            Do today
          </h2>
          <ul className="space-y-2">
            {doToday.deadline ? (
              <li>
                <DeadlineActionCard
                  alert={doToday.deadline}
                  daysRemaining={MOCK_DEADLINE_DAYS}
                  progress={MOCK_MIN_SPEND_PROGRESS}
                />
              </li>
            ) : null}
            {doToday.benefit ? (
              <li>
                <BenefitActionCard alert={doToday.benefit} />
              </li>
            ) : null}
            {!doToday.deadline && !doToday.benefit ? <EmptyDoToday /> : null}
          </ul>
        </section>
      </div>

      {/* Copilot bar — pinned bottom of the flow (mt-auto), 12px
          breathing room from the tab bar's top edge. HANDOFF § 10. */}
      <div className="mt-auto px-6 pb-24">
        <CopilotBar />
      </div>
    </main>
  );
}

function TodayHeader() {
  const now = new Date();
  const dateLabel = new Intl.DateTimeFormat('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
    .format(now)
    .toUpperCase();
  const greeting = greetingForHour(now.getHours());
  return (
    <header>
      <p className="font-mono text-[9.5px] font-normal uppercase tracking-[0.16em] text-ph-text-meta">
        {dateLabel}
      </p>
      <h1 className="mt-1 font-serif text-[29px] leading-tight text-ph-ink">
        {greeting}, {USER_NAME}
      </h1>
    </header>
  );
}

function ScoreHero({ score, delta }: { score: number; delta: number }) {
  return (
    <HeroCard aria-labelledby="score-heading" style={{ padding: 20, gap: 18 }}>
      <ScoreRing score={score} />
      <div className="min-w-0 flex-1">
        <p
          id="score-heading"
          className="font-mono text-[10px] font-normal uppercase tracking-[0.14em] text-ph-on-brick-meta"
        >
          Optimisation score
        </p>
        <p className="mt-1 text-[13px] leading-snug text-ph-on-brick-secondary">
          Up {delta} this week. One move left to lift it again.
        </p>
      </div>
    </HeroCard>
  );
}

function ScoreRing({ score }: { score: number }) {
  // conic-gradient(amber 0 → angle, dim → 360). Angle is percentage of
  // 360deg. Dim end matches the spec's rgba(246,241,233,0.2) — the
  // paper token at 20% opacity so the unfilled arc reads as "space
  // that could still be earned" against the brick surface.
  const angle = Math.max(0, Math.min(100, score)) * 3.6;
  return (
    <div
      className="relative grid h-[84px] w-[84px] flex-none place-items-center rounded-full"
      style={{
        background: `conic-gradient(var(--color-ph-amber-lacquer) 0deg ${angle}deg, rgb(246 241 233 / 0.2) ${angle}deg 360deg)`,
      }}
      aria-hidden
    >
      <div className="grid h-[68px] w-[68px] place-items-center rounded-full bg-ph-brick">
        <span className="font-serif text-[32px] leading-none text-ph-on-brick">{score}</span>
      </div>
      <span className="sr-only">Optimisation score: {score} out of 100.</span>
    </div>
  );
}

function StatRow({
  spendToGo,
  monthPoints,
  deadlines,
}: {
  spendToGo: number;
  monthPoints: number;
  deadlines: number;
}) {
  return (
    <ul
      role="list"
      className="flex items-stretch overflow-hidden rounded-ph-card border border-ph-border bg-ph-card"
    >
      <StatCell label="Spend to go" value={formatCurrency(spendToGo)} tone="ink" />
      <StatDivider />
      <StatCell label="This month" value={`+${formatPoints(monthPoints)}`} tone="pine" />
      <StatDivider />
      <StatCell label="Deadlines" value={String(deadlines)} tone="amber" />
    </ul>
  );
}

function StatCell({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'ink' | 'pine' | 'amber';
}) {
  const toneClass =
    tone === 'pine' ? 'text-ph-pine' : tone === 'amber' ? 'text-ph-amber-figure' : 'text-ph-ink';
  return (
    <li className="flex-1 px-3 py-3">
      <p className="font-serif text-[26px] leading-none tabular-nums">
        <span className={toneClass}>{value}</span>
      </p>
      <p className="mt-1 font-mono text-[9px] font-normal uppercase tracking-[0.14em] text-ph-text-meta">
        {label}
      </p>
    </li>
  );
}

function StatDivider() {
  // 1px × 34px hairline, self-centred vertically, colour from the
  // spec's #E0D3CE (brick-adjacent border) — same eye as the card
  // border but slightly softer to sit between siblings.
  return (
    <li aria-hidden className="self-center">
      <div className="h-[34px] w-px bg-[#E0D3CE]" />
    </li>
  );
}

function DeadlineActionCard({
  alert,
  daysRemaining,
  progress,
}: {
  alert: FiredAlert;
  daysRemaining: number;
  progress: number;
}) {
  const clamped = Math.max(0, Math.min(1, progress));
  return (
    <Link
      href={`/spend?cardId=${encodeURIComponent(alert.cardId)}`}
      className="block rounded-ph-card border border-ph-border bg-ph-card p-[15px] transition-colors hover:bg-ph-fill-warm"
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-serif text-[19px] leading-tight text-ph-ink">{alert.title}</p>
          <p className="mt-1 text-[13px] leading-snug text-ph-text-muted">{alert.subtitle}</p>
        </div>
        <LacquerChip variant="amber" Icon={Clock} size="sm">
          {daysRemaining}d
        </LacquerChip>
      </div>
      <div className="mt-3 h-[7px] w-full overflow-hidden rounded-full bg-ph-fill" aria-hidden>
        <div
          className="h-full rounded-full bg-ph-brick transition-[width] duration-500 ease-out"
          style={{ width: `${clamped * 100}%` }}
        />
      </div>
    </Link>
  );
}

function BenefitActionCard({ alert }: { alert: FiredAlert }) {
  return (
    <div className="flex items-center gap-3 rounded-ph-card border border-ph-border bg-ph-card p-[15px]">
      <div className="min-w-0 flex-1">
        <p className="font-serif text-[19px] leading-tight text-ph-ink">{alert.title}</p>
        <p className="mt-1 text-[13px] leading-snug text-ph-text-muted">{alert.subtitle}</p>
      </div>
      <button
        type="button"
        // Optimistic pine ✓ swap belongs to Phase 5's Log-a-spend
        // sheet + Mark-used flow; wiring the store mutation here is
        // out of scope for the Today redesign.
        className="inline-flex items-center gap-1 rounded-full bg-ph-pine-chip px-3 py-1 text-xs font-medium text-ph-pine-text"
      >
        <Check className="h-3.5 w-3.5" aria-hidden />
        Mark used
      </button>
    </div>
  );
}

function EmptyDoToday() {
  // HANDOFF § Behaviour rules #2: "never claim to be empty" — but
  // when the feed genuinely has neither a deadline nor a benefit
  // action, the honest read is "nothing today." That's different
  // from "nothing urgent today" while a deadline is one row above.
  // The current empty state is legitimate.
  return (
    <li className="rounded-ph-card border border-ph-border bg-ph-card p-[15px] text-[13px] text-ph-text-muted">
      Nothing on the board today. Come back after your next swipe.
    </li>
  );
}

function CopilotBar() {
  return (
    <div className="flex items-center gap-3 rounded-full border border-ph-border-strong bg-ph-card px-4 py-2.5">
      <PerryAvatar size={26} />
      <button
        type="button"
        aria-label="Ask Perry"
        className="flex-1 text-left text-[13px] text-ph-text-muted"
      >
        Ask Perry anything…
      </button>
      <button
        type="button"
        aria-label="Speak to Perry"
        className="grid h-8 w-8 place-items-center rounded-full bg-ph-brick text-ph-on-brick"
      >
        <Mic className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
