'use client';

// /journeys — Journeys tab shell with two sub-tabs (Phase 4d + 4e,
// Decision #33, HANDOFF § Second level).
//
//   ?tab=destinations (default) → DestinationsView  — brick hero + tiles
//   ?tab=balances               → BalancesView      — brick hero + rows
//
// Replaces the Phase 3 stub that just mounted the pre-Lacquer
// JourneysView from /components/home/journeys-view.tsx. The stub is
// deleted in this commit; the wizard at /journeys/track still uses
// this page as its back-navigation target.

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SegmentedControl } from '@/components/lacquer';
import { DestinationsView } from '@/components/journeys/destinations-view';
import { BalancesView } from '@/components/journeys/balances-view';

type JourneysTab = 'destinations' | 'balances';

const TAB_ITEMS: { id: JourneysTab; label: string }[] = [
  { id: 'destinations', label: 'Destinations' },
  { id: 'balances', label: 'Balances' },
];

export default function JourneysPage() {
  return (
    <Suspense fallback={<main className="min-h-dvh bg-ph-paper" aria-busy="true" />}>
      <JourneysShell />
    </Suspense>
  );
}

function JourneysShell() {
  const params = useSearchParams();
  const router = useRouter();
  const tab: JourneysTab = params.get('tab') === 'balances' ? 'balances' : 'destinations';

  function switchTo(next: JourneysTab) {
    router.replace(next === 'destinations' ? '/journeys' : `/journeys?tab=${next}`, {
      scroll: false,
    });
  }

  return (
    <main className="min-h-dvh bg-ph-paper text-ph-text">
      <div className="px-6 pt-6 pb-32">
        <header>
          <h1 className="font-serif text-[28px] leading-none text-ph-ink">Journeys</h1>
        </header>

        <div className="mt-4">
          <SegmentedControl<JourneysTab>
            items={TAB_ITEMS}
            activeId={tab}
            onChange={switchTo}
            ariaLabel="Journeys view"
          />
        </div>

        {tab === 'destinations' ? <DestinationsView /> : <BalancesView />}
      </div>
    </main>
  );
}
