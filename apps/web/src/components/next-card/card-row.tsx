'use client';

import Link from 'next/link';
import type { Recommendation } from '@ph/shared';
import { ChevronRight, Sparkles } from 'lucide-react';
import { CardArt } from '@/components/card-art';
import { StatusChip } from '@/components/status-chip';
import { formatPoints, formatCurrency, formatRelativeDays } from '@/lib/format';

/**
 * A single recommendation row used by the Upcoming / Eligible / Grey area /
 * Not eligible lists. Links to the per-card detail screen on tap.
 *
 * Optional `rank` (1-indexed) drives the "Top pick" prefix on the
 * "why this card" line — passed by the parent only for the eligible list
 * (rank doesn't carry meaning for waiting / grey / not-eligible).
 */
export function CardRow({ rec, rank }: { rec: Recommendation; rank?: number }) {
  const { card, eligibility } = rec;
  const greyed = eligibility.status === 'not_eligible' || eligibility.status === 'grey_area';
  const whyTags = buildWhyTags(rec, rank);

  return (
    <Link
      href={`/cards/${card.id}`}
      className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-3 transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ph-red)] dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800/60"
    >
      <CardArt card={card} size="sm" greyed={greyed} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate text-sm font-medium leading-tight">{card.name}</h3>
          <ChevronRight className="mt-0.5 h-4 w-4 flex-none text-zinc-400" aria-hidden />
        </div>
        <div className="mt-1 flex items-center gap-2">
          <StatusChip status={eligibility.status} size="sm" />
          {eligibility.status === 'waiting' && eligibility.daysRemaining != null && (
            <span className="text-xs text-zinc-500">
              in {formatRelativeDays(eligibility.daysRemaining)}
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
          {card.bonusPoints != null && (
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              {formatPoints(card.bonusPoints)} pts
            </span>
          )}
          {card.bonusPoints != null && <span> · </span>}
          <span>{formatCurrency(card.annualFee)} / yr</span>
          <span> · </span>
          <span>{card.issuer.shortName}</span>
        </p>
        {/* "Why this card" — surfaces the personalisation + ranking signal.
            Sparkles emerald to read as a positive cue. Only renders when at
            least one tag is meaningful so the row stays uncluttered for
            users with no preferences set.
            Uses `flex` (not inline-flex) + a wrapping span so the text
            can break onto a second line on narrow viewports instead of
            overflowing the row container. */}
        {whyTags.length > 0 && (
          <p className="mt-1 flex items-start gap-1 text-[11px] font-medium leading-snug text-emerald-700 dark:text-emerald-300">
            <Sparkles className="mt-0.5 h-3 w-3 flex-none" aria-hidden />
            <span className="min-w-0 break-words">{whyTags.join(' · ')}</span>
          </p>
        )}
      </div>
    </Link>
  );
}

const PROGRAM_LABEL: Record<string, string> = {
  qantas: 'Qantas',
  velocity: 'Velocity',
  flexible: 'Amex',
  bank: 'bank points',
};

// Compute up to 3 short reasons this card ranks here. Empty result = no
// line rendered. Tags are intentionally short so the line fits one row.
function buildWhyTags(rec: Recommendation, rank?: number): string[] {
  const tags: string[] = [];

  // Rank context — only useful for eligible cards (waiting / grey have
  // their own context via the status chip).
  if (rank === 1 && rec.eligibility.status === 'eligible') {
    tags.push('Top pick this month');
  } else if (rank && rank <= 3 && rec.eligibility.status === 'eligible') {
    tags.push(`Top ${rank} pick`);
  }

  // Preference signal — surfaces the +50 boost from the personalisation
  // engine so the user understands WHY this card is rated highly.
  if (rec.preferenceMatch?.programMatched) {
    const label = PROGRAM_LABEL[rec.card.rewardsProgram] ?? rec.card.rewardsProgram;
    tags.push(`matches your ${label} preference`);
  }

  // Soon-to-unlock signal — for waiting cards under a month away.
  if (
    rec.eligibility.status === 'waiting' &&
    rec.eligibility.daysRemaining != null &&
    rec.eligibility.daysRemaining > 0 &&
    rec.eligibility.daysRemaining < 30
  ) {
    tags.push('unlocks soon');
  }

  return tags;
}
