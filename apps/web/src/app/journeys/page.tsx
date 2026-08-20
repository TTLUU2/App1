// /journeys — now a real page rather than a redirect (Phase 3 nav
// shell cutover, Decision #33). Anchors the fourth tab in the new
// Lacquer tab order (Matching · Deals · [+] · Optimise · Journeys).
//
// The old /journeys → /home?view=journeys redirect is retired here.
// The page renders the pre-Lacquer JourneysView content so the visual
// doesn't regress during the nav shift. Phase 4 will:
//   - Split into Destinations + Balances sub-tabs via SegmentedControl
//   - Rebuild the total-points panel as a HeroCard
//   - Absorb Balances-view content from the /balances redirect target
//
// The wizard at /journeys/track still uses this page as its
// back-navigation target — leaving the route in place preserves that.

import { Suspense } from 'react';
import { JourneysView } from '@/components/home/journeys-view';

export default function JourneysPage() {
  return (
    <main className="px-4 pt-4 pb-32">
      <header className="mb-4">
        <h1 className="text-xl font-semibold tracking-tight">Journeys</h1>
        <p className="mt-1 text-xs text-zinc-500">
          Where your points can go — and what it takes to get there.
        </p>
      </header>
      <Suspense fallback={<div aria-busy="true" />}>
        <JourneysView />
      </Suspense>
    </main>
  );
}
