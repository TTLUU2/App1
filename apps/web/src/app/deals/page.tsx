'use client';

/**
 * /deals — Tab 2. Standard page header (Gift icon + "Deals" + subtitle)
 * sits above the 3-step Card Match wizard. The wizard handles the
 * filter UX with View Transitions FLIP morph on the chips; everything
 * else (header style, deal-card style) follows the rest of the app.
 *
 * Wizard ref: pointhacks.com.au/tools-calculators/card-match
 * Animation rules: ::view-transition-* in apps/web/src/app/globals.css.
 *
 * Top Match personalisation: held cards from the user-cards store get
 * mapped to a set of loyalty programs the user actually earns into. The
 * wizard surfaces the best-matching deal for those programs as a "Top
 * Match" card above the regular list. Fallback when no cards are held:
 * generic top-by-weight (no personalisation), with a hint to add cards.
 */

import { useMemo } from 'react';
import { Gift, RefreshCw } from 'lucide-react';
import dealsRaw from '@/data/deals.json';
import { DealMatcher } from '@/components/deals/deal-matcher';
import { catalogue, useUserCardsStore } from '@/store/user-cards';
import type { Deal, LoyaltyProgram } from '@/data/deals-types';
import type { RewardsProgram } from '@ph/shared';

const DEALS = dealsRaw as Deal[];

// Card rewardsProgram → set of LoyaltyProgram values the deal data uses.
// 'flexible' = Amex Membership Rewards, transferable to a handful of
// frequent flyer + hotel partners — so we treat it as matching any of
// those. 'bank' (no points program) returns an empty set.
function programsFor(rp: RewardsProgram): LoyaltyProgram[] {
  switch (rp) {
    case 'qantas':
      return ['qantas'];
    case 'velocity':
      return ['velocity'];
    case 'flexible':
      return ['qantas', 'velocity', 'kris-flyer', 'asia-miles', 'marriott-bonvoy', 'hilton-honors'];
    case 'bank':
      return [];
  }
}

// Last-refresh marker for the deals catalogue. Bump this each time the
// bundled deals.json gets a refresh until we wire up a daily Vercel Cron
// job that fetches the upstream list automatically (see docs/TODO.md
// "Daily deals refresh"). The Cron job will write this constant via a
// build step at that point; for now it's manual.
const DEALS_LAST_UPDATED = '12 June 2026';

export default function DealsPage() {
  // Held-card-aware Top Match. Subscribes to the user-cards store so when
  // the user adds/cancels a card on Tab 3 the personalised set on Tab 2
  // updates without a refresh.
  const userCards = useUserCardsStore((s) => s.userCards);
  const userPrograms = useMemo(() => {
    const heldCards = userCards.filter((uc) => !uc.cancellationDate);
    const set = new Set<LoyaltyProgram>();
    for (const uc of heldCards) {
      const card = catalogue.allCards().find((c) => c.id === uc.cardId);
      if (!card) continue;
      for (const p of programsFor(card.rewardsProgram)) set.add(p);
    }
    return set;
  }, [userCards]);

  return (
    <main className="px-4 pt-4 pb-24">
      <header className="mb-4">
        <h1 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Gift className="h-5 w-5 text-[var(--color-ph-red)]" aria-hidden />
          Deals
        </h1>
        <p className="mt-1 text-xs text-ink-soft">
          Answer three quick questions and we&apos;ll match you to the best current deals. Tap a
          card for the source link, or ask Copilot how to maximise.
        </p>
        <p className="mt-1.5 inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-ink-mute">
          <RefreshCw className="h-3 w-3" aria-hidden />
          Updated {DEALS_LAST_UPDATED}
        </p>
      </header>

      <DealMatcher deals={DEALS} userPrograms={userPrograms} />
    </main>
  );
}
