'use client';

// /alerts — Alert Centre (HANDOFF § 6) — Phase 4f.
//
// Two groups by intent, not by time:
//   NEEDS YOU — deadlines that will cost money if ignored
//   GOOD NEWS — wins the app noticed, nothing to do
//
// Cards carry a 3px left accent rail (amber for deadlines, pine for
// wins, warm-fill for read/archived). Deadline cards get an action
// button (red for the primary fix, warm-fill for secondary). Win
// cards get no button — nothing to do is the point (Behaviour
// rule adjacent: pace, not reference data).
//
// Read items drop to 0.66 opacity with a neutral rail so the eye
// doesn't keep re-scanning what you've already dismissed.

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useAlertsStore, type AlertKind, type FiredAlert } from '@/store/alerts';

// Compact age label — "3h" / "2d" / "3w" — used on Win cards. Kept
// inline because it's a one-liner and specific to this screen; the
// rest of the app uses formatDate + formatRelativeDays from
// @/lib/format.
function formatAge(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const seconds = Math.max(1, Math.round((Date.now() - then) / 1_000));
  if (seconds < 3_600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86_400) return `${Math.round(seconds / 3_600)}h`;
  if (seconds < 604_800) return `${Math.round(seconds / 86_400)}d`;
  return `${Math.round(seconds / 604_800)}w`;
}

type ChipFilter = 'all' | 'deadlines' | 'wins';

const DEADLINE_KINDS: ReadonlySet<AlertKind> = new Set([
  'min-spend-deadline',
  'annual-fee-renewal',
  'benefit-expiring',
]);

const WIN_KINDS: ReadonlySet<AlertKind> = new Set(['three-month-to-bonus']);

function destinationFor(alert: FiredAlert): string {
  switch (alert.kind) {
    case 'min-spend-deadline':
      return `/spend?cardId=${encodeURIComponent(alert.cardId)}`;
    case 'benefit-expiring':
      return `/benefits?cardId=${encodeURIComponent(alert.cardId)}`;
    case 'annual-fee-renewal':
      return `/optimisation?cardId=${encodeURIComponent(alert.cardId)}`;
    case 'three-month-to-bonus':
      return `/optimisation?tab=next`;
  }
}

const ACTION_LABEL: Record<AlertKind, string> = {
  'min-spend-deadline': 'Log a spend',
  'benefit-expiring': 'Mark used',
  'annual-fee-renewal': 'Decide',
  'three-month-to-bonus': 'See the play',
};

