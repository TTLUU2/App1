'use client';

// One-line summary that bridges Tab 3 (your card history) and Tab 4
// (your next-card options). Surfaces the relationship the engine already
// computes per-card but that's otherwise scattered across chips:
//
//   "2 active · 1 cancelled · 8 eligible now · next unlock 28 Aug"
//
// Tappable — navigates straight to /eligibility-matrix for the full
// per-issuer breakdown with rules, held cards, and unlock dates.
// (Previously opened an intermediate modal; dropped because the matrix
// page is a superset and the modal was just an extra tap.)

import Link from 'next/link';
import { CreditCard, ChevronRight } from 'lucide-react';
import type { Recommendation, UserCardWithDetails } from '@ph/shared';
import { formatDate } from '@/lib/format';

interface Props {
  allCards: UserCardWithDetails[];
  recommendations: Recommendation[];
}

export function EligibilityBanner({ allCards, recommendations }: Props) {
  const active = allCards.filter((c) => !c.cancellationDate).length;
  const cancelled = allCards.filter((c) => !!c.cancellationDate).length;
  const eligibleNow = recommendations.filter((r) => r.eligibility.status === 'eligible').length;

  // Earliest waiting-card unlock — null when nothing is waiting (e.g.
  // brand-new user with no history). Sort by eligibleDate ascending so
  // the soonest one wins.
  const waiting = recommendations
    .filter(
      (r): r is Recommendation & { eligibility: { eligibleDate: string } } =>
        r.eligibility.status === 'waiting' && !!r.eligibility.eligibleDate,
    )
    .sort((a, b) => a.eligibility.eligibleDate.localeCompare(b.eligibility.eligibleDate));
  const nextUnlock = waiting[0]?.eligibility.eligibleDate ?? null;

  // Build parts conditionally — keeps the banner clean for fresh users
  // (no cancelled, no waiting) without dangling separators.
  const parts: string[] = [];
  parts.push(`${active} active`);
  if (cancelled > 0) parts.push(`${cancelled} cancelled`);
  parts.push(`${eligibleNow} card${eligibleNow === 1 ? '' : 's'} eligible for bonuses`);
  if (nextUnlock) parts.push(`next unlock ${formatDate(nextUnlock)}`);

  return (
    <Link
      href="/eligibility-overview"
      aria-label="Your card position — view eligibility overview"
      className="flex w-full items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-left transition-colors hover:border-[var(--color-ph-red)] hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ph-red)] dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800/60"
    >
      <CreditCard className="h-4 w-4 flex-none text-[var(--color-ph-red)]" aria-hidden />
      <p className="min-w-0 flex-1 text-xs text-zinc-700 dark:text-zinc-300">{parts.join(' · ')}</p>
      <ChevronRight className="h-3.5 w-3.5 flex-none text-zinc-400" aria-hidden />
    </Link>
  );
}
