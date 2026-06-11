'use client';

/**
 * /deals — 3-step Card Match wizard. Replaces the previous filter-chip
 * UI with the multi-step picker pattern from points-deals' deal-matcher.
 * Visual reference: https://www.pointhacks.com.au/tools-calculators/card-match/
 *
 * The wizard's View Transitions API FLIP morphs are powered by the
 * ::view-transition-* rules in apps/web/src/app/globals.css.
 */

import dealsRaw from '@/data/deals.json';
import { DealMatcher } from '@/components/deals/deal-matcher';
import type { Deal } from '@/data/deals-types';

const DEALS = dealsRaw as Deal[];

export default function DealsPage() {
  return (
    <main className="px-4 pt-4 pb-24">
      <DealMatcher deals={DEALS} />
    </main>
  );
}