export default function AlertsInboxPage() {
  const feed = useAlertsStore((s) => s.feed);
  const markRead = useAlertsStore((s) => s.markRead);
  const markAllRead = useAlertsStore((s) => s.markAllRead);
  const [chip, setChip] = useState<ChipFilter>('all');

  const grouped = useMemo(() => {
    const sorted = [...feed].sort((a, b) => b.firedAt.localeCompare(a.firedAt));
    const deadlines = sorted.filter((a) => DEADLINE_KINDS.has(a.kind));
    const wins = sorted.filter((a) => WIN_KINDS.has(a.kind));
    return { deadlines, wins };
  }, [feed]);

  const visibleDeadlines = chip === 'wins' ? [] : grouped.deadlines;
  const visibleWins = chip === 'deadlines' ? [] : grouped.wins;

  return (
    <main className="min-h-dvh bg-ph-paper text-ph-text">
      <div className="px-6 pt-6 pb-32">
        <header className="flex items-center justify-between">
          <h1 className="font-serif text-[28px] leading-none text-ph-ink">Alerts</h1>
          <button
            type="button"
            onClick={markAllRead}
            className="text-[13px] font-medium text-ph-brick transition-colors hover:text-ph-ink"
          >
            Mark all read
          </button>
        </header>

        <div className="mt-4 flex items-center gap-2">
          <FilterChip
            active={chip === 'all'}
            onClick={() => setChip('all')}
            label="All"
            count={grouped.deadlines.length + grouped.wins.length}
          />
          <FilterChip
            active={chip === 'deadlines'}
            onClick={() => setChip('deadlines')}
            label="Deadlines"
            count={grouped.deadlines.length}
          />
          <FilterChip
            active={chip === 'wins'}
            onClick={() => setChip('wins')}
            label="Wins"
            count={grouped.wins.length}
          />
        </div>

        {visibleDeadlines.length > 0 ? (
          <section aria-labelledby="needs-you-heading" className="mt-6">
            <h2
              id="needs-you-heading"
              className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ph-text-meta"
            >
              Needs you
            </h2>
            <ul className="space-y-2">
              {visibleDeadlines.map((a) => (
                <li key={a.id}>
                  <DeadlineCard alert={a} onOpen={() => markRead(a.id)} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {visibleWins.length > 0 ? (
          <section aria-labelledby="good-news-heading" className="mt-6">
            <h2
              id="good-news-heading"
              className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ph-text-meta"
            >
              Good news
            </h2>
            <ul className="space-y-2">
              {visibleWins.map((a) => (
                <li key={a.id}>
                  <WinCard alert={a} onOpen={() => markRead(a.id)} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {visibleDeadlines.length === 0 && visibleWins.length === 0 ? (
          <p className="mt-8 text-center text-[13px] text-ph-text-muted">
            Nothing here right now. Perry will surface anything worth acting on.
          </p>
        ) : null}
      </div>
    </main>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={
        active
          ? 'inline-flex flex-none items-center gap-1.5 rounded-full bg-ph-ink px-3 py-1.5 text-xs font-medium text-ph-on-brick'
          : 'inline-flex flex-none items-center gap-1.5 rounded-full bg-ph-fill px-3 py-1.5 text-xs font-medium text-ph-text-muted hover:text-ph-text'
      }
    >
      <span>{label}</span>
      <span
        className={
          active ? 'text-ph-on-brick-secondary tabular-nums' : 'text-ph-text-meta tabular-nums'
        }
      >
        {count}
      </span>
    </button>
  );
}

// ── card variants ────────────────────────────────────────────────────

function DeadlineCard({ alert, onOpen }: { alert: FiredAlert; onOpen: () => void }) {
  const days = 19; // v1 mock; wires to a real days-remaining derivation in Phase 5
  const isRead = alert.read;
  return (
    <div
      className={
        isRead
          ? 'flex items-stretch overflow-hidden rounded-ph-card border border-ph-border bg-ph-card opacity-[0.66]'
          : 'flex items-stretch overflow-hidden rounded-ph-card border border-ph-border bg-ph-card'
      }
    >
      <span
        aria-hidden
        className="w-[3px] flex-none"
        style={{
          backgroundColor: isRead ? '#DCD2C1' : 'var(--color-ph-amber-lacquer)',
        }}
      />
      <div className="min-w-0 flex-1 p-[15px]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-serif text-[17px] leading-tight text-ph-ink">{alert.title}</p>
            <p className="mt-1 text-[13px] leading-snug text-ph-text-muted">{alert.subtitle}</p>
          </div>
          <p className="flex-none font-mono text-[10px] uppercase tracking-[0.14em] text-ph-amber-figure tabular-nums">
            {days}d
          </p>
        </div>
        <Link
          href={destinationFor(alert)}
          onClick={onOpen}
          className="mt-3 inline-flex items-center rounded-full bg-ph-red px-4 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90"
        >
          {ACTION_LABEL[alert.kind]}
        </Link>
      </div>
    </div>
  );
}

function WinCard({ alert, onOpen }: { alert: FiredAlert; onOpen: () => void }) {
  const isRead = alert.read;
  const ageLabel = formatAge(alert.firedAt);
  return (
    <Link
      href={destinationFor(alert)}
      onClick={onOpen}
      className={
        isRead
          ? 'flex items-stretch overflow-hidden rounded-ph-card border border-ph-border bg-ph-card opacity-[0.66]'
          : 'flex items-stretch overflow-hidden rounded-ph-card border border-ph-border bg-ph-card'
      }
    >
      <span
        aria-hidden
        className="w-[3px] flex-none"
        style={{ backgroundColor: isRead ? '#DCD2C1' : 'var(--color-ph-pine)' }}
      />
      <div className="min-w-0 flex-1 p-[15px]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-serif text-[17px] leading-tight text-ph-ink">{alert.title}</p>
            <p className="mt-1 text-[13px] leading-snug text-ph-text-muted">{alert.subtitle}</p>
          </div>
          <p className="flex-none font-mono text-[10px] uppercase tracking-[0.14em] text-ph-text-meta tabular-nums">
            {ageLabel}
          </p>
        </div>
      </div>
    </Link>
  );
}
