'use client';

// Visual countdown for sign-up bonus min-spend. Shows:
//   - Big days-remaining number
//   - Progress bar (days elapsed / total window)
//   - Traffic-light tint: green >30d, amber 7-30d, red <7d (overdue → grey)
//
// Pairs with the sign-up bonus block on Tab 3 held-card rows. Pure
// presentational; takes ISO strings, computes everything inline.

import clsx from 'clsx';
import { Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/format';

interface Props {
  /** When the sign-up bonus window started — usually approval date. */
  startIso: string;
  /** Deadline by which min-spend must be hit. */
  deadlineIso: string;
  /** Optional spent/target for additional context line. */
  spentAud?: number | null;
  targetAud?: number | null;
}

export function MinSpendCountdown({ startIso, deadlineIso, spentAud, targetAud }: Props) {
  const start = new Date(startIso + 'T00:00:00');
  const deadline = new Date(deadlineIso + 'T23:59:59');
  const now = new Date();

  const totalMs = Math.max(1, deadline.getTime() - start.getTime());
  const elapsedMs = Math.max(0, Math.min(totalMs, now.getTime() - start.getTime()));
  const elapsedPct = Math.round((elapsedMs / totalMs) * 100);

  const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const overdue = daysRemaining < 0;

  const spendMet = spentAud != null && targetAud != null && targetAud > 0 && spentAud >= targetAud;

  // Tint
  const tint = spendMet
    ? 'emerald'
    : overdue
      ? 'zinc'
      : daysRemaining < 7
        ? 'rose'
        : daysRemaining < 30
          ? 'amber'
          : 'emerald';

  const tintClasses: Record<typeof tint, { ring: string; bar: string; text: string; bg: string }> =
    {
      emerald: {
        ring: 'ring-emerald-200 dark:ring-emerald-900',
        bar: 'bg-emerald-500',
        text: 'text-emerald-700 dark:text-emerald-300',
        bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      },
      amber: {
        ring: 'ring-amber-200 dark:ring-amber-900',
        bar: 'bg-amber-500',
        text: 'text-amber-700 dark:text-amber-300',
        bg: 'bg-amber-50 dark:bg-amber-950/40',
      },
      rose: {
        ring: 'ring-rose-200 dark:ring-rose-900',
        bar: 'bg-rose-500',
        text: 'text-rose-700 dark:text-rose-300',
        bg: 'bg-rose-50 dark:bg-rose-950/40',
      },
      zinc: {
        ring: 'ring-zinc-300 dark:ring-zinc-700',
        bar: 'bg-zinc-400',
        text: 'text-zinc-700 dark:text-zinc-300',
        bg: 'bg-zinc-100 dark:bg-zinc-800',
      },
    };
  const t = tintClasses[tint];

  return (
    <div className={clsx('rounded-xl p-3 ring-1', t.ring, t.bg)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-baseline gap-1.5">
          {spendMet ? (
            <CheckCircle2 className={clsx('h-4 w-4', t.text)} aria-hidden />
          ) : overdue ? (
            <AlertTriangle className={clsx('h-4 w-4', t.text)} aria-hidden />
          ) : (
            <Clock className={clsx('h-4 w-4', t.text)} aria-hidden />
          )}
          {spendMet ? (
            <span className={clsx('text-sm font-semibold', t.text)}>Min-spend met</span>
          ) : overdue ? (
            <span className={clsx('text-sm font-semibold', t.text)}>
              {Math.abs(daysRemaining)}d overdue
            </span>
          ) : (
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className={clsx('text-2xl font-bold tabular-nums leading-none', t.text)}>
                  {daysRemaining}
                </span>
                <span className={clsx('text-xs font-medium', t.text)}>
                  day{daysRemaining === 1 ? '' : 's'} left
                </span>
              </div>
              {targetAud != null && (
                <p className="mt-0.5 text-[10px] text-zinc-500">
                  to spend{' '}
                  <span className={clsx('font-semibold tabular-nums', t.text)}>
                    {formatCurrency(targetAud)}
                  </span>{' '}
                  for bonus
                </p>
              )}
            </div>
          )}
        </div>
        <span className="text-[10px] text-zinc-500">by {formatDate(deadlineIso)}</span>
      </div>

      {/* Progress bar — time elapsed vs total window */}
      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/60 dark:bg-zinc-900/60"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={elapsedPct}
        aria-label="Time elapsed in min-spend window"
      >
        <div className={clsx('h-full transition-all', t.bar)} style={{ width: `${elapsedPct}%` }} />
      </div>
    </div>
  );
}
