'use client';

/**
 * /deals — Tab 2. Standard page header (Gift icon + "Deals" + subtitle)
 * sits above the 3-step Card Match wizard. The wizard handles the
 * filter UX with View Transitions FLIP morph on the chips; everything
 * else (header style, deal-card style) follows the rest of the app.
 *
 * Wizard ref: pointhacks.com.au/tools-calculators/card-match
 * Animation rules: ::view-transition-* in apps/web/src/app/globals.css.
 */

import { Gift } from 'lucide-react';
import dealsRaw from '@/data/deals.json';
import { DealMatcher } from '@/components/deals/deal-matcher';
import type { Deal } from '@/data/deals-types';

const DEALS = dealsRaw as Deal[];

export default function DealsPage() {
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
      </header>

      <DealMatcher deals={DEALS} />
    </main>
  );
}
