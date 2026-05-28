'use client';

import Link from 'next/link';
import type { Recommendation } from '@ph/shared';
import { Sparkles, ArrowRight } from 'lucide-react';
import { CardArt } from '@/components/card-art';
import { StatusChip } from '@/components/status-chip';
import { formatPoints, formatCurrency } from '@/lib/format';

/**
 * PRD §10.2.1: the single highest-ranked eligible card, with card art, name,
 * bonus, annual fee, one-line reason, and primary/secondary CTAs.
 */
export function BestMoveHero({ rec }: { rec: Recommendation }) {
  const { card } = rec;
  return (
    <section
      aria-labelledby="best-move-heading"
      className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
    >
      <h2
        id="best-move-heading"
        className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-500"
      >
        <Sparkles className="h-3.5 w-3.5 text-[var(--color-ph-red)]" aria-hidden />
        Your best move
      </h2>

      <div className="mt-3 flex items-start gap-3">
        <CardArt card={card} size="md" />
        <div className="min-w-0 flex-1">
          <StatusChip status={rec.eligibility.status} size="sm" />
          <h3 className="mt-1 truncate text-base font-semibold leading-tight">{card.name}</h3>
          <div className="mt-0.5 flex items-baseline gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            {card.bonusPoints != null && (
              <span className="text-lg font-semibold text-[var(--color-ph-red)]">
                {formatPoints(card.bonusPoints)} pts
              </span>
            )}
            <span className="text-xs">{formatCurrency(card.annualFee)} / yr</span>
          </div>
        </div>
      </div>

      <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">{rec.reason}</p>

      <div className="mt-4 flex flex-col gap-2">
        <Link
          href={`/cards/${card.id}`}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-ph-red)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-ph-red-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ph-red)]"
        >
          View details
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
