'use client';

import Link from 'next/link';
import type { Recommendation } from '@ph/shared';
import { ChevronRight } from 'lucide-react';
import { CardArt } from '@/components/card-art';
import { StatusChip } from '@/components/status-chip';
import { formatPoints, formatCurrency, formatRelativeDays } from '@/lib/format';

/**
 * A single recommendation row used by the Upcoming / Eligible / Grey area /
 * Not eligible lists. Links to the per-card detail screen on tap.
 */
export function CardRow({ rec }: { rec: Recommendation }) {
  const { card, eligibility } = rec;
  const greyed = eligibility.status === 'not_eligible' || eligibility.status === 'grey_area';

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
      </div>
    </Link>
  );
}
