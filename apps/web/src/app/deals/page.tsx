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

import { Gift, RefreshCw } from 'lucide-react';
import dealsRaw from '@/data/deals.json';
import { DealMatcher } from '@/components/deals/deal-matcher';
import type { Deal } from '@/data/deals-types';

const DEALS = dealsRaw as Deal[];

// Last-refresh marker for the deals catalogue. Bump this each time the
// bundled deals.json gets a refresh until we wire up a daily Vercel Cron
// job that fetches the upstream list automatically (see docs/TODO.md
// "Daily deals refresh"). The Cron job will write this constant via a
// build step at that point; for now it's manual.
const DEALS_LAST_UPDATED = '12 June 2026';

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
        <p className="mt-1.5 inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-ink-mute">
          <RefreshCw className="h-3 w-3" aria-hidden />
          Updated {DEALS_LAST_UPDATED}
        </p>
      </header>

      <DealMatcher deals={DEALS} />
    </main>
  );
}
